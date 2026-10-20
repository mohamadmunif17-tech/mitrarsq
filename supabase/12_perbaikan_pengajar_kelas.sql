-- SAQUIN: pergantian penanggung jawab kelas oleh admin, 20 Oktober 2026.
-- Prasyarat: SQL 10 sudah berhasil. Optimasi/RLS SQL 11 tetap dipertahankan.
-- Jalankan seluruh isi sebagai postgres di Supabase SQL Editor.
-- Tidak mengubah presensi, nilai, penguji, jurnal, atau penempatan siswa lama.
BEGIN;
SELECT pg_catalog.pg_advisory_xact_lock(20261015,10);

DO $preflight$
BEGIN
  IF to_regprocedure('public.academic_update_class(uuid,text,text,text,text,uuid)') IS NULL
    OR to_regclass('public.academic_years') IS NULL THEN
    RAISE EXCEPTION 'Jalankan SQL 10_tahun_pelajaran.sql sampai sukses sebelum SQL 12.';
  END IF;
END;
$preflight$;

CREATE TABLE IF NOT EXISTS public.academic_class_teacher_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id),
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id),
  previous_teacher_id uuid,
  new_teacher_id uuid,
  previous_teacher_name text,
  new_teacher_name text,
  changed_by uuid NOT NULL REFERENCES auth.users(id),
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS academic_class_teacher_changes_class_time_idx
  ON public.academic_class_teacher_changes(class_id,changed_at DESC);
ALTER TABLE public.academic_class_teacher_changes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.academic_class_teacher_changes FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.academic_class_teacher_changes TO authenticated;
DROP POLICY IF EXISTS academic_class_teacher_changes_read ON public.academic_class_teacher_changes;
CREATE POLICY academic_class_teacher_changes_read ON public.academic_class_teacher_changes
  FOR SELECT TO authenticated USING((SELECT public.academic_is_admin()));

CREATE OR REPLACE FUNCTION public.academic_update_class(
  p_class_id uuid,p_nama text,p_tingkat text DEFAULT '',p_jurusan text DEFAULT '',
  p_rombel text DEFAULT '',p_teacher_id uuid DEFAULT NULL
)
RETURNS public.classes LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result public.classes; previous public.classes;
BEGIN
  PERFORM public.academic_require_admin();
  SELECT * INTO previous FROM public.classes WHERE id=p_class_id FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.academic_years y
    WHERE y.id=previous.academic_year_id AND y.status IN ('active','draft')) THEN
    RAISE EXCEPTION 'Kelas tidak tersedia atau tahun sudah diarsipkan.';
  END IF;
  IF p_nama IS NULL OR char_length(btrim(p_nama)) NOT BETWEEN 1 AND 100
    OR char_length(coalesce(p_tingkat,''))>40 OR char_length(coalesce(p_jurusan,''))>100
    OR char_length(coalesce(p_rombel,''))>100 THEN
    RAISE EXCEPTION 'Nama/struktur kelas tidak valid.';
  END IF;
  IF p_teacher_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.teachers WHERE id=p_teacher_id) THEN
    RAISE EXCEPTION 'Pengajar tidak ditemukan. Muat ulang daftar pengajar sebelum menyimpan.';
  END IF;

  -- Struktur kelas tetap membekukan label laporan lama. Penanggung jawab kelas
  -- dapat berganti; identitas pencatat/penguji dan jurnal lama tidak ditulis ulang.
  IF ROW(previous.nama,coalesce(previous.tingkat,''),coalesce(previous.jurusan,''),coalesce(previous.rombel,''))
    IS DISTINCT FROM ROW(btrim(p_nama),btrim(coalesce(p_tingkat,'')),btrim(coalesce(p_jurusan,'')),btrim(coalesce(p_rombel,'')))
    AND (EXISTS(SELECT 1 FROM public.attendance WHERE class_id=p_class_id)
      OR EXISTS(SELECT 1 FROM public.scores WHERE class_id=p_class_id)
      OR EXISTS(SELECT 1 FROM public.teacher_journals WHERE class_id=p_class_id)) THEN
    RAISE EXCEPTION 'Kelas sudah memiliki kegiatan. Nama, tingkat, jurusan, dan rombel dikunci. Untuk mengganti pengajar, ubah pilihan Pengajar saja; biarkan struktur kelas seperti semula.';
  END IF;
  UPDATE public.classes SET nama=btrim(p_nama),tingkat=btrim(coalesce(p_tingkat,'')),
    jurusan=btrim(coalesce(p_jurusan,'')),rombel=btrim(coalesce(p_rombel,'')),teacher_id=p_teacher_id
    WHERE id=p_class_id RETURNING * INTO result;
  IF previous.teacher_id IS DISTINCT FROM result.teacher_id THEN
    INSERT INTO public.academic_class_teacher_changes(
      class_id,academic_year_id,previous_teacher_id,new_teacher_id,
      previous_teacher_name,new_teacher_name,changed_by
    ) VALUES(result.id,result.academic_year_id,previous.teacher_id,result.teacher_id,
      (SELECT t.nama FROM public.teachers t WHERE t.id=previous.teacher_id),
      (SELECT t.nama FROM public.teachers t WHERE t.id=result.teacher_id),auth.uid());
  END IF;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.academic_update_class(uuid,text,text,text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.academic_update_class(uuid,text,text,text,text,uuid) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
SELECT 'SQL 12 berhasil: admin dapat mengganti pengajar kelas, riwayat kegiatan tetap tersimpan.' AS hasil;

-- SAQUIN: optimasi baca presensi, penilaian, dan konteks tahun pelajaran.
-- Prasyarat: SQL 10_tahun_pelajaran.sql telah sukses.
-- Jalankan SELURUH berkas sebagai postgres di Supabase SQL Editor.
-- Tidak mengubah data kegiatan, trigger, policy tulis, atau batas statement_timeout.
-- RLS tetap aktif. Hak baca historis mengikuti snapshot kelas/tahun dari SQL10.
-- Rujukan: https://supabase.com/docs/guides/database/postgres/row-level-security
BEGIN;
SELECT pg_catalog.pg_advisory_xact_lock(20261015, 10);

DO $preflight$
BEGIN
  IF to_regclass('public.academic_years') IS NULL
    OR to_regclass('public.student_enrollments') IS NULL
    OR to_regprocedure('public.academic_can_read_activity(uuid,uuid,uuid)') IS NULL
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_attribute
      WHERE attrelid='public.attendance'::regclass AND attname='academic_year_id' AND NOT attisdropped) THEN
    RAISE EXCEPTION 'Jalankan SQL 10_tahun_pelajaran.sql sampai sukses sebelum SQL 11.';
  END IF;
END;
$preflight$;

-- Helper tanpa argumen baris: daftar izin dihitung satu kali oleh subplan query,
-- bukan mengambil status/peran/profil serta melakukan join untuk setiap catatan.
-- SECURITY DEFINER menghindari rekursi RLS pada tabel relasi; setiap helper tetap
-- memeriksa identitas dan status aktif, tanpa menerima identitas dari browser.
CREATE OR REPLACE FUNCTION public.academic_read_class_ids()
RETURNS SETOF uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE role_name text; ref_id uuid;
BEGIN
  IF auth.uid() IS NULL OR public.current_status() IS DISTINCT FROM 'aktif' THEN RETURN; END IF;
  role_name:=public.current_role_name(); ref_id:=public.current_ref_id();
  IF role_name='pengajar' THEN
    RETURN QUERY SELECT c.id FROM public.classes c WHERE c.teacher_id=ref_id;
  ELSIF role_name='siswa' THEN
    RETURN QUERY SELECT DISTINCT c.id FROM public.student_enrollments e
      JOIN public.classes c ON c.id=e.class_id WHERE e.student_id=ref_id;
  ELSIF role_name='mentor' THEN
    RETURN QUERY SELECT DISTINCT c.id FROM public.mentor_assignments ma
      JOIN public.student_enrollments e ON e.student_id=ma.student_id
      JOIN public.classes c ON c.id=e.class_id WHERE ma.mentor_id=ref_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.academic_read_student_ids()
RETURNS SETOF uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE role_name text; ref_id uuid;
BEGIN
  IF auth.uid() IS NULL OR public.current_status() IS DISTINCT FROM 'aktif' THEN RETURN; END IF;
  role_name:=public.current_role_name(); ref_id:=public.current_ref_id();
  IF role_name='pengajar' THEN
    RETURN QUERY SELECT DISTINCT e.student_id FROM public.classes c
      JOIN public.student_enrollments e ON e.class_id=c.id WHERE c.teacher_id=ref_id;
  ELSIF role_name='siswa' AND ref_id IS NOT NULL THEN
    RETURN NEXT ref_id;
  ELSIF role_name='mentor' THEN
    RETURN QUERY SELECT DISTINCT ma.student_id FROM public.mentor_assignments ma WHERE ma.mentor_id=ref_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.academic_read_activity_classes()
RETURNS TABLE(class_id uuid,academic_year_id uuid)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE role_name text; ref_id uuid;
BEGIN
  IF auth.uid() IS NULL OR public.current_status() IS DISTINCT FROM 'aktif' THEN RETURN; END IF;
  role_name:=public.current_role_name(); ref_id:=public.current_ref_id();
  IF role_name='pengajar' THEN
    -- Pasangan, bukan dua daftar terpisah: tahun dan kelas wajib cocok persis.
    -- Tidak dibatasi tahun aktif; kegiatan tahun arsip tetap dapat dibaca.
    RETURN QUERY SELECT c.id,c.academic_year_id FROM public.classes c
      WHERE c.teacher_id=ref_id AND c.academic_year_id IS NOT NULL;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.academic_read_activity_students()
RETURNS SETOF uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE role_name text; ref_id uuid;
BEGIN
  IF auth.uid() IS NULL OR public.current_status() IS DISTINCT FROM 'aktif' THEN RETURN; END IF;
  role_name:=public.current_role_name(); ref_id:=public.current_ref_id();
  IF role_name='siswa' AND ref_id IS NOT NULL THEN
    RETURN NEXT ref_id;
  ELSIF role_name='mentor' THEN
    RETURN QUERY SELECT DISTINCT ma.student_id FROM public.mentor_assignments ma WHERE ma.mentor_id=ref_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.academic_read_class_ids(),public.academic_read_student_ids(),
  public.academic_read_activity_classes(),public.academic_read_activity_students() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.academic_read_class_ids(),public.academic_read_student_ids(),
  public.academic_read_activity_classes(),public.academic_read_activity_students() TO authenticated;

-- SQL10 telah memakai scope RESTRICTIVE sebagai batas hak baca final. Policy
-- permisif khusus SELECT di bawah dibuat konstan true agar OR policy lama yang
-- menggunakan kelas terkini tidak ikut melakukan join mahal. Scope RESTRICTIVE
-- tetap menentukan seluruh baris yang boleh dibaca, sama dengan SQL10.
-- Policy ALL/INSERT/UPDATE/DELETE lama TIDAK dihapus atau diperluas.
-- Restrictive tambahan milik instalasi lain juga tetap berlaku.
DROP POLICY IF EXISTS academic_years_read ON public.academic_years;
CREATE POLICY academic_years_read ON public.academic_years FOR SELECT TO authenticated USING(true);
DROP POLICY IF EXISTS academic_years_read_scope ON public.academic_years;
CREATE POLICY academic_years_read_scope ON public.academic_years AS RESTRICTIVE FOR SELECT TO authenticated
  USING((SELECT auth.uid()) IS NOT NULL AND (SELECT public.current_status())='aktif');

DROP POLICY IF EXISTS academic_classes_read ON public.classes;
CREATE POLICY academic_classes_read ON public.classes FOR SELECT TO authenticated USING(true);
DROP POLICY IF EXISTS academic_classes_scope ON public.classes;
CREATE POLICY academic_classes_scope ON public.classes AS RESTRICTIVE FOR SELECT TO authenticated
  USING((SELECT auth.uid()) IS NOT NULL AND (SELECT public.current_status())='aktif'
    AND ((SELECT public.current_role_name())='admin' OR id IN (SELECT public.academic_read_class_ids())));

DROP POLICY IF EXISTS academic_students_read ON public.students;
CREATE POLICY academic_students_read ON public.students FOR SELECT TO authenticated USING(true);
DROP POLICY IF EXISTS academic_students_scope ON public.students;
CREATE POLICY academic_students_scope ON public.students AS RESTRICTIVE FOR SELECT TO authenticated
  USING((SELECT auth.uid()) IS NOT NULL AND (SELECT public.current_status())='aktif'
    AND ((SELECT public.current_role_name())='admin' OR id IN (SELECT public.academic_read_student_ids())));

DROP POLICY IF EXISTS academic_enrollment_read ON public.student_enrollments;
CREATE POLICY academic_enrollment_read ON public.student_enrollments FOR SELECT TO authenticated USING(true);
DROP POLICY IF EXISTS academic_enrollment_read_scope ON public.student_enrollments;
CREATE POLICY academic_enrollment_read_scope ON public.student_enrollments AS RESTRICTIVE FOR SELECT TO authenticated
  USING((SELECT auth.uid()) IS NOT NULL AND (SELECT public.current_status())='aktif'
    AND ((SELECT public.current_role_name())='admin'
      OR (student_id IN (SELECT public.academic_read_student_ids())
        AND class_id IN (SELECT public.academic_read_class_ids()))));

DO $activity_policies$
DECLARE tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['attendance','scores']) LOOP
    EXECUTE format('DROP POLICY IF EXISTS academic_read ON public.%I',tbl);
    EXECUTE format('CREATE POLICY academic_read ON public.%I FOR SELECT TO authenticated USING(true)',tbl);
    EXECUTE format('DROP POLICY IF EXISTS academic_read_scope ON public.%I',tbl);
    EXECUTE format($policy$
      CREATE POLICY academic_read_scope ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated
      USING((SELECT auth.uid()) IS NOT NULL AND (SELECT public.current_status())='aktif'
        AND ((SELECT public.current_role_name())='admin'
          OR (academic_year_id IS NOT NULL AND class_id IS NOT NULL AND (
            (class_id,academic_year_id) IN (SELECT allowed.class_id,allowed.academic_year_id FROM public.academic_read_activity_classes() allowed)
            OR student_id IN (SELECT public.academic_read_activity_students())
          ))))
    $policy$,tbl);
  END LOOP;
END;
$activity_policies$;

DROP POLICY IF EXISTS teacher_journals_read ON public.teacher_journals;
CREATE POLICY teacher_journals_read ON public.teacher_journals FOR SELECT TO authenticated USING(true);
DROP POLICY IF EXISTS academic_journal_read_scope ON public.teacher_journals;
CREATE POLICY academic_journal_read_scope ON public.teacher_journals AS RESTRICTIVE FOR SELECT TO authenticated
  USING((SELECT auth.uid()) IS NOT NULL AND (SELECT public.current_status())='aktif'
    AND ((SELECT public.current_role_name())='admin'
      OR ((SELECT public.current_role_name())='pengajar'
        AND teacher_id=(SELECT public.current_ref_id())
        AND class_id IN (SELECT public.academic_read_class_ids()))));

-- Indeks mengikuti filter/rentang dan urutan tanggal,id pada aplikasi. Indeks
-- lama dipertahankan agar tidak mengganggu query lain. Tidak ada perubahan data.
CREATE INDEX IF NOT EXISTS attendance_year_date_id_idx ON public.attendance(academic_year_id,tanggal DESC,id DESC);
CREATE INDEX IF NOT EXISTS scores_year_date_id_idx ON public.scores(academic_year_id,tanggal DESC,id DESC);
CREATE INDEX IF NOT EXISTS attendance_student_date_id_idx ON public.attendance(student_id,tanggal DESC,id DESC);
CREATE INDEX IF NOT EXISTS scores_student_date_id_idx ON public.scores(student_id,tanggal DESC,id DESC);
CREATE INDEX IF NOT EXISTS attendance_class_year_date_id_idx ON public.attendance(class_id,academic_year_id,tanggal DESC,id DESC);
CREATE INDEX IF NOT EXISTS scores_class_year_date_id_idx ON public.scores(class_id,academic_year_id,tanggal DESC,id DESC);
CREATE INDEX IF NOT EXISTS classes_teacher_year_id_idx ON public.classes(teacher_id,academic_year_id,id);
CREATE INDEX IF NOT EXISTS mentor_assignments_mentor_student_idx ON public.mentor_assignments(mentor_id,student_id);
CREATE INDEX IF NOT EXISTS teacher_journals_year_date_id_idx ON public.teacher_journals(academic_year_id,tanggal DESC,id DESC);
CREATE INDEX IF NOT EXISTS teacher_journals_teacher_year_date_id_idx ON public.teacher_journals(teacher_id,academic_year_id,tanggal DESC,id DESC);

ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_journals ENABLE ROW LEVEL SECURITY;
ANALYZE public.classes;
ANALYZE public.student_enrollments;
ANALYZE public.mentor_assignments;
ANALYZE public.attendance;
ANALYZE public.scores;
ANALYZE public.teacher_journals;
NOTIFY pgrst,'reload schema';
COMMIT;
SELECT 'SQL 11 berhasil: optimasi akses aktivitas terpasang, RLS tetap aktif.' AS hasil;

-- Jalankan seluruh file. Tidak memakai tabel sementara.
-- Prasyarat: policy presensi/penilaian berbasis kelas dari paket v2 sudah terpasang.
DO $features$
BEGIN
  CREATE TABLE IF NOT EXISTS public.report_month_settings (
    month text PRIMARY KEY CHECK (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
    report_date date NOT NULL,
    updated_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  ALTER TABLE public.report_month_settings ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON public.report_month_settings FROM anon, authenticated;
  GRANT SELECT, INSERT, UPDATE ON public.report_month_settings TO authenticated;

  DROP POLICY IF EXISTS report_month_read ON public.report_month_settings;
  CREATE POLICY report_month_read ON public.report_month_settings FOR SELECT TO authenticated
    USING (public.current_status() = 'aktif');
  DROP POLICY IF EXISTS report_month_insert ON public.report_month_settings;
  CREATE POLICY report_month_insert ON public.report_month_settings FOR INSERT TO authenticated
    WITH CHECK (public.current_status() = 'aktif' AND public.current_role_name() = 'admin' AND updated_by = auth.uid());
  DROP POLICY IF EXISTS report_month_update ON public.report_month_settings;
  CREATE POLICY report_month_update ON public.report_month_settings FOR UPDATE TO authenticated
    USING (public.current_status() = 'aktif' AND public.current_role_name() = 'admin')
    WITH CHECK (public.current_status() = 'aktif' AND public.current_role_name() = 'admin' AND updated_by = auth.uid());

  -- Jangan menganggap policy DELETE lain aman; hentikan untuk ditinjau jika sudah ada.
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname = 'public'
    AND tablename = 'scores' AND cmd IN ('DELETE', 'ALL') AND policyname <> 'scores_delete_authorized') THEN
    RAISE EXCEPTION 'Ada policy DELETE/ALL scores lain. Ekspor policy untuk ditinjau sebelum menerapkan fitur hapus.';
  END IF;
  GRANT DELETE ON public.scores TO authenticated;
  DROP POLICY IF EXISTS scores_delete_authorized ON public.scores;
  CREATE POLICY scores_delete_authorized ON public.scores FOR DELETE TO authenticated
    USING (
      public.current_status() = 'aktif' AND (
        public.current_role_name() = 'admin'
        OR (input_by = auth.uid() AND (
          (public.current_role_name() = 'pengajar' AND student_id IN (
            SELECT s.id FROM public.students s JOIN public.classes c ON c.id = s.kelas_id
            WHERE c.teacher_id = public.current_ref_id()
          ))
          OR (public.current_role_name() = 'mentor' AND student_id IN (
            SELECT ma.student_id FROM public.mentor_assignments ma WHERE ma.mentor_id = public.current_ref_id()
          ))
        ))
      )
    );
END;
$features$;

-- Indeks pendukung impor penilaian dan rekap bulanan per kelas.
CREATE INDEX IF NOT EXISTS attendance_student_tanggal_idx
  ON public.attendance (student_id, tanggal);
CREATE INDEX IF NOT EXISTS scores_student_tanggal_idx
  ON public.scores (student_id, tanggal);
CREATE INDEX IF NOT EXISTS attendance_tanggal_id_idx
  ON public.attendance (tanggal DESC, id DESC);
CREATE INDEX IF NOT EXISTS scores_tanggal_id_idx
  ON public.scores (tanggal DESC, id DESC);
CREATE INDEX IF NOT EXISTS students_kelas_nis_idx
  ON public.students (kelas_id, nis);
ANALYZE public.attendance;
ANALYZE public.scores;

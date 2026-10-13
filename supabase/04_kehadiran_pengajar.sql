-- Jalankan SELURUH file di SQL Editor. Satu blok, tanpa tabel sementara.
-- Status hanya diinput/dikoreksi admin aktif; pengajar aktif hanya membaca miliknya.
DO $migration$
BEGIN
  CREATE TABLE IF NOT EXISTS public.teacher_attendance (
    teacher_id uuid NOT NULL REFERENCES public.teachers(id),
    tanggal date NOT NULL,
    status text NOT NULL CHECK (status IN ('HADIR','SAKIT','IZIN','ALPHA')),
    note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 500),
    input_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (teacher_id, tanggal)
  );
  CREATE INDEX IF NOT EXISTS teacher_attendance_tanggal_idx ON public.teacher_attendance(tanggal);
  ALTER TABLE public.teacher_attendance ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON public.teacher_attendance FROM anon, authenticated;
  GRANT SELECT, INSERT, UPDATE ON public.teacher_attendance TO authenticated;

  IF EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='teacher_attendance'
    AND policyname NOT IN ('teacher_attendance_read','teacher_attendance_insert','teacher_attendance_update')) THEN
    RAISE EXCEPTION 'Tabel teacher_attendance memiliki policy lain. Periksa policy sebelum melanjutkan. Tidak ada perubahan yang disimpan.';
  END IF;

  DROP POLICY IF EXISTS teacher_attendance_read ON public.teacher_attendance;
  CREATE POLICY teacher_attendance_read ON public.teacher_attendance FOR SELECT TO authenticated
    USING (public.current_status()='aktif' AND (
      public.current_role_name()='admin'
      OR (public.current_role_name()='pengajar' AND teacher_id=public.current_ref_id())
    ));
  DROP POLICY IF EXISTS teacher_attendance_insert ON public.teacher_attendance;
  CREATE POLICY teacher_attendance_insert ON public.teacher_attendance FOR INSERT TO authenticated
    WITH CHECK (public.current_status()='aktif' AND public.current_role_name()='admin' AND input_by=auth.uid());
  DROP POLICY IF EXISTS teacher_attendance_update ON public.teacher_attendance;
  CREATE POLICY teacher_attendance_update ON public.teacher_attendance FOR UPDATE TO authenticated
    USING (public.current_status()='aktif' AND public.current_role_name()='admin')
    WITH CHECK (public.current_status()='aktif' AND public.current_role_name()='admin' AND input_by=auth.uid());

  -- Server records who last entered/corrected attendance and the actual update time.
  EXECUTE $ddl$
    CREATE OR REPLACE FUNCTION public.stamp_teacher_attendance()
    RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $body$
    BEGIN
      NEW.input_by := auth.uid();
      NEW.updated_at := now();
      RETURN NEW;
    END;
    $body$;
  $ddl$;
  DROP TRIGGER IF EXISTS stamp_teacher_attendance ON public.teacher_attendance;
  CREATE TRIGGER stamp_teacher_attendance BEFORE INSERT OR UPDATE ON public.teacher_attendance
    FOR EACH ROW EXECUTE FUNCTION public.stamp_teacher_attendance();
END;
$migration$;

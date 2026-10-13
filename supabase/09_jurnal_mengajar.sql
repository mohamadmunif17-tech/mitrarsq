-- Fitur jurnal mengajar pengajar dan rekap jurnal untuk admin.
-- Jalankan sekali di Supabase Dashboard -> SQL Editor.
DO $migration$
BEGIN
  -- Digunakan bersama oleh Rekap Kelas dan Report Bulanan.
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

  CREATE TABLE IF NOT EXISTS public.teacher_journals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE RESTRICT,
    class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
    tanggal date NOT NULL,
    materi text NOT NULL CHECK (char_length(btrim(materi)) BETWEEN 1 AND 500),
    kegiatan text NOT NULL CHECK (char_length(btrim(kegiatan)) BETWEEN 1 AND 2000),
    hasil text NOT NULL DEFAULT '' CHECK (char_length(hasil) <= 1000),
    catatan text NOT NULL DEFAULT '' CHECK (char_length(catatan) <= 1000),
    input_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
    created_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS teacher_journals_tanggal_idx
    ON public.teacher_journals (tanggal DESC, id DESC);
  CREATE INDEX IF NOT EXISTS teacher_journals_teacher_tanggal_idx
    ON public.teacher_journals (teacher_id, tanggal DESC);
  CREATE INDEX IF NOT EXISTS teacher_journals_class_tanggal_idx
    ON public.teacher_journals (class_id, tanggal DESC);

  ALTER TABLE public.teacher_journals ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON public.teacher_journals FROM anon, authenticated;
  GRANT SELECT, INSERT ON public.teacher_journals TO authenticated;

  DROP POLICY IF EXISTS teacher_journals_read ON public.teacher_journals;
  CREATE POLICY teacher_journals_read ON public.teacher_journals FOR SELECT TO authenticated
    USING (
      public.current_status() = 'aktif' AND (
        public.current_role_name() = 'admin'
        OR (public.current_role_name() = 'pengajar' AND teacher_id = public.current_ref_id())
      )
    );

  DROP POLICY IF EXISTS teacher_journals_insert ON public.teacher_journals;
  CREATE POLICY teacher_journals_insert ON public.teacher_journals FOR INSERT TO authenticated
    WITH CHECK (
      public.current_status() = 'aktif'
      AND public.current_role_name() = 'pengajar'
      AND teacher_id = public.current_ref_id()
      AND input_by = auth.uid()
      AND class_id IN (SELECT c.id FROM public.classes c WHERE c.teacher_id = public.current_ref_id())
    );


  EXECUTE $ddl$
    CREATE OR REPLACE FUNCTION public.stamp_teacher_journal()
    RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $body$
    BEGIN
      NEW.input_by := auth.uid();
      NEW.created_at := now();
      RETURN NEW;
    END;
    $body$;
  $ddl$;
  DROP TRIGGER IF EXISTS stamp_teacher_journal ON public.teacher_journals;
  CREATE TRIGGER stamp_teacher_journal BEFORE INSERT ON public.teacher_journals
    FOR EACH ROW EXECUTE FUNCTION public.stamp_teacher_journal();
END;
$migration$;

ANALYZE public.teacher_journals;

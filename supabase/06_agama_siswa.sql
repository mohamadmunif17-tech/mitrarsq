-- Jalankan seluruh file di SQL Editor (role postgres) sebelum deploy aplikasi.
BEGIN;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS agama text;

CREATE OR REPLACE FUNCTION public.guard_student_religion_change()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.agama IS NULL THEN RETURN NEW; END IF;
  ELSIF NEW.agama IS NOT DISTINCT FROM OLD.agama THEN
    RETURN NEW;
  END IF;
  IF current_user NOT IN ('postgres', 'service_role') THEN
    IF NOT EXISTS (SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin' AND p.status = 'aktif') THEN
      RAISE EXCEPTION 'Hanya admin aktif yang dapat mengubah agama siswa.';
    END IF;
  END IF;
  NEW.agama := nullif(btrim(NEW.agama), '');
  IF NEW.agama IS NOT NULL AND NEW.agama NOT IN
    ('Islam','Kristen','Katolik','Hindu','Buddha','Konghucu','Kepercayaan') THEN
    RAISE EXCEPTION 'Pilihan agama tidak valid.';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_student_religion_change ON public.students;
CREATE TRIGGER guard_student_religion_change BEFORE INSERT OR UPDATE OF agama
ON public.students FOR EACH ROW EXECUTE FUNCTION public.guard_student_religion_change();

CREATE OR REPLACE FUNCTION public.guard_tahfidz_participant()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE religion text;
BEGIN
  SELECT s.agama INTO religion FROM public.students s WHERE s.id = NEW.student_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Data siswa tidak tersedia untuk akun ini.'; END IF;
  IF nullif(btrim(religion), '') IS NOT NULL AND lower(btrim(religion)) <> 'islam' THEN
    RAISE EXCEPTION 'Siswa non-Muslim tidak termasuk peserta presensi dan penilaian Tahfidz.';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_tahfidz_participant ON public.attendance;
CREATE TRIGGER guard_tahfidz_participant BEFORE INSERT OR UPDATE ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.guard_tahfidz_participant();
DROP TRIGGER IF EXISTS guard_tahfidz_participant ON public.scores;
CREATE TRIGGER guard_tahfidz_participant BEFORE INSERT OR UPDATE ON public.scores
FOR EACH ROW EXECUTE FUNCTION public.guard_tahfidz_participant();
COMMIT;

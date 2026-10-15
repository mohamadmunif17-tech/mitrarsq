-- SAQUIN: tahun pelajaran dan riwayat penempatan siswa.
-- Prasyarat: skema aplikasi awal dan SQL 09_jurnal_mengajar.sql.
-- Jalankan SELURUH berkas sebagai postgres di Supabase SQL Editor.
-- Transaksi ini tidak menghapus siswa, kelas, kehadiran, nilai, atau jurnal lama.
-- Penempatan lama disimpulkan dari kelas siswa SAAT MIGRASI, bukan rekonstruksi
-- riwayat terverifikasi. Admin wajib meninjau sebelum mengarsipkan tahun awal.
BEGIN;
SELECT pg_catalog.pg_advisory_xact_lock(20261015, 10);

DO $preflight$
BEGIN
  IF to_regclass('public.teacher_journals') IS NULL THEN
    RAISE EXCEPTION 'Jalankan SQL 09_jurnal_mengajar.sql sebelum SQL 10.';
  END IF;
  IF to_regprocedure('public.current_status()') IS NULL
    OR to_regprocedure('public.current_role_name()') IS NULL
    OR to_regprocedure('public.current_ref_id()') IS NULL THEN
    RAISE EXCEPTION 'Helper keamanan skema awal belum terpasang.';
  END IF;
END;
$preflight$;

CREATE TABLE IF NOT EXISTS public.academic_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama text NOT NULL UNIQUE CHECK (char_length(btrim(nama)) BETWEEN 1 AND 60),
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  legacy_review_pending boolean NOT NULL DEFAULT false,
  CHECK (ends_on >= starts_on)
);
CREATE UNIQUE INDEX IF NOT EXISTS academic_years_one_active ON public.academic_years(status) WHERE status='active';

ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE RESTRICT;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS tingkat text NOT NULL DEFAULT '';
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS jurusan text NOT NULL DEFAULT '';
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS rombel text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.student_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  status text NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif','pindah','lulus','keluar')),
  inferred boolean NOT NULL DEFAULT false,
  CHECK (ends_on >= starts_on),
  UNIQUE(student_id,academic_year_id,starts_on)
);
CREATE INDEX IF NOT EXISTS student_enrollments_class_year_idx ON public.student_enrollments(class_id,academic_year_id);
CREATE INDEX IF NOT EXISTS student_enrollments_student_dates_idx ON public.student_enrollments(student_id,starts_on,ends_on);

ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE RESTRICT;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES public.classes(id) ON DELETE RESTRICT;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS enrollment_id uuid REFERENCES public.student_enrollments(id) ON DELETE RESTRICT;
ALTER TABLE public.scores ADD COLUMN IF NOT EXISTS academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE RESTRICT;
ALTER TABLE public.scores ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES public.classes(id) ON DELETE RESTRICT;
ALTER TABLE public.scores ADD COLUMN IF NOT EXISTS enrollment_id uuid REFERENCES public.student_enrollments(id) ON DELETE RESTRICT;
ALTER TABLE public.teacher_journals ADD COLUMN IF NOT EXISTS academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS attendance_year_class_date_idx ON public.attendance(academic_year_id,class_id,tanggal);
CREATE INDEX IF NOT EXISTS scores_year_class_date_idx ON public.scores(academic_year_id,class_id,tanggal);
CREATE INDEX IF NOT EXISTS teacher_journals_year_class_date_idx ON public.teacher_journals(academic_year_id,class_id,tanggal);

-- Seed hanya sekali; menjalankan ulang tidak mengubah pemetaan atau tahun aktif.
DO $seed$
DECLARE initial_id uuid; fresh boolean;
BEGIN
  SELECT NOT EXISTS(SELECT 1 FROM public.academic_years) INTO fresh;
  IF fresh THEN
    INSERT INTO public.academic_years(nama,starts_on,ends_on,status,legacy_review_pending)
    VALUES('2026/2027','2026-07-01','2027-06-30','active',true) RETURNING id INTO initial_id;
    UPDATE public.classes SET academic_year_id=initial_id WHERE academic_year_id IS NULL;
    INSERT INTO public.student_enrollments(student_id,class_id,academic_year_id,starts_on,ends_on,inferred)
    SELECT s.id,s.kelas_id,initial_id,'2026-07-01','2027-06-30',true
    FROM public.students s JOIN public.classes c ON c.id=s.kelas_id WHERE c.academic_year_id=initial_id;
    -- Hormati guard_tahfidz_participant dari SQL06. Pembaruan konteks juga
    -- memicu guard tersebut: data lama non-Muslim dipertahankan apa adanya,
    -- tetap belum terpetakan untuk ditinjau admin, tanpa menonaktifkan trigger.
    -- Agama kosong/belum diketahui tetap diizinkan sesuai aturan SQL06.
    UPDATE public.attendance a SET academic_year_id=e.academic_year_id,class_id=e.class_id,enrollment_id=e.id
    FROM public.student_enrollments e JOIN public.students s ON s.id=e.student_id
    WHERE a.student_id=e.student_id AND a.tanggal BETWEEN e.starts_on AND e.ends_on
      AND (nullif(btrim(s.agama),'') IS NULL OR lower(btrim(s.agama))='islam');
    UPDATE public.scores a SET academic_year_id=e.academic_year_id,class_id=e.class_id,enrollment_id=e.id
    FROM public.student_enrollments e JOIN public.students s ON s.id=e.student_id
    WHERE a.student_id=e.student_id AND a.tanggal BETWEEN e.starts_on AND e.ends_on
      AND (nullif(btrim(s.agama),'') IS NULL OR lower(btrim(s.agama))='islam');
    UPDATE public.teacher_journals j SET academic_year_id=initial_id
    FROM public.classes c WHERE c.id=j.class_id AND c.academic_year_id=initial_id AND j.tanggal BETWEEN '2026-07-01' AND '2027-06-30';
  END IF;
END;
$seed$;

-- Nama kelas yang sama di tahun berbeda diperbolehkan; identitas UUID tetap.
DO $unique_names$
DECLARE item record;
BEGIN
  FOR item IN SELECT con.conname FROM pg_catalog.pg_constraint con
    WHERE con.conrelid='public.classes'::regclass AND con.contype='u'
      AND con.conkey=ARRAY[(SELECT attnum FROM pg_catalog.pg_attribute WHERE attrelid='public.classes'::regclass AND attname='nama')]::smallint[]
  LOOP EXECUTE format('ALTER TABLE public.classes DROP CONSTRAINT %I',item.conname); END LOOP;
  FOR item IN SELECT i.indexrelid::regclass AS index_name FROM pg_catalog.pg_index i
    WHERE i.indrelid='public.classes'::regclass AND i.indisunique AND NOT i.indisprimary
      AND i.indnatts=1 AND i.indexprs IS NULL AND i.indpred IS NULL
      AND i.indkey::text=(SELECT attnum::text FROM pg_catalog.pg_attribute WHERE attrelid='public.classes'::regclass AND attname='nama')
      AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_constraint c WHERE c.conindid=i.indexrelid)
  LOOP EXECUTE format('DROP INDEX %s',item.index_name); END LOOP;
END;
$unique_names$;
CREATE UNIQUE INDEX IF NOT EXISTS classes_year_name_unique ON public.classes(academic_year_id,lower(btrim(nama)));

CREATE OR REPLACE FUNCTION public.academic_is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT auth.uid() IS NOT NULL AND public.current_status()='aktif' AND public.current_role_name()='admin';
$$;
CREATE OR REPLACE FUNCTION public.academic_today()
RETURNS date LANGUAGE sql STABLE SET search_path='' AS $$ SELECT (now() AT TIME ZONE 'Asia/Jakarta')::date; $$;
CREATE OR REPLACE FUNCTION public.academic_require_admin()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT public.academic_is_admin() THEN RAISE EXCEPTION 'Hanya admin aktif yang dapat mengelola tahun pelajaran.'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(20261015,10);
END;
$$;

CREATE OR REPLACE FUNCTION public.academic_can_read_class(p_class_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND public.current_status()='aktif' AND (
   public.current_role_name()='admin' OR EXISTS(
     SELECT 1 FROM public.classes c WHERE c.id=p_class_id AND (
       (public.current_role_name()='pengajar' AND c.teacher_id=public.current_ref_id())
       OR EXISTS(SELECT 1 FROM public.student_enrollments e WHERE e.class_id=c.id AND (
         (public.current_role_name()='siswa' AND e.student_id=public.current_ref_id())
         OR (public.current_role_name()='mentor' AND EXISTS(SELECT 1 FROM public.mentor_assignments ma WHERE ma.student_id=e.student_id AND ma.mentor_id=public.current_ref_id()))
       ))
     )
   )
 );
$$;
CREATE OR REPLACE FUNCTION public.academic_can_read_student(p_student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND public.current_status()='aktif' AND (
   public.current_role_name()='admin'
   OR (public.current_role_name()='siswa' AND p_student_id=public.current_ref_id())
   OR (public.current_role_name()='mentor' AND EXISTS(SELECT 1 FROM public.mentor_assignments ma WHERE ma.student_id=p_student_id AND ma.mentor_id=public.current_ref_id()))
   OR (public.current_role_name()='pengajar' AND EXISTS(SELECT 1 FROM public.student_enrollments e JOIN public.classes c ON c.id=e.class_id WHERE e.student_id=p_student_id AND c.teacher_id=public.current_ref_id()))
 );
$$;
CREATE OR REPLACE FUNCTION public.academic_can_read_activity(p_student_id uuid,p_class_id uuid,p_year_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND public.current_status()='aktif' AND (
   public.current_role_name()='admin' OR (p_year_id IS NOT NULL AND p_class_id IS NOT NULL AND (
     (public.current_role_name()='pengajar' AND EXISTS(SELECT 1 FROM public.classes c WHERE c.id=p_class_id AND c.academic_year_id=p_year_id AND c.teacher_id=public.current_ref_id()))
     OR (public.current_role_name()='siswa' AND p_student_id=public.current_ref_id())
     OR (public.current_role_name()='mentor' AND EXISTS(SELECT 1 FROM public.mentor_assignments ma WHERE ma.student_id=p_student_id AND ma.mentor_id=public.current_ref_id()))
   ))
 );
$$;
CREATE OR REPLACE FUNCTION public.academic_can_write_activity(p_student_id uuid,p_class_id uuid,p_year_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND public.current_status()='aktif'
   AND EXISTS(SELECT 1 FROM public.academic_years y WHERE y.id=p_year_id AND y.status='active')
   AND (public.current_role_name()='admin'
     OR (public.current_role_name()='pengajar' AND EXISTS(SELECT 1 FROM public.classes c WHERE c.id=p_class_id AND c.academic_year_id=p_year_id AND c.teacher_id=public.current_ref_id()))
     OR (public.current_role_name()='mentor' AND EXISTS(SELECT 1 FROM public.mentor_assignments ma WHERE ma.student_id=p_student_id AND ma.mentor_id=public.current_ref_id())));
$$;

-- Pemeriksaan periode dilakukan server, tidak bergantung pada filter browser.
CREATE OR REPLACE FUNCTION public.academic_guard_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE membership public.student_enrollments; y public.academic_years;
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') THEN
    IF OLD.academic_year_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.academic_years WHERE id=OLD.academic_year_id AND status='active') THEN
      RAISE EXCEPTION 'Aktivitas arsip atau belum terpetakan tidak dapat diubah. Riwayat tetap dipertahankan.';
    END IF;
    IF NOT public.academic_can_write_activity(OLD.student_id,OLD.class_id,OLD.academic_year_id) THEN RAISE EXCEPTION 'Akses perubahan aktivitas ditolak.'; END IF;
    IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  END IF;
  SELECT e.* INTO membership FROM public.student_enrollments e JOIN public.academic_years ay ON ay.id=e.academic_year_id
    WHERE e.student_id=NEW.student_id AND NEW.tanggal BETWEEN e.starts_on AND e.ends_on AND ay.status='active';
  IF NOT FOUND THEN RAISE EXCEPTION 'Siswa belum ditempatkan di kelas tahun aktif pada tanggal kegiatan. Hubungi admin.'; END IF;
  IF (NEW.academic_year_id IS NOT NULL AND NEW.academic_year_id<>membership.academic_year_id)
    OR (NEW.class_id IS NOT NULL AND NEW.class_id<>membership.class_id)
    OR (NEW.enrollment_id IS NOT NULL AND NEW.enrollment_id<>membership.id) THEN
    RAISE EXCEPTION 'Kelas/tahun kegiatan tidak cocok dengan riwayat penempatan siswa.';
  END IF;
  IF NOT public.academic_can_write_activity(NEW.student_id,membership.class_id,membership.academic_year_id) THEN RAISE EXCEPTION 'Akses kelas kegiatan ditolak.'; END IF;
  NEW.academic_year_id:=membership.academic_year_id; NEW.class_id:=membership.class_id; NEW.enrollment_id:=membership.id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS academic_guard_activity ON public.attendance;
CREATE TRIGGER academic_guard_activity BEFORE INSERT OR UPDATE OR DELETE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.academic_guard_activity();
DROP TRIGGER IF EXISTS academic_guard_activity ON public.scores;
CREATE TRIGGER academic_guard_activity BEFORE INSERT OR UPDATE OR DELETE ON public.scores FOR EACH ROW EXECUTE FUNCTION public.academic_guard_activity();

CREATE OR REPLACE FUNCTION public.academic_guard_journal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE year_id uuid;
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') AND (OLD.academic_year_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.academic_years WHERE id=OLD.academic_year_id AND status='active')) THEN
    RAISE EXCEPTION 'Jurnal tahun arsip atau belum terpetakan tidak dapat diubah.';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  SELECT y.id INTO year_id FROM public.classes c JOIN public.academic_years y ON y.id=c.academic_year_id
    WHERE c.id=NEW.class_id AND y.status='active' AND NEW.tanggal BETWEEN y.starts_on AND y.ends_on
      AND c.teacher_id=NEW.teacher_id;
  IF year_id IS NULL OR (NEW.academic_year_id IS NOT NULL AND NEW.academic_year_id<>year_id) THEN
    RAISE EXCEPTION 'Tanggal jurnal/penugasan kelas harus sesuai tahun pelajaran aktif.';
  END IF;
  NEW.academic_year_id:=year_id; RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS academic_guard_journal ON public.teacher_journals;
CREATE TRIGGER academic_guard_journal BEFORE INSERT OR UPDATE OR DELETE ON public.teacher_journals FOR EACH ROW EXECUTE FUNCTION public.academic_guard_journal();

-- Presensi pengajar dan tanggal pengesahan tetap memakai kunci tanggal/bulan,
-- tetapi server menolak perubahan periode arsip maupun di luar tahun aktif.
CREATE OR REPLACE FUNCTION public.academic_guard_period_settings()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE old_from date; old_to date; new_from date; new_to date;
BEGIN
  IF NOT public.academic_is_admin() THEN RAISE EXCEPTION 'Hanya admin aktif yang dapat mengubah data periode ini.'; END IF;
  IF TG_OP IN ('UPDATE','DELETE') THEN
    IF TG_TABLE_NAME='report_month_settings' THEN
      old_from:=(OLD.month||'-01')::date;
      old_to:=(old_from+interval '1 month'-interval '1 day')::date;
    ELSE old_from:=OLD.tanggal; old_to:=OLD.tanggal; END IF;
    IF NOT EXISTS(SELECT 1 FROM public.academic_years WHERE status='active' AND old_from>=starts_on AND old_to<=ends_on) THEN
      RAISE EXCEPTION 'Data periode arsip atau di luar tahun aktif tidak dapat diubah.';
    END IF;
    IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  END IF;
  IF TG_TABLE_NAME='report_month_settings' THEN
    IF NEW.month IS NULL OR NEW.month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' THEN RAISE EXCEPTION 'Bulan laporan tidak valid.'; END IF;
    new_from:=(NEW.month||'-01')::date;
    new_to:=(new_from+interval '1 month'-interval '1 day')::date;
  ELSE new_from:=NEW.tanggal; new_to:=NEW.tanggal; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.academic_years WHERE status='active' AND new_from>=starts_on AND new_to<=ends_on) THEN
    RAISE EXCEPTION 'Tanggal/bulan harus berada dalam tahun pelajaran aktif.';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS academic_guard_period_settings ON public.report_month_settings;
CREATE TRIGGER academic_guard_period_settings BEFORE INSERT OR UPDATE OR DELETE ON public.report_month_settings FOR EACH ROW EXECUTE FUNCTION public.academic_guard_period_settings();
DO $teacher_attendance_guard$
BEGIN
  IF to_regclass('public.teacher_attendance') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS academic_guard_period_settings ON public.teacher_attendance';
    EXECUTE 'CREATE TRIGGER academic_guard_period_settings BEFORE INSERT OR UPDATE OR DELETE ON public.teacher_attendance FOR EACH ROW EXECUTE FUNCTION public.academic_guard_period_settings()';
  END IF;
END;
$teacher_attendance_guard$;

CREATE OR REPLACE FUNCTION public.academic_guard_enrollment()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
DECLARE y public.academic_years;
BEGIN
  IF current_user NOT IN ('postgres','service_role','supabase_admin') THEN RAISE EXCEPTION 'Gunakan pengaturan penempatan siswa untuk mengubah riwayat.'; END IF;
  SELECT * INTO y FROM public.academic_years WHERE id=NEW.academic_year_id;
  IF y.status='archived' OR NEW.starts_on<y.starts_on OR NEW.ends_on>y.ends_on OR NEW.ends_on<NEW.starts_on THEN RAISE EXCEPTION 'Periode penempatan tidak sesuai tahun pelajaran atau tahun sudah diarsipkan.'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.classes WHERE id=NEW.class_id AND academic_year_id=y.id) THEN RAISE EXCEPTION 'Kelas bukan milik tahun pelajaran tersebut.'; END IF;
  PERFORM 1 FROM public.students WHERE id=NEW.student_id FOR UPDATE;
  IF EXISTS(SELECT 1 FROM public.student_enrollments e WHERE e.student_id=NEW.student_id AND e.id<>NEW.id
    AND e.starts_on<=NEW.ends_on AND e.ends_on>=NEW.starts_on) THEN RAISE EXCEPTION 'Periode penempatan siswa tumpang tindih.'; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS academic_guard_enrollment ON public.student_enrollments;
CREATE TRIGGER academic_guard_enrollment BEFORE INSERT OR UPDATE ON public.student_enrollments FOR EACH ROW EXECUTE FUNCTION public.academic_guard_enrollment();

-- kelas_id siswa hanyalah cache penempatan tahun aktif. Perpindahan melalui RPC.
CREATE OR REPLACE FUNCTION public.academic_guard_student_class()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF TG_OP='UPDATE' AND NEW.kelas_id IS DISTINCT FROM OLD.kelas_id AND current_user NOT IN ('postgres','service_role','supabase_admin') THEN
    RAISE EXCEPTION 'Gunakan fitur penempatan siswa agar riwayat kelas tetap tersimpan.';
  END IF;
  IF TG_OP='INSERT' AND NEW.kelas_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.classes c JOIN public.academic_years y ON y.id=c.academic_year_id WHERE c.id=NEW.kelas_id AND y.status='active') THEN
    RAISE EXCEPTION 'Siswa baru harus ditempatkan ke kelas tahun aktif, atau simpan tanpa kelas lalu atur penempatan.';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS academic_guard_student_class ON public.students;
CREATE TRIGGER academic_guard_student_class BEFORE INSERT OR UPDATE OF kelas_id ON public.students FOR EACH ROW EXECUTE FUNCTION public.academic_guard_student_class();
CREATE OR REPLACE FUNCTION public.academic_enroll_new_student()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE y public.academic_years;
BEGIN
  IF NEW.kelas_id IS NOT NULL THEN
    SELECT ay.* INTO y FROM public.classes c JOIN public.academic_years ay ON ay.id=c.academic_year_id WHERE c.id=NEW.kelas_id AND ay.status='active';
    IF FOUND THEN INSERT INTO public.student_enrollments(student_id,class_id,academic_year_id,starts_on,ends_on)
      VALUES(NEW.id,NEW.kelas_id,y.id,greatest(y.starts_on,least(public.academic_today(),y.ends_on)),y.ends_on); END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS academic_enroll_new_student ON public.students;
CREATE TRIGGER academic_enroll_new_student AFTER INSERT ON public.students FOR EACH ROW EXECUTE FUNCTION public.academic_enroll_new_student();

CREATE OR REPLACE FUNCTION public.academic_sync_current_classes()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 UPDATE public.students s SET kelas_id=(SELECT e.class_id FROM public.student_enrollments e JOIN public.academic_years y ON y.id=e.academic_year_id
   WHERE e.student_id=s.id AND y.status='active' AND greatest(y.starts_on,least(public.academic_today(),y.ends_on)) BETWEEN e.starts_on AND e.ends_on LIMIT 1);
$$;

CREATE OR REPLACE FUNCTION public.academic_create_year(p_nama text,p_starts_on date,p_ends_on date,p_copy_year_id uuid DEFAULT NULL)
RETURNS public.academic_years LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result public.academic_years;
BEGIN
  -- require_admin juga mengunci pg_advisory_xact_lock(20261015,10) sampai COMMIT;
  -- pemeriksaan periode dan INSERT diserialkan bersama seluruh RPC akademik.
  PERFORM public.academic_require_admin();
  IF p_starts_on IS NULL OR p_ends_on IS NULL OR p_ends_on<p_starts_on OR char_length(btrim(p_nama)) NOT BETWEEN 1 AND 60 THEN RAISE EXCEPTION 'Nama atau tanggal tahun pelajaran tidak valid.'; END IF;
  IF extract(day FROM p_starts_on)<>1 OR p_ends_on<>(date_trunc('month',p_ends_on)::date+interval '1 month'-interval '1 day')::date THEN
    RAISE EXCEPTION 'Periode tahun pelajaran harus dimulai tanggal 1 dan berakhir pada hari terakhir bulan agar laporan bulanan dapat disimpan.';
  END IF;
  IF EXISTS(SELECT 1 FROM public.academic_years y WHERE y.starts_on<=p_ends_on AND y.ends_on>=p_starts_on) THEN RAISE EXCEPTION 'Periode tahun pelajaran tumpang tindih dengan tahun lain.'; END IF;
  IF p_copy_year_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.academic_years WHERE id=p_copy_year_id) THEN RAISE EXCEPTION 'Tahun sumber tidak tersedia.'; END IF;
  INSERT INTO public.academic_years(nama,starts_on,ends_on) VALUES(btrim(p_nama),p_starts_on,p_ends_on) RETURNING * INTO result;
  IF p_copy_year_id IS NOT NULL THEN
    INSERT INTO public.classes(nama,teacher_id,academic_year_id,tingkat,jurusan,rombel)
      SELECT nama,NULL,result.id,tingkat,jurusan,rombel FROM public.classes WHERE academic_year_id=p_copy_year_id;
  END IF;
  RETURN result;
END;
$$;
CREATE OR REPLACE FUNCTION public.academic_activate_year(p_year_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE target public.academic_years;
BEGIN
  -- Memakai lock transaksi yang sama dengan create_year dan semua RPC mutasi.
  PERFORM public.academic_require_admin();
  SELECT * INTO target FROM public.academic_years WHERE id=p_year_id FOR UPDATE;
  IF NOT FOUND OR target.status='archived' THEN RAISE EXCEPTION 'Tahun tidak tersedia atau sudah diarsipkan.'; END IF;
  IF target.status='active' THEN RETURN target.id; END IF;
  IF EXISTS(SELECT 1 FROM public.academic_years WHERE status='active' AND legacy_review_pending) THEN RAISE EXCEPTION 'Tinjau dan konfirmasi pemetaan data lama tahun aktif sebelum mengganti tahun.'; END IF;
  IF EXISTS(SELECT 1 FROM public.academic_years WHERE status='active' AND ends_on>=target.starts_on) THEN RAISE EXCEPTION 'Aktivasi hanya dapat maju ke tahun berikutnya; tahun yang sudah diarsipkan tidak dibuka kembali.'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.classes WHERE academic_year_id=target.id) THEN RAISE EXCEPTION 'Siapkan setidaknya satu kelas tahun tujuan sebelum aktivasi.'; END IF;
  UPDATE public.academic_years SET status='archived' WHERE status='active';
  UPDATE public.academic_years SET status='active' WHERE id=target.id;
  PERFORM public.academic_sync_current_classes();
  RETURN target.id;
END;
$$;
CREATE OR REPLACE FUNCTION public.academic_create_class(p_year_id uuid,p_nama text,p_tingkat text DEFAULT '',p_jurusan text DEFAULT '',p_rombel text DEFAULT '',p_teacher_id uuid DEFAULT NULL)
RETURNS public.classes LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result public.classes;
BEGIN
  PERFORM public.academic_require_admin();
  IF NOT EXISTS(SELECT 1 FROM public.academic_years WHERE id=p_year_id AND status<>'archived') THEN RAISE EXCEPTION 'Kelas hanya dapat dibuat pada tahun aktif atau draft.'; END IF;
  IF p_nama IS NULL OR char_length(btrim(p_nama)) NOT BETWEEN 1 AND 100 OR char_length(coalesce(p_tingkat,''))>40 OR char_length(coalesce(p_jurusan,''))>100 OR char_length(coalesce(p_rombel,''))>100 THEN RAISE EXCEPTION 'Nama/struktur kelas tidak valid.'; END IF;
  INSERT INTO public.classes(nama,academic_year_id,tingkat,jurusan,rombel,teacher_id)
    VALUES(btrim(p_nama),p_year_id,btrim(coalesce(p_tingkat,'')),btrim(coalesce(p_jurusan,'')),btrim(coalesce(p_rombel,'')),p_teacher_id) RETURNING * INTO result;
  RETURN result;
END;
$$;
CREATE OR REPLACE FUNCTION public.academic_update_class(p_class_id uuid,p_nama text,p_tingkat text DEFAULT '',p_jurusan text DEFAULT '',p_rombel text DEFAULT '',p_teacher_id uuid DEFAULT NULL)
RETURNS public.classes LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result public.classes; previous public.classes;
BEGIN
  PERFORM public.academic_require_admin();
  IF NOT EXISTS(SELECT 1 FROM public.classes c JOIN public.academic_years y ON y.id=c.academic_year_id WHERE c.id=p_class_id AND y.status<>'archived') THEN RAISE EXCEPTION 'Kelas tidak tersedia atau tahun sudah diarsipkan.'; END IF;
  IF p_nama IS NULL OR char_length(btrim(p_nama)) NOT BETWEEN 1 AND 100 OR char_length(coalesce(p_tingkat,''))>40 OR char_length(coalesce(p_jurusan,''))>100 OR char_length(coalesce(p_rombel,''))>100 THEN RAISE EXCEPTION 'Nama/struktur kelas tidak valid.'; END IF;
  SELECT * INTO previous FROM public.classes WHERE id=p_class_id FOR UPDATE;
  IF ROW(previous.nama,previous.tingkat,previous.jurusan,previous.rombel,previous.teacher_id)
    IS DISTINCT FROM ROW(btrim(p_nama),btrim(coalesce(p_tingkat,'')),btrim(coalesce(p_jurusan,'')),btrim(coalesce(p_rombel,'')),p_teacher_id)
    AND (EXISTS(SELECT 1 FROM public.attendance WHERE class_id=p_class_id)
      OR EXISTS(SELECT 1 FROM public.scores WHERE class_id=p_class_id)
      OR EXISTS(SELECT 1 FROM public.teacher_journals WHERE class_id=p_class_id)) THEN
    RAISE EXCEPTION 'Kelas sudah memiliki kegiatan. Nama, struktur, dan pengajarnya dikunci agar laporan lama tetap benar. Buat kelas baru lalu pindahkan siswa dengan tanggal berlaku.';
  END IF;
  UPDATE public.classes SET nama=btrim(p_nama),tingkat=btrim(coalesce(p_tingkat,'')),jurusan=btrim(coalesce(p_jurusan,'')),rombel=btrim(coalesce(p_rombel,'')),teacher_id=p_teacher_id WHERE id=p_class_id RETURNING * INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.academic_place_students(p_year_id uuid,p_student_ids uuid[],p_class_id uuid,p_effective_date date,p_status text DEFAULT 'aktif')
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE y public.academic_years; sid uuid; prior public.student_enrollments; changed integer:=0;
BEGIN
  PERFORM public.academic_require_admin();
  SELECT * INTO y FROM public.academic_years WHERE id=p_year_id;
  IF NOT FOUND OR y.status='archived' OR p_effective_date IS NULL OR p_effective_date NOT BETWEEN y.starts_on AND y.ends_on THEN RAISE EXCEPTION 'Tahun/tanggal penempatan tidak valid atau sudah diarsipkan.'; END IF;
  IF p_status IS DISTINCT FROM 'aktif' OR coalesce(cardinality(p_student_ids),0)=0 OR cardinality(p_student_ids)>2000 THEN RAISE EXCEPTION 'Pilih 1–2000 siswa dan status aktif.'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.classes WHERE id=p_class_id AND academic_year_id=y.id) THEN RAISE EXCEPTION 'Kelas tujuan tidak sesuai tahun pelajaran.'; END IF;
  FOR sid IN SELECT DISTINCT unnest(p_student_ids) ORDER BY 1 LOOP
    PERFORM 1 FROM public.students WHERE id=sid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Siswa tidak tersedia.'; END IF;
    IF EXISTS(SELECT 1 FROM public.student_enrollments WHERE student_id=sid AND starts_on>p_effective_date AND academic_year_id=y.id) THEN RAISE EXCEPTION 'Siswa sudah memiliki penempatan sesudah tanggal ini. Periksa riwayat terlebih dahulu.'; END IF;
    SELECT * INTO prior FROM public.student_enrollments WHERE student_id=sid AND academic_year_id=y.id AND p_effective_date BETWEEN starts_on AND ends_on FOR UPDATE;
    IF FOUND THEN
      IF prior.class_id=p_class_id THEN CONTINUE; END IF;
      IF prior.starts_on=p_effective_date THEN RAISE EXCEPTION 'Perpindahan harus setelah tanggal awal penempatan; gunakan tanggal berikutnya agar riwayat tetap tersimpan.'; END IF;
      IF EXISTS(SELECT 1 FROM public.attendance WHERE enrollment_id=prior.id AND tanggal>=p_effective_date)
        OR EXISTS(SELECT 1 FROM public.scores WHERE enrollment_id=prior.id AND tanggal>=p_effective_date) THEN RAISE EXCEPTION 'Ada kegiatan kelas lama pada/sesudah tanggal pindah. Pilih tanggal setelah kegiatan terakhir; riwayat tidak dipindahkan otomatis.'; END IF;
      UPDATE public.student_enrollments SET ends_on=p_effective_date-1,status='pindah' WHERE id=prior.id;
    END IF;
    INSERT INTO public.student_enrollments(student_id,class_id,academic_year_id,starts_on,ends_on,status)
      VALUES(sid,p_class_id,y.id,p_effective_date,y.ends_on,'aktif');
    changed:=changed+1;
  END LOOP;
  IF y.status='active' THEN PERFORM public.academic_sync_current_classes(); END IF;
  RETURN changed;
END;
$$;
CREATE OR REPLACE FUNCTION public.academic_close_students(p_year_id uuid,p_student_ids uuid[],p_effective_date date,p_status text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE y public.academic_years; sid uuid; prior public.student_enrollments; changed integer:=0;
BEGIN
  PERFORM public.academic_require_admin();
  SELECT * INTO y FROM public.academic_years WHERE id=p_year_id;
  IF NOT FOUND OR y.status='archived' OR p_effective_date IS NULL OR p_effective_date NOT BETWEEN y.starts_on AND y.ends_on+1 THEN RAISE EXCEPTION 'Tahun/tanggal tidak valid atau sudah diarsipkan.'; END IF;
  IF p_status IS NULL OR p_status NOT IN ('lulus','keluar') OR coalesce(cardinality(p_student_ids),0)=0 OR cardinality(p_student_ids)>2000 THEN RAISE EXCEPTION 'Pilih 1–2000 siswa dan status lulus/keluar.'; END IF;
  FOR sid IN SELECT DISTINCT unnest(p_student_ids) ORDER BY 1 LOOP
    PERFORM 1 FROM public.students WHERE id=sid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Siswa tidak tersedia.'; END IF;
    IF EXISTS(SELECT 1 FROM public.student_enrollments WHERE student_id=sid AND academic_year_id=y.id AND starts_on>p_effective_date) THEN RAISE EXCEPTION 'Masih ada penempatan mendatang. Periksa riwayat siswa.'; END IF;
    SELECT * INTO prior FROM public.student_enrollments WHERE student_id=sid AND academic_year_id=y.id AND least(p_effective_date,y.ends_on) BETWEEN starts_on AND ends_on FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Siswa tidak memiliki penempatan pada tanggal tersebut.'; END IF;
    IF p_effective_date<=prior.starts_on THEN RAISE EXCEPTION 'Tanggal efektif keluar/lulus harus setelah awal penempatan.'; END IF;
    IF EXISTS(SELECT 1 FROM public.attendance WHERE enrollment_id=prior.id AND tanggal>=p_effective_date)
      OR EXISTS(SELECT 1 FROM public.scores WHERE enrollment_id=prior.id AND tanggal>=p_effective_date) THEN RAISE EXCEPTION 'Ada kegiatan pada/sesudah tanggal efektif. Pilih tanggal setelah kegiatan terakhir.'; END IF;
    UPDATE public.student_enrollments SET ends_on=p_effective_date-1,status=p_status WHERE id=prior.id;
    changed:=changed+1;
  END LOOP;
  IF y.status='active' THEN PERFORM public.academic_sync_current_classes(); END IF;
  RETURN changed;
END;
$$;
CREATE OR REPLACE FUNCTION public.academic_review_legacy(p_year_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  PERFORM public.academic_require_admin();
  UPDATE public.academic_years SET legacy_review_pending=false WHERE id=p_year_id AND status<>'archived';
  IF NOT FOUND THEN RAISE EXCEPTION 'Tahun tidak tersedia atau sudah diarsipkan.'; END IF;
  RETURN p_year_id;
END;
$$;
CREATE OR REPLACE FUNCTION public.academic_import_students(p_year_id uuid,p_effective_date date,p_rows jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE y public.academic_years; row_data jsonb; sid uuid; target_class uuid; imported integer:=0; nis_value text; name_value text; gender_value text;
BEGIN
  PERFORM public.academic_require_admin();
  SELECT * INTO y FROM public.academic_years WHERE id=p_year_id;
  IF NOT FOUND OR y.status='archived' OR p_effective_date IS NULL OR p_effective_date NOT BETWEEN y.starts_on AND y.ends_on THEN RAISE EXCEPTION 'Tahun/tanggal impor tidak valid atau tahun sudah diarsipkan.'; END IF;
  IF jsonb_typeof(p_rows) IS DISTINCT FROM 'array' OR jsonb_array_length(p_rows) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Impor harus berisi 1–2000 baris siswa.'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_rows) r GROUP BY btrim(r->>'nis') HAVING count(*)>1) THEN RAISE EXCEPTION 'Ada NIS berulang dalam berkas impor. Rapikan berkas sebelum mengimpor.'; END IF;
  FOR row_data IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
    nis_value:=nullif(btrim(row_data->>'nis'),''); name_value:=nullif(btrim(row_data->>'nama'),''); gender_value:=nullif(btrim(row_data->>'jenis_kelamin'),'');
    IF nis_value IS NULL OR name_value IS NULL OR char_length(nis_value)>100 OR char_length(name_value)>200 THEN RAISE EXCEPTION 'NIS/nama siswa wajib diisi dan tidak boleh terlalu panjang.'; END IF;
    IF gender_value IS NOT NULL AND gender_value NOT IN ('L','P','Laki-laki','Perempuan') THEN RAISE EXCEPTION 'Jenis kelamin harus L atau P.'; END IF;
    IF gender_value='Laki-laki' THEN gender_value:='L'; ELSIF gender_value='Perempuan' THEN gender_value:='P'; END IF;
    target_class:=nullif(row_data->>'class_id','')::uuid;
    IF target_class IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.classes WHERE id=target_class AND academic_year_id=y.id) THEN RAISE EXCEPTION 'Kelas impor tidak sesuai tahun pelajaran yang dipilih.'; END IF;
    SELECT id INTO sid FROM public.students WHERE nis=nis_value FOR UPDATE;
    IF sid IS NULL THEN
      INSERT INTO public.students(nis,nama,jenis_kelamin,kelas_id) VALUES(nis_value,name_value,gender_value,NULL) RETURNING id INTO sid;
    ELSE
      UPDATE public.students SET nama=name_value,jenis_kelamin=coalesce(gender_value,jenis_kelamin) WHERE id=sid;
    END IF;
    IF target_class IS NOT NULL THEN PERFORM public.academic_place_students(y.id,ARRAY[sid],target_class,p_effective_date,'aktif'); END IF;
    imported:=imported+1;
  END LOOP;
  RETURN jsonb_build_object('savedCount',imported);
END;
$$;
CREATE OR REPLACE FUNCTION public.academic_legacy_summary()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT CASE WHEN public.academic_is_admin() THEN jsonb_build_object(
  'unassigned_attendance',(SELECT count(*) FROM public.attendance WHERE academic_year_id IS NULL),
  'unassigned_scores',(SELECT count(*) FROM public.scores WHERE academic_year_id IS NULL),
  'unassigned_journals',(SELECT count(*) FROM public.teacher_journals WHERE academic_year_id IS NULL),
  'inferred_enrollments',(SELECT count(*) FROM public.student_enrollments WHERE inferred)
 ) ELSE '{}'::jsonb END;
$$;

-- RLS: guard RESTRICTIVE selalu di-AND-kan dengan policy permisif yang lama.
-- Policy baca baru memakai kelas historis, bukan cache students.kelas_id.
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_journals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.academic_years,public.student_enrollments FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.academic_years,public.student_enrollments TO authenticated;
REVOKE ALL ON public.classes,public.students,public.attendance,public.scores,public.teacher_journals FROM PUBLIC,anon;
REVOKE INSERT,UPDATE,DELETE ON public.classes FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.classes,public.students,public.attendance,public.scores,public.teacher_journals TO authenticated;

DROP POLICY IF EXISTS academic_years_read ON public.academic_years;
CREATE POLICY academic_years_read ON public.academic_years FOR SELECT TO authenticated USING(public.current_status()='aktif');
DROP POLICY IF EXISTS academic_years_read_scope ON public.academic_years;
CREATE POLICY academic_years_read_scope ON public.academic_years AS RESTRICTIVE FOR SELECT TO authenticated USING(auth.uid() IS NOT NULL AND public.current_status()='aktif');
DROP POLICY IF EXISTS academic_enrollment_read ON public.student_enrollments;
CREATE POLICY academic_enrollment_read ON public.student_enrollments FOR SELECT TO authenticated USING(public.academic_can_read_student(student_id) AND public.academic_can_read_class(class_id));
DROP POLICY IF EXISTS academic_enrollment_read_scope ON public.student_enrollments;
CREATE POLICY academic_enrollment_read_scope ON public.student_enrollments AS RESTRICTIVE FOR SELECT TO authenticated USING(public.academic_can_read_student(student_id) AND public.academic_can_read_class(class_id));
DROP POLICY IF EXISTS academic_classes_read ON public.classes;
CREATE POLICY academic_classes_read ON public.classes FOR SELECT TO authenticated USING(public.academic_can_read_class(id));
DROP POLICY IF EXISTS academic_classes_scope ON public.classes;
CREATE POLICY academic_classes_scope ON public.classes AS RESTRICTIVE FOR SELECT TO authenticated USING(public.academic_can_read_class(id));
DROP POLICY IF EXISTS academic_students_read ON public.students;
CREATE POLICY academic_students_read ON public.students FOR SELECT TO authenticated USING(public.academic_can_read_student(id));
DROP POLICY IF EXISTS academic_students_scope ON public.students;
CREATE POLICY academic_students_scope ON public.students AS RESTRICTIVE FOR SELECT TO authenticated USING(public.academic_can_read_student(id));

DO $activity_policies$
DECLARE tbl text;
BEGIN
 FOR tbl IN SELECT unnest(ARRAY['attendance','scores']) LOOP
   EXECUTE format('DROP POLICY IF EXISTS academic_read ON public.%I',tbl);
   EXECUTE format('CREATE POLICY academic_read ON public.%I FOR SELECT TO authenticated USING(public.academic_can_read_activity(student_id,class_id,academic_year_id))',tbl);
   EXECUTE format('DROP POLICY IF EXISTS academic_read_scope ON public.%I',tbl);
   EXECUTE format('CREATE POLICY academic_read_scope ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING(public.academic_can_read_activity(student_id,class_id,academic_year_id))',tbl);
   EXECUTE format('DROP POLICY IF EXISTS academic_insert ON public.%I',tbl);
   EXECUTE format('CREATE POLICY academic_insert ON public.%I FOR INSERT TO authenticated WITH CHECK(input_by=auth.uid() AND public.academic_can_write_activity(student_id,class_id,academic_year_id))',tbl);
   EXECUTE format('DROP POLICY IF EXISTS academic_insert_scope ON public.%I',tbl);
   EXECUTE format('CREATE POLICY academic_insert_scope ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(input_by=auth.uid() AND public.academic_can_write_activity(student_id,class_id,academic_year_id))',tbl);
   EXECUTE format('DROP POLICY IF EXISTS academic_update ON public.%I',tbl);
   EXECUTE format('CREATE POLICY academic_update ON public.%I FOR UPDATE TO authenticated USING((public.academic_is_admin() OR input_by=auth.uid()) AND public.academic_can_write_activity(student_id,class_id,academic_year_id)) WITH CHECK(input_by=auth.uid() AND public.academic_can_write_activity(student_id,class_id,academic_year_id))',tbl);
   EXECUTE format('DROP POLICY IF EXISTS academic_update_scope ON public.%I',tbl);
   EXECUTE format('CREATE POLICY academic_update_scope ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING((public.academic_is_admin() OR input_by=auth.uid()) AND public.academic_can_write_activity(student_id,class_id,academic_year_id)) WITH CHECK(input_by=auth.uid() AND public.academic_can_write_activity(student_id,class_id,academic_year_id))',tbl);
   EXECUTE format('DROP POLICY IF EXISTS academic_delete_scope ON public.%I',tbl);
   EXECUTE format('CREATE POLICY academic_delete_scope ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING((public.academic_is_admin() OR input_by=auth.uid()) AND public.academic_can_write_activity(student_id,class_id,academic_year_id))',tbl);
 END LOOP;
END;
$activity_policies$;
DROP POLICY IF EXISTS academic_delete ON public.scores;
CREATE POLICY academic_delete ON public.scores FOR DELETE TO authenticated
 USING((public.academic_is_admin() OR input_by=auth.uid()) AND public.academic_can_write_activity(student_id,class_id,academic_year_id));
DROP POLICY IF EXISTS academic_journal_read_scope ON public.teacher_journals;
CREATE POLICY academic_journal_read_scope ON public.teacher_journals AS RESTRICTIVE FOR SELECT TO authenticated
 USING(public.current_status()='aktif' AND (public.academic_is_admin() OR (public.current_role_name()='pengajar' AND teacher_id=public.current_ref_id() AND public.academic_can_read_class(class_id))));
DROP POLICY IF EXISTS academic_journal_write_scope ON public.teacher_journals;
CREATE POLICY academic_journal_write_scope ON public.teacher_journals AS RESTRICTIVE FOR INSERT TO authenticated
 WITH CHECK(public.current_status()='aktif' AND public.current_role_name()='pengajar' AND teacher_id=public.current_ref_id() AND input_by=auth.uid()
 AND EXISTS(SELECT 1 FROM public.academic_years y WHERE y.id=academic_year_id AND y.status='active') AND public.academic_can_read_class(class_id));
DROP POLICY IF EXISTS academic_journal_update_scope ON public.teacher_journals;
CREATE POLICY academic_journal_update_scope ON public.teacher_journals AS RESTRICTIVE FOR UPDATE TO authenticated USING(false) WITH CHECK(false);
DROP POLICY IF EXISTS academic_journal_delete_scope ON public.teacher_journals;
CREATE POLICY academic_journal_delete_scope ON public.teacher_journals AS RESTRICTIVE FOR DELETE TO authenticated USING(false);

-- INTERNAL functions are not callable by the browser, including the cache sync.
REVOKE ALL ON FUNCTION public.academic_require_admin(),public.academic_sync_current_classes(),public.academic_guard_activity(),public.academic_guard_journal(),public.academic_guard_period_settings(),public.academic_guard_enrollment(),public.academic_guard_student_class(),public.academic_enroll_new_student() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.academic_is_admin(),public.academic_today(),public.academic_can_read_class(uuid),public.academic_can_read_student(uuid),public.academic_can_read_activity(uuid,uuid,uuid),public.academic_can_write_activity(uuid,uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.academic_is_admin(),public.academic_today(),public.academic_can_read_class(uuid),public.academic_can_read_student(uuid),public.academic_can_read_activity(uuid,uuid,uuid),public.academic_can_write_activity(uuid,uuid,uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.academic_create_year(text,date,date,uuid),public.academic_activate_year(uuid),public.academic_create_class(uuid,text,text,text,text,uuid),public.academic_update_class(uuid,text,text,text,text,uuid),public.academic_place_students(uuid,uuid[],uuid,date,text),public.academic_close_students(uuid,uuid[],date,text),public.academic_review_legacy(uuid),public.academic_import_students(uuid,date,jsonb),public.academic_legacy_summary() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.academic_create_year(text,date,date,uuid),public.academic_activate_year(uuid),public.academic_create_class(uuid,text,text,text,text,uuid),public.academic_update_class(uuid,text,text,text,text,uuid),public.academic_place_students(uuid,uuid[],uuid,date,text),public.academic_close_students(uuid,uuid[],date,text),public.academic_review_legacy(uuid),public.academic_import_students(uuid,date,jsonb),public.academic_legacy_summary() TO authenticated;
ANALYZE public.student_enrollments;
ANALYZE public.attendance;
ANALYZE public.scores;
NOTIFY pgrst,'reload schema';
COMMIT;

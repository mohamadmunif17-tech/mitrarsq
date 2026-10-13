-- Satu blok transaksi. Jalankan SELURUH file di SQL Editor.
-- Hanya mendukung Admin <-> Pengajar, sesuai alur aplikasi ini.
DO $install$
BEGIN
  EXECUTE $ddl$
    CREATE OR REPLACE FUNCTION public.admin_change_user_role(
      p_user_id uuid, p_new_role text, p_teacher_id uuid DEFAULT NULL,
      p_create_teacher boolean DEFAULT false
    ) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
    AS $body$
    DECLARE
      actor_id uuid := auth.uid();
      actor public.profiles%ROWTYPE;
      target public.profiles%ROWTYPE;
      teacher_ref uuid;
      created_teacher boolean := false;
    BEGIN
      IF actor_id IS NULL THEN RAISE EXCEPTION 'Silakan login kembali.' USING ERRCODE='42501'; END IF;
      IF p_new_role IS NULL OR p_new_role NOT IN ('admin','pengajar') OR p_user_id IS NULL THEN
        RAISE EXCEPTION 'Role tujuan atau ID akun tidak valid.';
      END IF;
      -- Preliminary check prevents unauthorized users from taking a table lock.
      SELECT * INTO actor FROM public.profiles WHERE id=actor_id;
      IF NOT FOUND OR actor.role IS DISTINCT FROM 'admin' OR actor.status IS DISTINCT FROM 'aktif' THEN
        RAISE EXCEPTION 'Hanya admin aktif yang boleh mengubah role.' USING ERRCODE='42501';
      END IF;
      -- Serialize role changes and other profile writes before counting admins.
      LOCK TABLE public.profiles IN SHARE ROW EXCLUSIVE MODE;
      SELECT * INTO actor FROM public.profiles WHERE id=actor_id FOR UPDATE;
      IF NOT FOUND OR actor.role IS DISTINCT FROM 'admin' OR actor.status IS DISTINCT FROM 'aktif' THEN
        RAISE EXCEPTION 'Akses admin Anda telah berubah. Muat ulang halaman.' USING ERRCODE='42501';
      END IF;
      SELECT * INTO target FROM public.profiles WHERE id=p_user_id FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Akun tidak ditemukan.'; END IF;
      IF target.role IS NULL OR target.role NOT IN ('admin','pengajar') THEN
        RAISE EXCEPTION 'Fitur ini hanya untuk akun Admin dan Pengajar.';
      END IF;
      IF target.role::text = p_new_role THEN
        RETURN jsonb_build_object('success',true,'user_id',target.id,'role',target.role,'ref_id',target.ref_id,'created_teacher',false);
      END IF;
      IF target.role='admin' AND target.status='aktif' AND p_new_role='pengajar'
         AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE role='admin' AND status='aktif' AND id<>target.id) THEN
        RAISE EXCEPTION 'Tidak dapat mengubah admin aktif terakhir. Jadikan akun lain admin aktif terlebih dahulu.';
      END IF;
      teacher_ref := target.ref_id;
      IF p_new_role='pengajar' THEN
        IF p_create_teacher IS TRUE AND p_teacher_id IS NOT NULL THEN
          RAISE EXCEPTION 'Pilih pengajar yang sudah ada atau buat baru, bukan keduanya.';
        END IF;
        IF p_create_teacher IS TRUE THEN
          IF target.nama IS NULL OR btrim(target.nama)='' THEN RAISE EXCEPTION 'Nama profil wajib diisi sebelum membuat pengajar.'; END IF;
          INSERT INTO public.teachers(nama) VALUES(target.nama) RETURNING id INTO teacher_ref;
          created_teacher := true;
        ELSE
          teacher_ref := p_teacher_id;
          -- Prevent concurrent deletion of the selected teacher until commit.
          PERFORM 1 FROM public.teachers WHERE id=teacher_ref FOR KEY SHARE;
          IF NOT FOUND THEN
            RAISE EXCEPTION 'Pilih data pengajar yang valid atau buat data baru.';
          END IF;
        END IF;
        IF EXISTS(SELECT 1 FROM public.profiles WHERE ref_id=teacher_ref AND id<>target.id) THEN
          RAISE EXCEPTION 'Data pengajar tersebut sudah terhubung ke akun lain.';
        END IF;
      END IF;
      -- Promoting a teacher preserves ref_id and all historical teaching data.
      -- Assign through the row type so text and enum role columns are both supported.
      target.role := p_new_role;
      UPDATE public.profiles SET role=target.role,ref_id=teacher_ref WHERE id=target.id;
      RETURN jsonb_build_object('success',true,'user_id',target.id,'role',p_new_role,'ref_id',teacher_ref,'created_teacher',created_teacher);
    END;
    $body$;
  $ddl$;
  REVOKE ALL ON FUNCTION public.admin_change_user_role(uuid,text,uuid,boolean) FROM PUBLIC,anon;
  GRANT EXECUTE ON FUNCTION public.admin_change_user_role(uuid,text,uuid,boolean) TO authenticated;

  -- Protect role/ref_id against self-promotion through direct profile updates.
  -- Ordinary updates to signatures and other profile fields are unaffected.
  EXECUTE $ddl$
    CREATE OR REPLACE FUNCTION public.guard_profile_role_change()
    RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
    AS $body$
    BEGIN
      IF NEW.role IS NOT DISTINCT FROM OLD.role AND NEW.ref_id IS NOT DISTINCT FROM OLD.ref_id THEN RETURN NEW; END IF;
      -- Trusted SQL maintenance and the existing server-side account function.
      IF auth.uid() IS NULL AND (session_user IN ('postgres','supabase_admin') OR auth.role()='service_role') THEN RETURN NEW; END IF;
      IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin' AND status='aktif') THEN
        RAISE EXCEPTION 'Hanya admin aktif yang boleh mengubah role atau hubungan akun.' USING ERRCODE='42501';
      END IF;
      RETURN NEW;
    END;
    $body$;
  $ddl$;
  REVOKE ALL ON FUNCTION public.guard_profile_role_change() FROM PUBLIC,anon,authenticated;
  DROP TRIGGER IF EXISTS guard_profile_role_change ON public.profiles;
  CREATE TRIGGER guard_profile_role_change BEFORE UPDATE OF role,ref_id ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.guard_profile_role_change();
END;
$install$;

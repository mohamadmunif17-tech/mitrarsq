import { supabase } from "./supabaseClient.js";

export async function changeUserRole({userId,newRole,teacherId=null,createTeacher=false}) {
  if (!userId || !["admin","pengajar"].includes(newRole)) throw new Error("Akun dan role tujuan tidak valid.");
  if (newRole === "pengajar" && !teacherId && !createTeacher) throw new Error("Pilih data pengajar atau buat data baru.");
  const {data:auth,error:authError}=await supabase.auth.getUser();
  if (authError || !auth?.user) throw new Error("Sesi tidak valid. Silakan login kembali.");
  const {data,error}=await supabase.rpc("admin_change_user_role",{
    p_user_id:userId,p_new_role:newRole,
    p_teacher_id:newRole === "pengajar" && !createTeacher ? teacherId : null,
    p_create_teacher:newRole === "pengajar" && createTeacher,
  });
  if (error) {
    if (["PGRST202","42883"].includes(error.code)) throw new Error("Fitur Ubah Role belum terpasang. Jalankan SQL 05_ubah_role.sql di Supabase.");
    throw new Error(error.message || "Perubahan role ditolak.");
  }
  if (!data?.success || data.user_id !== userId || data.role !== newRole) throw new Error("Hasil perubahan belum dapat dipastikan. Muat ulang daftar akun sebelum mencoba lagi.");
  return data;
}

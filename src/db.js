import { supabase, SUPABASE_URL } from "./supabaseClient.js";

function mustOk(result, label) {
  if (result.error) {
    console.error(`[${label}]`, result.error);
    throw new Error(`${label}: ${result.error.message}`);
  }
  return result.data;
}

/* ---------- FETCH SEMUA DATA (dipanggil ulang setelah tiap mutasi) ---------- */
export async function fetchAllData() {
  const [classes, teachers, mentors, students, mentorAssignments, surahs, attendance, scores, profiles, certifications, riwayatPendidikan, schoolSettings] =
    await Promise.all([
      supabase.from("classes").select("*"),
      supabase.from("teachers").select("*"),
      supabase.from("mentors").select("*"),
      supabase.from("students").select("*"),
      supabase.from("mentor_assignments").select("*"),
      supabase.from("surahs").select("*"),
      supabase.from("attendance").select("*"),
      supabase.from("scores").select("*"),
      supabase.from("profiles").select("*"),
      supabase.from("certifications").select("*"),
      supabase.from("riwayat_pendidikan").select("*"),
      supabase.from("school_settings").select("*").eq("id", true).single(),
    ]);

  return {
    classes: mustOk(classes, "classes").map((c) => ({ id: c.id, nama: c.nama, teacherId: c.teacher_id })),
    teachers: mustOk(teachers, "teachers").map((t) => ({
      id: t.id, nama: t.nama, fotoUrl: t.foto_url, noHp: t.no_hp,
      pendidikanTerakhir: t.pendidikan_terakhir, alamat: t.alamat,
      namaPanggilan: t.nama_panggilan, nik: t.nik, tempatLahir: t.tempat_lahir,
      tanggalLahir: t.tanggal_lahir, agama: t.agama, statusPernikahan: t.status_pernikahan,
      kota: t.kota, provinsi: t.provinsi,
    })),
    mentors: mustOk(mentors, "mentors").map((m) => ({ id: m.id, nama: m.nama })),
    students: mustOk(students, "students").map((s) => ({
      id: s.id, nis: s.nis, nama: s.nama, jenisKelamin: s.jenis_kelamin, kelasId: s.kelas_id,
    })),
    mentorAssignments: mustOk(mentorAssignments, "mentor_assignments").map((m) => ({
      id: m.id, mentorId: m.mentor_id, studentId: m.student_id,
    })),
    surahs: mustOk(surahs, "surahs").map((s) => ({ id: s.id, nama: s.nama, ayat: s.jumlah_ayat, juz: s.juz })),
    attendance: mustOk(attendance, "attendance").map((a) => ({
      id: a.id, studentId: a.student_id, tanggal: a.tanggal, status: a.status, note: a.note || "", inputBy: a.input_by,
    })),
    scores: mustOk(scores, "scores").map((s) => ({
      id: s.id, studentId: s.student_id, tanggal: s.tanggal, surahId: s.surah_id,
      ayatMulai: s.ayat_mulai, ayatAkhir: s.ayat_akhir, nilai: s.nilai, nilaiHuruf: s.nilai_huruf,
      catatan: s.catatan || "", penguji: s.penguji, inputBy: s.input_by,
    })),
    profiles: mustOk(profiles, "profiles").map((p) => ({
      id: p.id, nama: p.nama, role: p.role, refId: p.ref_id, status: p.status, signatureUrl: p.signature_url,
    })),
    certifications: mustOk(certifications, "certifications").map((c) => ({
      id: c.id, teacherId: c.teacher_id, nama: c.nama_sertifikasi, penyelenggara: c.penyelenggara, tahun: c.tahun, fileUrl: c.file_url,
    })),
    riwayatPendidikan: mustOk(riwayatPendidikan, "riwayat_pendidikan").map((r) => ({
      id: r.id, teacherId: r.teacher_id, jenjang: r.jenjang, institusi: r.institusi, jurusan: r.jurusan, tahunLulus: r.tahun_lulus,
    })),
    schoolSettings: { stempelUrl: schoolSettings.data?.stempel_url || null },
  };
}

/* ---------- PRESENSI ---------- */
export async function saveAttendanceBatch(records) {
  const rows = records.map((r) => ({
    student_id: r.studentId, tanggal: r.tanggal, status: r.status, note: r.note || "", input_by: r.inputBy,
  }));
  const res = await supabase.from("attendance").upsert(rows, { onConflict: "student_id,tanggal" });
  mustOk(res, "saveAttendanceBatch");
}

/* ---------- PENILAIAN ---------- */
export const GRADE_TO_NUMBER = { "A+": 95, "A": 88, "B+": 80, "B": 73, "C": 65 };

export async function insertScore(entry) {
  const res = await supabase.from("scores").insert({
    student_id: entry.studentId, tanggal: entry.tanggal, surah_id: entry.surahId,
    ayat_mulai: entry.ayatMulai, ayat_akhir: entry.ayatAkhir,
    nilai: GRADE_TO_NUMBER[entry.nilaiHuruf] ?? 0, nilai_huruf: entry.nilaiHuruf,
    catatan: entry.catatan || null,
    penguji: entry.penguji, input_by: entry.inputBy,
  });
  mustOk(res, "insertScore");
}

/* ---------- MASTER DATA: SISWA ---------- */
export async function insertStudent(student) {
  const res = await supabase.from("students").insert({
    nis: student.nis, nama: student.nama, jenis_kelamin: student.jenisKelamin || null,
    kelas_id: student.kelasId,
  });
  mustOk(res, "insertStudent");
}

export async function bulkInsertStudents(rows) {
  const payload = rows.map((r) => ({
    nis: r.nis, nama: r.nama, jenis_kelamin: r.jenisKelamin || null,
    kelas_id: r.kelasId,
  }));
  const res = await supabase.from("students").insert(payload);
  mustOk(res, "bulkInsertStudents");
}

export async function deleteStudent(id) {
  const res = await supabase.from("students").delete().eq("id", id);
  mustOk(res, "deleteStudent");
}
export async function updateStudentClass(studentId, kelasId) {
  const res = await supabase.from("students").update({ kelas_id: kelasId }).eq("id", studentId);
  mustOk(res, "updateStudentClass");
}
export async function bulkUpdateStudentClass(studentIds, kelasId) {
  const res = await supabase.from("students").update({ kelas_id: kelasId }).in("id", studentIds);
  mustOk(res, "bulkUpdateStudentClass");
}
export async function bulkDeleteStudents(studentIds) {
  const res = await supabase.from("students").delete().in("id", studentIds);
  mustOk(res, "bulkDeleteStudents");
}

/* ---------- MASTER DATA: KELAS (pengajar ditugaskan langsung ke kelas) ---------- */
export async function insertClass(nama, teacherId = null) {
  const res = await supabase.from("classes").insert({ nama, teacher_id: teacherId }).select().single();
  return mustOk(res, "insertClass");
}
export async function deleteClass(id) {
  const res = await supabase.from("classes").delete().eq("id", id);
  mustOk(res, "deleteClass");
}
export async function updateClassTeacher(classId, teacherId) {
  const res = await supabase.from("classes").update({ teacher_id: teacherId || null }).eq("id", classId);
  mustOk(res, "updateClassTeacher");
}
export async function findOrCreateClassByName(nama, existingClasses) {
  const found = existingClasses.find((c) => c.nama.toLowerCase() === nama.toLowerCase());
  if (found) return found;
  const created = await insertClass(nama);
  return { id: created.id, nama: created.nama, teacherId: created.teacher_id };
}

/* ---------- UPLOAD FILE (foto, tanda tangan, stempel, sertifikat) ---------- */
export async function uploadFile(file, folder) {
  const ext = file.name.split(".").pop();
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("uploads").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("uploads").getPublicUrl(path);
  return data.publicUrl;
}

/* ---------- PROFIL PENGGUNA (tanda tangan sendiri) ---------- */
export async function updateOwnSignature(profileId, url) {
  const res = await supabase.from("profiles").update({ signature_url: url }).eq("id", profileId);
  mustOk(res, "updateOwnSignature");
}

/* ---------- PROFIL LENGKAP PENGAJAR ---------- */
export async function updateTeacherProfile(teacherId, fields) {
  const payload = {};
  if (fields.fotoUrl !== undefined) payload.foto_url = fields.fotoUrl;
  if (fields.noHp !== undefined) payload.no_hp = fields.noHp;
  if (fields.pendidikanTerakhir !== undefined) payload.pendidikan_terakhir = fields.pendidikanTerakhir;
  if (fields.alamat !== undefined) payload.alamat = fields.alamat;
  if (fields.namaPanggilan !== undefined) payload.nama_panggilan = fields.namaPanggilan;
  if (fields.nik !== undefined) payload.nik = fields.nik;
  if (fields.tempatLahir !== undefined) payload.tempat_lahir = fields.tempatLahir;
  if (fields.tanggalLahir !== undefined) payload.tanggal_lahir = fields.tanggalLahir || null;
  if (fields.agama !== undefined) payload.agama = fields.agama;
  if (fields.statusPernikahan !== undefined) payload.status_pernikahan = fields.statusPernikahan;
  if (fields.kota !== undefined) payload.kota = fields.kota;
  if (fields.provinsi !== undefined) payload.provinsi = fields.provinsi;
  const res = await supabase.from("teachers").update(payload).eq("id", teacherId);
  mustOk(res, "updateTeacherProfile");
}

/* ---------- RIWAYAT PENDIDIKAN PENGAJAR ---------- */
export async function fetchRiwayatPendidikan(teacherId) {
  const res = await supabase.from("riwayat_pendidikan").select("*").eq("teacher_id", teacherId).order("tahun_lulus", { ascending: false });
  return mustOk(res, "fetchRiwayatPendidikan").map((r) => ({
    id: r.id, teacherId: r.teacher_id, jenjang: r.jenjang, institusi: r.institusi, jurusan: r.jurusan, tahunLulus: r.tahun_lulus,
  }));
}
export async function addRiwayatPendidikan(teacherId, item) {
  const res = await supabase.from("riwayat_pendidikan").insert({
    teacher_id: teacherId, jenjang: item.jenjang || null, institusi: item.institusi,
    jurusan: item.jurusan || null, tahun_lulus: item.tahunLulus || null,
  });
  mustOk(res, "addRiwayatPendidikan");
}
export async function deleteRiwayatPendidikan(id) {
  const res = await supabase.from("riwayat_pendidikan").delete().eq("id", id);
  mustOk(res, "deleteRiwayatPendidikan");
}

/* ---------- SERTIFIKASI PENGAJAR ---------- */
export async function fetchCertifications(teacherId) {
  const res = await supabase.from("certifications").select("*").eq("teacher_id", teacherId).order("tahun", { ascending: false });
  return mustOk(res, "fetchCertifications").map((c) => ({
    id: c.id, teacherId: c.teacher_id, nama: c.nama_sertifikasi, penyelenggara: c.penyelenggara, tahun: c.tahun, fileUrl: c.file_url,
  }));
}
export async function addCertification(teacherId, cert) {
  const res = await supabase.from("certifications").insert({
    teacher_id: teacherId, nama_sertifikasi: cert.nama, penyelenggara: cert.penyelenggara || null,
    tahun: cert.tahun || null, file_url: cert.fileUrl || null,
  });
  mustOk(res, "addCertification");
}
export async function deleteCertification(id) {
  const res = await supabase.from("certifications").delete().eq("id", id);
  mustOk(res, "deleteCertification");
}

/* ---------- PENGATURAN SEKOLAH (stempel) ---------- */
export async function fetchSchoolSettings() {
  const res = await supabase.from("school_settings").select("*").eq("id", true).single();
  const data = mustOk(res, "fetchSchoolSettings");
  return { stempelUrl: data?.stempel_url || null };
}
export async function updateSchoolStamp(url) {
  const res = await supabase.from("school_settings").update({ stempel_url: url }).eq("id", true);
  mustOk(res, "updateSchoolStamp");
}

/* ---------- MANAJEMEN USER (profiles) ---------- */
export async function setProfileStatus(profileId, status) {
  const res = await supabase.from("profiles").update({ status }).eq("id", profileId);
  mustOk(res, "setProfileStatus");
}

/* ---------- AKUN SENDIRI: GANTI PASSWORD ---------- */
export async function changeOwnPassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

/* ---------- LUPA PASSWORD ---------- */
export async function sendPasswordResetEmail(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });
  if (error) throw error;
}

/* ---------- ADMIN: TAMBAH USER BARU (lewat Edge Function) ---------- */
export async function createUserAccount({ nama, email, password, role }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Sesi tidak ditemukan, coba login ulang.");

  const res = await fetch(`${SUPABASE_URL}/functions/v1/create-user`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ nama, email, password, role }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Gagal membuat user.");
  return json;
}

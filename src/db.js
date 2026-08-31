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
  const [classes, teachers, mentors, groups, students, mentorAssignments, surahs, attendance, scores, profiles] =
    await Promise.all([
      supabase.from("classes").select("*"),
      supabase.from("teachers").select("*"),
      supabase.from("mentors").select("*"),
      supabase.from("tahfidz_groups").select("*"),
      supabase.from("students").select("*"),
      supabase.from("mentor_assignments").select("*"),
      supabase.from("surahs").select("*"),
      supabase.from("attendance").select("*"),
      supabase.from("scores").select("*"),
      supabase.from("profiles").select("*"),
    ]);

  return {
    classes: mustOk(classes, "classes").map((c) => ({ id: c.id, nama: c.nama })),
    teachers: mustOk(teachers, "teachers").map((t) => ({ id: t.id, nama: t.nama })),
    mentors: mustOk(mentors, "mentors").map((m) => ({ id: m.id, nama: m.nama })),
    groups: mustOk(groups, "groups").map((g) => ({ id: g.id, nama: g.nama, teacherId: g.teacher_id })),
    students: mustOk(students, "students").map((s) => ({
      id: s.id, nis: s.nis, nama: s.nama, jenisKelamin: s.jenis_kelamin, kelasId: s.kelas_id, groupId: s.group_id,
    })),
    mentorAssignments: mustOk(mentorAssignments, "mentor_assignments").map((m) => ({
      id: m.id, mentorId: m.mentor_id, studentId: m.student_id,
    })),
    surahs: mustOk(surahs, "surahs").map((s) => ({ id: s.id, nama: s.nama, ayat: s.jumlah_ayat })),
    attendance: mustOk(attendance, "attendance").map((a) => ({
      id: a.id, studentId: a.student_id, tanggal: a.tanggal, status: a.status, note: a.note || "", inputBy: a.input_by,
    })),
    scores: mustOk(scores, "scores").map((s) => ({
      id: s.id, studentId: s.student_id, tanggal: s.tanggal, surahId: s.surah_id,
      ayatMulai: s.ayat_mulai, ayatAkhir: s.ayat_akhir, nilai: s.nilai, penguji: s.penguji, inputBy: s.input_by,
    })),
    profiles: mustOk(profiles, "profiles").map((p) => ({
      id: p.id, nama: p.nama, role: p.role, refId: p.ref_id, status: p.status,
    })),
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
export async function insertScore(entry) {
  const res = await supabase.from("scores").insert({
    student_id: entry.studentId, tanggal: entry.tanggal, surah_id: entry.surahId,
    ayat_mulai: entry.ayatMulai, ayat_akhir: entry.ayatAkhir, nilai: entry.nilai,
    penguji: entry.penguji, input_by: entry.inputBy,
  });
  mustOk(res, "insertScore");
}

/* ---------- MASTER DATA: SISWA ---------- */
export async function insertStudent(student) {
  const res = await supabase.from("students").insert({
    nis: student.nis, nama: student.nama, jenis_kelamin: student.jenisKelamin || null,
    kelas_id: student.kelasId, group_id: student.groupId,
  });
  mustOk(res, "insertStudent");
}

export async function bulkInsertStudents(rows) {
  const payload = rows.map((r) => ({
    nis: r.nis, nama: r.nama, jenis_kelamin: r.jenisKelamin || null,
    kelas_id: r.kelasId, group_id: r.groupId,
  }));
  const res = await supabase.from("students").insert(payload);
  mustOk(res, "bulkInsertStudents");
}

export async function deleteStudent(id) {
  const res = await supabase.from("students").delete().eq("id", id);
  mustOk(res, "deleteStudent");
}

/* ---------- MASTER DATA: KELAS ---------- */
export async function insertClass(nama) {
  const res = await supabase.from("classes").insert({ nama }).select().single();
  return mustOk(res, "insertClass");
}
export async function deleteClass(id) {
  const res = await supabase.from("classes").delete().eq("id", id);
  mustOk(res, "deleteClass");
}
export async function findOrCreateClassByName(nama, existingClasses) {
  const found = existingClasses.find((c) => c.nama.toLowerCase() === nama.toLowerCase());
  if (found) return found;
  const created = await insertClass(nama);
  return { id: created.id, nama: created.nama };
}

/* ---------- MASTER DATA: KELOMPOK ---------- */
export async function insertGroup(nama, teacherId) {
  const res = await supabase.from("tahfidz_groups").insert({ nama, teacher_id: teacherId });
  mustOk(res, "insertGroup");
}
export async function deleteGroup(id) {
  const res = await supabase.from("tahfidz_groups").delete().eq("id", id);
  mustOk(res, "deleteGroup");
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

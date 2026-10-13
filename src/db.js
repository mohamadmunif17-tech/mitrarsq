import { isTahfidzStudent } from "./studentEligibility.js";
import { TEACHER_STATUSES, validDate } from "./teacherAttendanceModel.js";
import { supabase, SUPABASE_URL } from "./supabaseClient.js";

const DB_REQUEST_TIMEOUT_MS = 20000;

function withDbTimeout(request, label, timeoutMs = DB_REQUEST_TIMEOUT_MS) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} belum merespons setelah ${Math.round(timeoutMs / 1000)} detik. Periksa koneksi, Environment Variables Vercel, dan status project Supabase.`)), timeoutMs);
  });
  return Promise.race([Promise.resolve(request), timeout]).finally(() => clearTimeout(timer));
}

function mustOk(result, label) {
  if (result.error) {
    console.error(`[${label}]`, result.error);
    if (/row-level security/i.test(result.error.message || "")) {
      throw new Error("Akses data ditolak. Minta Admin memeriksa penugasan kelas dan aturan akses presensi/penilaian.");
    }
    throw new Error(`${label}: ${result.error.message}`);
  }
  return result.data;
}

async function fetchRows(table) {
  const columns = {
    classes: "id,nama,teacher_id",
    teachers: "id,nama,foto_url,no_hp,pendidikan_terakhir,alamat,nama_panggilan,nik,tempat_lahir,tanggal_lahir,agama,status_pernikahan,kota,provinsi",
    mentors: "id,nama",
    students: "id,nis,nama,jenis_kelamin,kelas_id,agama",
    mentor_assignments: "id,mentor_id,student_id",
    surahs: "id,nama,jumlah_ayat,juz",
    attendance: "id,student_id,tanggal,status,note,input_by",
    scores: "id,student_id,tanggal,surah_id,ayat_mulai,ayat_akhir,nilai,nilai_huruf,catatan,penguji,input_by",
    profiles: "id,nama,role,ref_id,status,signature_url",
    certifications: "id,teacher_id,nama_sertifikasi,penyelenggara,tahun,file_url",
    riwayat_pendidikan: "id,teacher_id,jenjang,institusi,jurusan,tahun_lulus",
  };
  const data = [];
  for (let offset = 0; ; offset += 500) {
    const result = await withDbTimeout(
      supabase.from(table).select(columns[table] || "*").order("id").range(offset, offset + 499),
      `Memuat ${table}`,
    );
    if (result.error) return result;
    data.push(...(result.data || []));
    if ((result.data || []).length < 500) return {data,error:null};
  }
}

/* ---------- FETCH SEMUA DATA (dipanggil ulang setelah tiap mutasi) ---------- */
export async function fetchAllData() {
  const [classes, teachers, mentors, students, mentorAssignments, surahs, attendance, scores, profiles, certifications, riwayatPendidikan, schoolSettings] =
    await Promise.all([
      fetchRows("classes"),
      fetchRows("teachers"),
      fetchRows("mentors"),
      fetchRows("students"),
      fetchRows("mentor_assignments"),
      fetchRows("surahs"),
      fetchRows("attendance"),
      fetchRows("scores"),
      fetchRows("profiles"),
      fetchRows("certifications"),
      fetchRows("riwayat_pendidikan"),
      withDbTimeout(supabase.from("school_settings").select("*").eq("id", true).single(), "Memuat school_settings"),
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
      id: s.id, nis: s.nis, nama: s.nama, jenisKelamin: s.jenis_kelamin, kelasId: s.kelas_id, agama: s.agama || "",
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

// Identitas pencatat mengikuti sesi Supabase, bukan nilai dari formulir.
// Otorisasi siswa tetap ditegakkan oleh RLS di database.
async function requireInputUser(expectedIds) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    throw new Error("Sesi login tidak valid. Silakan keluar lalu masuk kembali.");
  }
  const userId = data.user.id;
  if (expectedIds.some((id) => id && id !== userId)) {
    throw new Error("Akun aktif telah berubah. Muat ulang halaman sebelum menyimpan.");
  }
  return userId;
}

// Recheck current religious data when saving, including drafts from an older session.
async function eligibleStudentIds(studentIds) {
  const ids = [...new Set(studentIds)];
  const eligible = new Set();
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    const rows = mustOk(await supabase.from("students").select("id,agama").in("id", batch), "Periksa peserta Tahfidz");
    if (!rows || batch.some(id => !rows.some(s => s.id === id))) {
      throw new Error("Sebagian data siswa tidak tersedia untuk akun ini. Muat ulang halaman sebelum menyimpan.");
    }
    rows.filter(isTahfidzStudent).forEach(s => eligible.add(s.id));
  }
  return eligible;
}

/* ---------- PRESENSI ---------- */
export async function saveAttendanceBatch(records) {
  if (!Array.isArray(records) || !records.length) {
    throw new Error("Tandai kehadiran minimal satu siswa.");
  }
  if (records.some((r) => !r.studentId || !r.tanggal)) {
    throw new Error("Siswa dan tanggal presensi wajib diisi.");
  }
  const userId = await requireInputUser(records.map((r) => r.inputBy));
  const eligible = await eligibleStudentIds(records.map(r => r.studentId));
  const included = records.filter(r => eligible.has(r.studentId));
  const excludedCount = records.length - included.length;
  if (!included.length) return {savedCount:0,excludedCount};
  const rows = included.map((r) => ({
    student_id: r.studentId, tanggal: r.tanggal, status: r.status, note: r.note || "", input_by: userId,
  }));
  const res = await supabase.from("attendance").upsert(rows, { onConflict: "student_id,tanggal" });
  mustOk(res, "saveAttendanceBatch");
  return {savedCount:rows.length,excludedCount};
}

export async function fetchAttendanceForDate(studentIds, tanggal) {
  const ids = [...new Set((studentIds || []).filter(Boolean))];
  if (!ids.length || !tanggal) return [];
  const res = await supabase.from("attendance").select("id,student_id,tanggal,status,note,input_by")
    .in("student_id", ids).eq("tanggal", tanggal).order("id");
  return (mustOk(res, "fetchAttendanceForDate") || []).map((a) => ({
    id:a.id, studentId:a.student_id, tanggal:a.tanggal, status:a.status, note:a.note || "", inputBy:a.input_by,
  }));
}

/* ---------- PENILAIAN ---------- */
export const GRADE_TO_NUMBER = { "A+": 95, "A": 88, "B+": 80, "B": 73, "C": 65 };

export async function insertScore(entry) {
  if (!entry.studentId || !entry.tanggal || !entry.surahId) {
    throw new Error("Siswa, tanggal, dan surat wajib diisi.");
  }
  if (!Object.prototype.hasOwnProperty.call(GRADE_TO_NUMBER, entry.nilaiHuruf)) {
    throw new Error("Pilih nilai A+, A, B+, B, atau C.");
  }
  const awal = Number(entry.ayatMulai);
  const akhir = Number(entry.ayatAkhir);
  if (!Number.isInteger(awal) || !Number.isInteger(akhir) || awal < 1 || akhir < awal) {
    throw new Error("Rentang ayat tidak valid.");
  }
  const userId = await requireInputUser([entry.inputBy]);
  const eligible = await eligibleStudentIds([entry.studentId]);
  if (!eligible.has(entry.studentId)) throw new Error("Siswa ini tidak termasuk peserta Tahfidz. Muat ulang halaman untuk memperbarui daftar siswa.");
  const res = await supabase.from("scores").insert({
    student_id: entry.studentId, tanggal: entry.tanggal, surah_id: entry.surahId,
    ayat_mulai: awal, ayat_akhir: akhir,
    nilai: GRADE_TO_NUMBER[entry.nilaiHuruf] ?? 0, nilai_huruf: entry.nilaiHuruf,
    catatan: entry.catatan || null,
    penguji: entry.penguji, input_by: userId,
  });
  mustOk(res, "insertScore");
}

// Menyimpan beberapa penilaian sekaligus untuk impor template kelas.
// Validasi otorisasi siswa tetap dilakukan di database melalui RLS dan trigger.
export async function bulkInsertScores(entries) {
  if (!Array.isArray(entries) || !entries.length) throw new Error("Tidak ada penilaian valid untuk disimpan.");
  if (entries.some((entry) => !entry.studentId || !entry.tanggal || !entry.surahId || !Object.hasOwn(GRADE_TO_NUMBER, entry.nilaiHuruf))) {
    throw new Error("Setiap baris penilaian harus memiliki siswa, tanggal, surat, dan nilai yang valid.");
  }
  if (entries.some((entry) => !Number.isInteger(Number(entry.ayatMulai)) || !Number.isInteger(Number(entry.ayatAkhir)) || Number(entry.ayatMulai) < 1 || Number(entry.ayatAkhir) < Number(entry.ayatMulai))) {
    throw new Error("Ada rentang ayat yang tidak valid pada template.");
  }
  const userId = await requireInputUser(entries.map((entry) => entry.inputBy));
  const eligible = await eligibleStudentIds(entries.map((entry) => entry.studentId));
  const included = entries.filter((entry) => eligible.has(entry.studentId));
  if (!included.length) throw new Error("Tidak ada siswa yang termasuk peserta Tahfidz.");
  const payload = included.map((entry) => ({
    student_id: entry.studentId, tanggal: entry.tanggal, surah_id: entry.surahId,
    ayat_mulai: Number(entry.ayatMulai), ayat_akhir: Number(entry.ayatAkhir),
    nilai: GRADE_TO_NUMBER[entry.nilaiHuruf], nilai_huruf: entry.nilaiHuruf,
    catatan: entry.catatan || null, penguji: entry.penguji || "", input_by: userId,
  }));
  for (let i = 0; i < payload.length; i += 500) {
    const res = await supabase.from("scores").insert(payload.slice(i, i + 500));
    mustOk(res, "bulkInsertScores");
  }
  return { savedCount: payload.length, excludedCount: entries.length - included.length };
}

// Setelah input nilai, ambil hanya riwayat siswa terkait agar tidak memuat ulang semua tabel.
export async function fetchStudentScores(studentId) {
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const res = await supabase.from("scores").select("*").eq("student_id", studentId).order("id").range(offset, offset + 499);
    const page = mustOk(res, "fetchStudentScores") || [];
    rows.push(...page);
    if (page.length < 500) break;
  }
  return rows.map((s) => ({ id:s.id, studentId:s.student_id, tanggal:s.tanggal, surahId:s.surah_id,
    ayatMulai:s.ayat_mulai, ayatAkhir:s.ayat_akhir, nilai:s.nilai, nilaiHuruf:s.nilai_huruf,
    catatan:s.catatan || "", penguji:s.penguji, inputBy:s.input_by }));
}

export async function fetchScoresForStudents(studentIds) {
  const ids = [...new Set((studentIds || []).filter(Boolean))];
  if (!ids.length) return [];
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const res = await supabase.from("scores").select("*").in("student_id", ids).order("id").range(offset, offset + 499);
    const page = mustOk(res, "fetchScoresForStudents") || [];
    rows.push(...page);
    if (page.length < 500) break;
  }
  return rows.map((s) => ({ id:s.id, studentId:s.student_id, tanggal:s.tanggal, surahId:s.surah_id,
    ayatMulai:s.ayat_mulai, ayatAkhir:s.ayat_akhir, nilai:s.nilai, nilaiHuruf:s.nilai_huruf,
    catatan:s.catatan || "", penguji:s.penguji, inputBy:s.input_by }));
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

// Import peserta secara aman: NIS yang sudah ada diperbarui, NIS baru ditambahkan.
// Kolom agama dan ID siswa tidak ikut ditulis agar data peserta/riwayat tetap terjaga.
export async function bulkUpsertStudents(rows) {
  const seen = new Set();
  for (const row of rows) {
    const nis = String(row.nis || "").trim();
    if (!nis) throw new Error("NIS wajib diisi untuk impor peserta.");
    if (seen.has(nis)) throw new Error(`NIS ${nis} muncul lebih dari sekali dalam file.`);
    seen.add(nis);
  }
  const payload = rows
    .filter((r) => String(r.nis || "").trim())
    .map((r) => ({
      nis: String(r.nis).trim(), nama: r.nama, jenis_kelamin: r.jenisKelamin || null,
      kelas_id: r.kelasId || null,
    }));
  if (!payload.length) throw new Error("Tidak ada NIS valid pada file.");
  const res = await supabase.from("students").upsert(payload, { onConflict: "nis", ignoreDuplicates: false });
  mustOk(res, "bulkUpsertStudents");
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

/* ---------- FITUR ADMIN & LAPORAN ---------- */
export async function adminResetPassword(userId, newPassword) {
  if (newPassword.length < 12 || newPassword.length > 128) throw new Error("Password harus 12–128 karakter.");
  await requireInputUser([]);
  const { data, error } = await supabase.functions.invoke("admin-reset-password", {body: {userId, newPassword}});
  if (error) {
    let message = error.message;
    if (error.context && typeof error.context.json === "function") {
      try { message = (await error.context.json()).error || message; } catch { /* respons bukan JSON */ }
    }
    throw new Error(message || "Reset password gagal.");
  }
  if (!data?.success) throw new Error(data?.error || "Reset password belum berhasil.");
}

export async function deleteScore(id) {
  if (!id) throw new Error("ID penilaian tidak tersedia.");
  await requireInputUser([]);
  const result = await supabase.from("scores").delete().eq("id", id).select("id");
  const rows = mustOk(result, "deleteScore");
  if (!rows?.length) throw new Error("Penilaian sudah dihapus atau Anda tidak memiliki izin menghapusnya.");
}

export async function fetchReportMonthSettings(month) {
  const result = await supabase.from("report_month_settings").select("report_date").eq("month", month).maybeSingle();
  return mustOk(result, "Tanggal laporan");
}

export async function saveReportMonthSettings(month, date) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Bulan dan tanggal laporan wajib valid.");
  }
  const parsed = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) throw new Error("Tanggal tidak valid.");
  const userId = await requireInputUser([]);
  const result = await supabase.from("report_month_settings").upsert({
    month, report_date: date, updated_by: userId, updated_at: new Date().toISOString(),
  }, {onConflict: "month"}).select("report_date").single();
  return mustOk(result, "Simpan tanggal laporan");
}

/* ---------- PRESENSI PENGAJAR: ADMIN INPUT, PENGAJAR MEMBACA SENDIRI ---------- */
function teacherAttendanceResult(result) {
  if (["42P01", "PGRST205"].includes(result.error?.code)) {
    throw new Error("Fitur kehadiran belum terpasang di database. Minta admin menjalankan SQL 04_kehadiran_pengajar.sql.");
  }
  return mustOk(result, "Kehadiran pengajar");
}
function teacherAttendanceRow(r) {
  return {teacherId:r.teacher_id,tanggal:r.tanggal,status:r.status,note:r.note || "",updatedAt:r.updated_at};
}
export async function fetchTeacherAttendance({from, to, teacherId}) {
  if (!validDate(from) || !validDate(to) || from > to) throw new Error("Rentang tanggal tidak valid.");
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    let query = supabase.from("teacher_attendance").select("teacher_id,tanggal,status,note,updated_at")
      .gte("tanggal",from).lte("tanggal",to).order("teacher_id").order("tanggal").range(offset,offset+499);
    if (teacherId) query = query.eq("teacher_id",teacherId);
    const page = teacherAttendanceResult(await query) || [];
    rows.push(...page.map(teacherAttendanceRow));
    if (page.length < 500) return rows;
  }
}
export async function saveTeacherAttendance(records) {
  if (!Array.isArray(records) || !records.length) throw new Error("Belum ada perubahan kehadiran.");
  const keys = new Set();
  records.forEach((r) => {
    if (!r.teacherId || !validDate(r.tanggal) || !Object.hasOwn(TEACHER_STATUSES,r.status)) throw new Error("Pengajar, tanggal, dan status kehadiran wajib valid.");
    if (typeof (r.note ?? "") !== "string" || (r.note || "").trim().length > 500) throw new Error("Catatan maksimal 500 karakter.");
    const key = `${r.teacherId}:${r.tanggal}`;
    if (keys.has(key)) throw new Error("Pengajar dan tanggal yang sama tidak boleh dikirim dua kali.");
    keys.add(key);
  });
  const userId = await requireInputUser([]);
  const profile = mustOk(await supabase.from("profiles").select("role,status").eq("id",userId).single(), "Profil admin");
  if (profile?.role !== "admin" || profile?.status !== "aktif") throw new Error("Hanya admin aktif yang dapat mengisi kehadiran pengajar.");
  const payload = records.map((r) => ({teacher_id:r.teacherId,tanggal:r.tanggal,status:r.status,note:(r.note || "").trim(),input_by:userId}));
  const rows = teacherAttendanceResult(await supabase.from("teacher_attendance")
    .upsert(payload,{onConflict:"teacher_id,tanggal"}).select("teacher_id,tanggal,status,note,updated_at"));
  if (!rows || rows.length !== payload.length) throw new Error("Hasil simpan belum dapat dipastikan. Muat ulang presensi sebelum mencoba lagi.");
  return rows.map(teacherAttendanceRow);
}

export async function updateStudentReligion(studentId, agama) {
  const allowed = ["", "Islam", "Kristen", "Katolik", "Hindu", "Buddha", "Konghucu", "Kepercayaan"];
  if (!studentId || !allowed.includes(agama)) throw new Error("Pilihan agama tidak valid.");
  const result = await supabase.from("students").update({agama: agama || null}).eq("id", studentId).select("id");
  const rows = mustOk(result, "Simpan agama siswa");
  if (rows?.length !== 1) throw new Error("Perubahan belum tersimpan. Periksa akses admin dan muat ulang halaman.");
}

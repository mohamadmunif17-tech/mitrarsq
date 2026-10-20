import { supabase } from "./supabaseClient.js";

const MIGRATION_HELP = "Fitur tahun pelajaran belum terpasang. Jalankan seluruh SQL 10_tahun_pelajaran.sql di Supabase SQL Editor, lalu muat ulang.";
const mapYear = (r) => ({ id: r.id, nama: r.nama, startsOn: r.starts_on, endsOn: r.ends_on, status: r.status, legacyReviewPending: !!r.legacy_review_pending });
const mapEnrollment = (r) => ({ id: r.id, studentId: r.student_id, classId: r.class_id, yearId: r.academic_year_id, academicYearId: r.academic_year_id, startsOn: r.starts_on, endsOn: r.ends_on, status: r.status, inferred: !!r.inferred });
const mapClass = (r) => ({ id: r.id, nama: r.nama, teacherId: r.teacher_id, yearId: r.academic_year_id, academicYearId: r.academic_year_id, tingkat: r.tingkat || "", jurusan: r.jurusan || "", rombel: r.rombel || "" });

async function request(query, label) {
  let timer;
  try {
    const result = await Promise.race([Promise.resolve(query), new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} belum merespons setelah 20 detik. Periksa koneksi; muat ulang data sebelum mengulangi penyimpanan.`)), 20000);
    })]);
    if (result.error) {
      if (["42P01", "42703", "42883", "PGRST202", "PGRST204", "PGRST205"].includes(result.error.code)) throw new Error(MIGRATION_HELP);
      throw new Error(`${label}: ${result.error.message || "Permintaan gagal"}`);
    }
    return result.data;
  } finally { clearTimeout(timer); }
}

async function allRows(table, columns, order) {
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const part = await request(supabase.from(table).select(columns).order(order).order("id").range(offset, offset + 499), `Memuat ${table}`);
    rows.push(...(part || []));
    if (!part || part.length < 500) return rows;
  }
}

export async function fetchAcademicData() {
  const [years, enrollments, legacy] = await Promise.all([
    allRows("academic_years", "id,nama,starts_on,ends_on,status,legacy_review_pending", "starts_on"),
    allRows("student_enrollments", "id,student_id,class_id,academic_year_id,starts_on,ends_on,status,inferred", "starts_on"),
    request(supabase.rpc("academic_legacy_summary"), "Memuat pemetaan data lama"),
  ]);
  const summary = Array.isArray(legacy) ? legacy[0] : legacy;
  return { years: years.map(mapYear), enrollments: enrollments.map(mapEnrollment), legacySummary: {
    unassignedAttendance: Number(summary?.unassigned_attendance || 0),
    unassignedScores: Number(summary?.unassigned_scores || 0),
    unassignedJournals: Number(summary?.unassigned_journals || 0),
    inferredEnrollments: Number(summary?.inferred_enrollments || 0),
  } };
}

function validDate(value, label) {
  const date = new Date(`${value}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "") || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error(`${label} tidak valid.`);
  return value;
}
function required(value, label) {
  const result = String(value || "").trim();
  if (!result) throw new Error(`${label} wajib diisi.`);
  return result;
}
const one = (value) => Array.isArray(value) ? value[0] : value;

export async function createAcademicYear({ nama, startsOn, endsOn, copyYearId = null }) {
  validDate(startsOn, "Tanggal mulai"); validDate(endsOn, "Tanggal selesai");
  if (endsOn < startsOn) throw new Error("Tanggal selesai harus setelah tanggal mulai.");
  const lastDay = new Date(Date.UTC(Number(endsOn.slice(0, 4)), Number(endsOn.slice(5, 7)), 0)).toISOString().slice(0, 10);
  if (!startsOn.endsWith("-01") || endsOn !== lastDay) throw new Error("Periode harus dimulai tanggal 1 dan berakhir pada hari terakhir bulan agar laporan bulanan dapat disimpan.");
  return mapYear(one(await request(supabase.rpc("academic_create_year", { p_nama: required(nama, "Nama tahun pelajaran"), p_starts_on: startsOn, p_ends_on: endsOn, p_copy_year_id: copyYearId || null }), "Membuat tahun pelajaran")));
}
export async function activateAcademicYear(yearId) {
  return request(supabase.rpc("academic_activate_year", { p_year_id: required(yearId, "Tahun pelajaran") }), "Mengaktifkan tahun pelajaran");
}
export async function createAcademicClass({ yearId, nama, tingkat = "", jurusan = "", rombel = "", teacherId = null }) {
  return mapClass(one(await request(supabase.rpc("academic_create_class", { p_year_id: required(yearId, "Tahun pelajaran"), p_nama: required(nama, "Nama kelas"), p_tingkat: tingkat.trim(), p_jurusan: jurusan.trim(), p_rombel: rombel.trim(), p_teacher_id: teacherId || null }), "Membuat kelas")));
}
export async function updateAcademicClass({ classId, nama, tingkat = "", jurusan = "", rombel = "", teacherId = null }) {
  const payload = { p_class_id: required(classId, "Kelas"), p_nama: required(nama, "Nama kelas"), p_tingkat: tingkat.trim(), p_jurusan: jurusan.trim(), p_rombel: rombel.trim(), p_teacher_id: teacherId || null };
  let row;
  try { row = one(await request(supabase.rpc("academic_update_class", payload), "Memperbarui kelas")); }
  catch (error) {
    if (/Nama, struktur, dan pengajarnya dikunci/i.test(error.message)) throw new Error("Database masih mengunci pergantian pengajar. Jalankan SQL 12_perbaikan_pengajar_kelas.sql di Supabase, lalu coba simpan kembali.");
    throw error;
  }
  if (!row || row.id !== payload.p_class_id || (row.teacher_id || null) !== payload.p_teacher_id
    || row.nama !== payload.p_nama || (row.tingkat || "") !== payload.p_tingkat
    || (row.jurusan || "") !== payload.p_jurusan || (row.rombel || "") !== payload.p_rombel) {
    throw new Error("Hasil perubahan kelas belum dapat dipastikan. Muat ulang data kelas dan periksa pengajarnya sebelum menyimpan ulang.");
  }
  return mapClass(row);
}
export async function placeAcademicStudents({ yearId, studentIds, classId, effectiveDate, status = "aktif" }) {
  if (!Array.isArray(studentIds) || !studentIds.length) throw new Error("Pilih setidaknya satu siswa.");
  validDate(effectiveDate, "Tanggal berlaku");
  return request(supabase.rpc("academic_place_students", { p_year_id: required(yearId, "Tahun pelajaran"), p_student_ids: [...new Set(studentIds)], p_class_id: required(classId, "Kelas tujuan"), p_effective_date: effectiveDate, p_status: status }), "Menempatkan siswa");
}
export async function closeAcademicStudents({ yearId, studentIds, effectiveDate, status }) {
  if (!Array.isArray(studentIds) || !studentIds.length) throw new Error("Pilih setidaknya satu siswa.");
  if (!["lulus", "keluar"].includes(status)) throw new Error("Status penutupan tidak valid.");
  validDate(effectiveDate, "Tanggal berlaku");
  return request(supabase.rpc("academic_close_students", { p_year_id: required(yearId, "Tahun pelajaran"), p_student_ids: [...new Set(studentIds)], p_effective_date: effectiveDate, p_status: status }), "Menutup penempatan siswa");
}
export async function reviewAcademicLegacy(yearId) {
  return request(supabase.rpc("academic_review_legacy", { p_year_id: required(yearId, "Tahun pelajaran") }), "Mengonfirmasi pemeriksaan data lama");
}
export async function importAcademicStudents({ yearId, effectiveDate, rows }) {
  validDate(effectiveDate, "Tanggal berlaku");
  if (!Array.isArray(rows) || !rows.length || rows.length > 2000) throw new Error("Impor harus berisi 1–2000 siswa per proses.");
  const payload = rows.map((r) => ({ nis: required(r.nis, "NIS"), nama: required(r.nama, "Nama siswa"), jenis_kelamin: r.jenisKelamin || r.jenis_kelamin || null, class_id: r.kelasId || r.classId || null }));
  return request(supabase.rpc("academic_import_students", { p_year_id: required(yearId, "Tahun pelajaran"), p_effective_date: effectiveDate, p_rows: payload }), "Mengimpor identitas dan penempatan siswa");
}

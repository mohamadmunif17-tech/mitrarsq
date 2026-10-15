// Rekap dibangun dalam satu lintasan data agar daftar kelas besar tetap ringan.
// Seluruh siswa tetap muncul, termasuk yang belum memiliki setoran / presensi.
export function buildStudentRecap({ students, scores, attendance, classes, surahs, period }) {
  const classNames = new Map(classes.map((item) => [item.id, item.nama]));
  const surahNames = new Map(surahs.map((item) => [item.id, item.nama]));
  const groups = new Map(students.map((student) => [student.id, {
    studentId: student.id, nama: student.nama, nis: student.nis || "-",
    kelas: student.academicClassLabel || classNames.get(student.kelasId) || "-",
    counts: { HADIR: 0, SAKIT: 0, IZIN: 0, ALPHA: 0 },
    attendanceCount: 0, scores: [], totalAyat: 0, numericScores: [],
  }]));
  const matchesPeriod = (record) => !period || String(record.tanggal || "").slice(0, 7) === period;
  for (const record of attendance) {
    const group = groups.get(record.studentId);
    if (!group || !matchesPeriod(record)) continue;
    group.attendanceCount += 1;
    group.counts[record.status] = (group.counts[record.status] || 0) + 1;
  }
  for (const record of scores) {
    const group = groups.get(record.studentId);
    if (!group || !matchesPeriod(record)) continue;
    group.scores.push(record);
    const start = Number(record.ayatMulai), end = Number(record.ayatAkhir);
    if (Number.isFinite(start) && Number.isFinite(end) && start > 0 && end >= start) group.totalAyat += end - start + 1;
    const numericScore = Number(record.nilai);
    if (record.nilai !== null && record.nilai !== "" && record.nilai !== undefined && Number.isFinite(numericScore)) group.numericScores.push(numericScore);
  }
  return Array.from(groups.values()).map((group) => {
    group.scores.sort((a, b) => String(a.tanggal).localeCompare(String(b.tanggal)) || String(a.id).localeCompare(String(b.id)));
    return {
      ...group,
      setoranCount: group.scores.length,
      averageScore: group.numericScores.length ? Math.round(group.numericScores.reduce((sum, value) => sum + value, 0) / group.numericScores.length * 10) / 10 : null,
      setoranSummary: group.scores.length ? group.scores.map((score) => `${String(score.tanggal).slice(8, 10)}/${String(score.tanggal).slice(5, 7)} ${surahNames.get(score.surahId) || "-"} ${score.ayatMulai}-${score.ayatAkhir} (${score.nilaiHuruf || score.nilai || "-"})`).join("; ") : "Belum ada setoran",
    };
  });
}

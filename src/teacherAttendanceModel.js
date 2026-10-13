export const TEACHER_STATUSES = {
  HADIR: { label: "Hadir", tone: "present" },
  SAKIT: { label: "Sakit", tone: "sick" },
  IZIN: { label: "Izin", tone: "permission" },
  ALPHA: { label: "Alpha", tone: "absent" },
};

export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function monthBounds(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Bulan tidak valid.");
  const [year, mon] = month.split("-").map(Number);
  return { from: `${month}-01`, to: `${month}-${new Date(year, mon, 0).getDate()}` };
}

export function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function attendanceSummary(records) {
  const counts = { HADIR: 0, SAKIT: 0, IZIN: 0, ALPHA: 0 };
  records.forEach((r) => { if (Object.hasOwn(counts, r.status)) counts[r.status]++; });
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return { counts, total, percent: total ? Math.round(counts.HADIR / total * 100) : null };
}

// Only changed, explicitly marked teachers are submitted. Unmarked teachers stay unrecorded.
export function changedAttendance(teachers, baseline, draft, tanggal) {
  return teachers.flatMap((teacher) => {
    const next = draft[teacher.id];
    if (!next?.status) return [];
    const previous = baseline[teacher.id];
    const note = (next.note || "").trim();
    if (previous?.status === next.status && (previous?.note || "").trim() === note) return [];
    return [{ teacherId: teacher.id, tanggal, status: next.status, note }];
  });
}

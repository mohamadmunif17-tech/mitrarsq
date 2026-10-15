// Academic membership is historical. Never derive an activity's class from a
// student's current kelasId: activities carry their own immutable membership.
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value) {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validYear(year) {
  return !!year && validDate(year.startsOn) && validDate(year.endsOn) && year.startsOn <= year.endsOn;
}

function todayInJakarta() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function clampDate(date, year) {
  return date < year.startsOn ? year.startsOn : date > year.endsOn ? year.endsOn : date;
}

/** Explicit selection wins; otherwise prefer the active year, then the latest. */
export function selectedAcademicYear(db, id) {
  const years = (db.academicYears || []).filter(validYear);
  const chosen = years.find((year) => year.id === id);
  if (chosen) return chosen;
  const ordered = [...years].sort((a, b) => b.startsOn.localeCompare(a.startsOn) || String(b.id).localeCompare(String(a.id)));
  return ordered.find((year) => year.status === "active") || ordered[0] || null;
}

export function dateInAcademicYear(date, year) {
  return validDate(date) && validYear(year) && date >= year.startsOn && date <= year.endsOn;
}

export function canWriteAcademicYear(year) {
  return validYear(year) && year.status === "active";
}

/** Month keys, inclusive, including a partial opening or closing month. */
export function yearMonthOptions(year) {
  if (!validYear(year)) return [];
  const [firstYear, firstMonth] = year.startsOn.slice(0, 7).split("-").map(Number);
  const [lastYear, lastMonth] = year.endsOn.slice(0, 7).split("-").map(Number);
  const months = [];
  for (let value = firstYear * 12 + firstMonth - 1; value <= lastYear * 12 + lastMonth - 1; value += 1) {
    months.push(`${String(Math.floor(value / 12)).padStart(4, "0")}-${String(value % 12 + 1).padStart(2, "0")}`);
  }
  return months;
}

/**
 * Project a DB snapshot without mutating identities or source collections.
 *
 * With fromDate/toDate, the roster contains all memberships overlapping that
 * inclusive range. Without a range, the roster is the membership at asOf (or
 * today in Jakarta), clamped to the selected year's boundaries. Activity uses
 * the whole year unless a range is supplied, and must retain an explicit,
 * matching year/class/enrollment snapshot. Invalid or unmapped data is excluded.
 */
export function projectAcademicData(db, yearId, {
  asOf = null, fromDate = null, toDate = null, classId = "all",
} = {}) {
  const year = selectedAcademicYear(db, yearId);
  const empty = {
    ...db, selectedYear: year, selectedAcademicYear: year, academicYear: year,
    classes: [], students: [], attendance: [], scores: [], academicEnrollments: [],
  };
  if (!year) return empty;

  const ranged = fromDate !== null || toDate !== null;
  if ((fromDate !== null && !validDate(fromDate)) || (toDate !== null && !validDate(toDate)) ||
      (asOf !== null && !validDate(asOf))) return empty;
  const rangeStart = fromDate || year.startsOn;
  const rangeEnd = toDate || year.endsOn;
  const activityStart = rangeStart < year.startsOn ? year.startsOn : rangeStart;
  const activityEnd = rangeEnd > year.endsOn ? year.endsOn : rangeEnd;
  if (rangeStart > rangeEnd || activityStart > activityEnd) return empty;
  const referenceDate = clampDate(asOf || todayInJakarta(), year);
  const rosterStart = ranged ? activityStart : referenceDate;
  const rosterEnd = ranged ? activityEnd : referenceDate;
  const selectedClasses = (db.classes || []).filter((item) => item.academicYearId === year.id);
  const classesById = new Map(selectedClasses.map((item) => [item.id, item]));
  const scopedClass = classId && classId !== "all" ? classId : null;
  const studentsById = new Map((db.students || []).map((student) => [student.id, student]));

  const validMemberships = (db.enrollments || []).filter((entry) => {
    if (entry.yearId !== year.id || !studentsById.has(entry.studentId) || !classesById.has(entry.classId)) return false;
    if (!dateInAcademicYear(entry.startsOn, year)) return false;
    if (entry.endsOn !== null && entry.endsOn !== undefined && entry.endsOn !== "" && !dateInAcademicYear(entry.endsOn, year)) return false;
    return !entry.endsOn || entry.startsOn <= entry.endsOn;
  });
  const membershipById = new Map(validMemberships.map((entry) => [entry.id, entry]));
  const academicEnrollments = validMemberships.filter((entry) =>
    (!scopedClass || entry.classId === scopedClass) && entry.startsOn <= rosterEnd && (entry.endsOn || year.endsOn) >= rosterStart,
  );
  const membershipsByStudent = new Map();
  for (const entry of academicEnrollments) {
    const entries = membershipsByStudent.get(entry.studentId) || [];
    entries.push(entry);
    membershipsByStudent.set(entry.studentId, entries);
  }
  const students = (db.students || []).filter((student) => membershipsByStudent.has(student.id)).map((student) => {
    const entries = [...membershipsByStudent.get(student.id)].sort((a, b) => a.startsOn.localeCompare(b.startsOn) || String(a.id).localeCompare(String(b.id)));
    const chosen = entries[entries.length - 1];
    const names = [...new Set(entries.map((entry) => classesById.get(entry.classId).nama))];
    return {
      ...student, kelasId: chosen.classId, academicYearId: year.id, academicEnrollmentId: chosen.id,
      academicEnrollments: entries,
      ...(names.length > 1 ? { academicClassLabel: names.join(" → ") } : {}),
    };
  });
  const filterActivity = (records) => (records || []).filter((record) => {
    if (record.academicYearId !== year.id || !validDate(record.tanggal) || record.tanggal < activityStart || record.tanggal > activityEnd) return false;
    if (!record.classId || !record.enrollmentId || (scopedClass && record.classId !== scopedClass)) return false;
    const membership = membershipById.get(record.enrollmentId);
    return !!membership && membership.studentId === record.studentId && membership.classId === record.classId &&
      membership.startsOn <= record.tanggal && (membership.endsOn || year.endsOn) >= record.tanggal;
  });
  return {
    ...db, selectedYear: year, selectedAcademicYear: year, academicYear: year,
    classes: selectedClasses.filter((item) => !scopedClass || item.id === scopedClass),
    students, attendance: filterActivity(db.attendance), scores: filterActivity(db.scores), academicEnrollments,
    academicProjection: { fromDate: activityStart, toDate: activityEnd, asOf: referenceDate, ranged },
  };
}

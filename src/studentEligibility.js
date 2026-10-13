// Only explicitly supplied religious data excludes a student. Unknown is not inferred as Islam.
export function isTahfidzStudent(student) {
  const religion = String(student.agama || "").trim().toLowerCase();
  return !religion || religion === "islam";
}
export function tahfidzData(db) {
  const students = db.students.filter(isTahfidzStudent);
  const ids = new Set(students.map(s => s.id));
  return {...db, students, excludedStudentCount: db.students.length - students.length,
    unknownReligionCount: students.filter(s => !String(s.agama || "").trim()).length,
    attendance: db.attendance.filter(r => ids.has(r.studentId)), scores: db.scores.filter(r => ids.has(r.studentId))};
}

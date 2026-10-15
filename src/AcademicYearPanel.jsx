import React, { useEffect, useMemo, useState } from "react";
import {
  activateAcademicYear, closeAcademicStudents, createAcademicClass, createAcademicYear,
  placeAcademicStudents, reviewAcademicLegacy, updateAcademicClass,
} from "./academicYearApi.js";
import "./academicYear.css";

const statusLabels = { draft: "Persiapan", active: "Aktif", archived: "Arsip" };
const enrollmentLabels = { aktif: "Aktif", lulus: "Lulus", keluar: "Keluar", pindah: "Pindah" };
const emptyClass = { nama: "", tingkat: "", jurusan: "", rombel: "", teacherId: "" };
const PAGE_SIZE = 50;

function todayJakarta() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function displayDate(value) {
  if (!validDate(value)) return "—";
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
function yearSort(a, b) { return String(b.startsOn || "").localeCompare(String(a.startsOn || "")); }
function nextYearDefaults(years) {
  const latest = [...years].sort(yearSort)[0];
  const start = latest?.startsOn ? Number(latest.startsOn.slice(0, 4)) + 1 : 2027;
  return { nama: `${start}/${start + 1}`, startsOn: `${start}-07-01`, endsOn: `${start + 1}-06-30`, copyYearId: latest?.id || "" };
}
function dateForYear(year) {
  const today = todayJakarta();
  return year && today >= year.startsOn && today <= year.endsOn ? today : year?.startsOn || today;
}
function followingDay(value) {
  if (!validDate(value)) return "";
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function AcademicYearSelector({ years = [], value, onChange, disabled = false }) {
  const sorted = [...years].sort(yearSort);
  return <label className="ay-selector">
    <span>Tahun pelajaran</span>
    <select value={value || ""} disabled={disabled || !sorted.length} onChange={(event) => onChange?.(event.target.value)}>
      {!value && <option value="">Pilih tahun pelajaran</option>}
      {sorted.map((year) => <option key={year.id} value={year.id}>{year.nama} · {statusLabels[year.status] || year.status}</option>)}
    </select>
  </label>;
}

export default function AcademicYearPanel({ db, user, selectedYearId, onYearChange, refresh }) {
  const years = db.academicYears || [];
  const allClasses = db.classes || [];
  const students = db.students || [];
  const enrollments = db.enrollments || [];
  const teachers = db.teachers || [];
  const year = years.find((item) => item.id === selectedYearId) || years.find((item) => item.status === "active") || [...years].sort(yearSort)[0];
  const yearId = year?.id || "";
  const readOnly = !year || year.status === "archived";
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState(null);
  const [newYear, setNewYear] = useState(() => nextYearDefaults(years));
  const [classForm, setClassForm] = useState({ ...emptyClass });
  const [editingClassId, setEditingClassId] = useState("");
  const [selected, setSelected] = useState([]);
  const [targetClass, setTargetClass] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(() => dateForYear(year));
  const [closeStatus, setCloseStatus] = useState("lulus");
  const [search, setSearch] = useState("");
  const [placementFilter, setPlacementFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [page, setPage] = useState(1);

  const classes = useMemo(() => allClasses.filter((item) => item.academicYearId === yearId).sort((a, b) => (a.nama || "").localeCompare(b.nama || "", "id", { numeric: true })), [allClasses, yearId]);
  const classMap = useMemo(() => new Map(allClasses.map((item) => [item.id, item])), [allClasses]);
  const yearMap = useMemo(() => new Map(years.map((item) => [item.id, item])), [years]);
  const teacherMap = useMemo(() => new Map(teachers.map((item) => [item.id, item.nama])), [teachers]);
  const studentHistories = useMemo(() => {
    const result = new Map();
    enrollments.forEach((item) => { if (!result.has(item.studentId)) result.set(item.studentId, []); result.get(item.studentId).push(item); });
    result.forEach((items) => items.sort((a, b) => String(b.startsOn || "").localeCompare(String(a.startsOn || "")) || String(b.id).localeCompare(String(a.id))));
    return result;
  }, [enrollments]);
  const roster = useMemo(() => students.map((student) => {
    const history = studentHistories.get(student.id) || [];
    const yearHistory = history.filter((item) => item.yearId === yearId);
    return { student, history, yearHistory, enrollment: yearHistory[0], previous: history.find((item) => item.yearId !== yearId && (!year || item.startsOn < year.startsOn)) };
  }).sort((a, b) => (a.student.nama || "").localeCompare(b.student.nama || "", "id")), [students, studentHistories, yearId, year]);
  const activeRows = roster.filter((row) => row.enrollment?.status === "aktif");
  const filtered = roster.filter(({ student, enrollment }) => {
    const matches = `${student.nama || ""} ${student.nis || ""}`.toLocaleLowerCase("id").includes(search.trim().toLocaleLowerCase("id"));
    const placementMatches = placementFilter === "all" || (placementFilter === "unplaced" ? !enrollment : placementFilter === "placed" ? !!enrollment : enrollment?.status === placementFilter);
    return matches && placementMatches && (classFilter === "all" || enrollment?.classId === classFilter);
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visibleRows = filtered.slice((Math.min(page, pageCount) - 1) * PAGE_SIZE, Math.min(page, pageCount) * PAGE_SIZE);
  const selectedSet = new Set(selected);
  const allVisibleSelected = visibleRows.length > 0 && visibleRows.every(({ student }) => selectedSet.has(student.id));
  const unplacedCount = roster.filter((row) => !row.enrollment).length;
  const unmappedEntries = ["unassignedAttendance", "unassignedScores", "unassignedJournals"]
    .map((key) => [key, db.academicUnmapped?.[key]])
    .filter(([, value]) => Number.isFinite(Number(value)) && Number(value) > 0);
  const unmappedTotal = unmappedEntries.reduce((total, [, value]) => total + Number(value), 0);

  useEffect(() => {
    setSelected([]); setTargetClass(""); setEffectiveDate(dateForYear(year));
    setEditingClassId(""); setClassForm({ ...emptyClass }); setClassFilter("all"); setPlacementFilter("all"); setPage(1); setMessage(null);
  }, [yearId]);
  useEffect(() => { setPage(1); }, [search, placementFilter, classFilter]);

  if (user?.role !== "admin") return <div className="ay-panel"><p role="alert">Pengaturan tahun pelajaran hanya tersedia untuk admin.</p></div>;

  async function run(action, work) {
    if (busy) return;
    setBusy(action); setMessage(null);
    try { await work(); }
    catch (error) { setMessage({ type: "error", text: error?.message || "Perubahan belum dapat disimpan. Silakan coba lagi." }); }
    finally { setBusy(""); }
  }
  function checkEffectiveDate(allowFollowingDay = false) {
    const finalDate = allowFollowingDay ? followingDay(year.endsOn) : year.endsOn;
    if (!validDate(effectiveDate) || effectiveDate < year.startsOn || effectiveDate > finalDate) throw new Error(allowFollowingDay ? "Tanggal lulus atau keluar harus berada dalam tahun pelajaran atau satu hari setelah tahun berakhir." : "Tanggal penempatan harus berada di dalam tahun pelajaran yang dipilih.");
  }
  async function submitYear(event) {
    event.preventDefault();
    await run("year", async () => {
      const nama = newYear.nama.trim();
      if (!nama) throw new Error("Isi nama tahun pelajaran.");
      if (!validDate(newYear.startsOn) || !validDate(newYear.endsOn) || newYear.startsOn > newYear.endsOn) throw new Error("Periksa tanggal mulai dan tanggal selesai tahun pelajaran.");
      const end = new Date(`${newYear.endsOn}T00:00:00Z`);
      const finalDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
      if (!newYear.startsOn.endsWith("-01") || end.getUTCDate() !== finalDay) throw new Error("Tahun pelajaran harus dimulai pada tanggal 1 dan berakhir pada hari terakhir bulan agar laporan bulanan tetap sesuai.");
      if (years.some((item) => item.nama.trim().toLowerCase() === nama.toLowerCase())) throw new Error("Nama tahun pelajaran sudah digunakan.");
      if (years.some((item) => newYear.startsOn <= item.endsOn && newYear.endsOn >= item.startsOn)) throw new Error("Periode ini bertumpang tindih dengan tahun pelajaran yang sudah ada.");
      const created = await createAcademicYear({ ...newYear, nama, copyYearId: newYear.copyYearId || null });
      await refresh();
      const createdId = created?.id || created?.yearId || (typeof created === "string" ? created : null);
      if (createdId) onYearChange?.(createdId);
      const nextStart = Number(newYear.startsOn.slice(0, 4)) + 1;
      setNewYear({ nama: `${nextStart}/${nextStart + 1}`, startsOn: `${nextStart}-07-01`, endsOn: `${nextStart + 1}-06-30`, copyYearId: createdId || "" });
      setMessage({ type: "success", text: "Tahun pelajaran dibuat dalam status persiapan. Atur kelas dan penempatan siswa sebelum mengaktifkannya." });
    });
  }
  async function submitClass(event) {
    event.preventDefault();
    if (readOnly) return;
    await run("class", async () => {
      const data = Object.fromEntries(Object.entries(classForm).map(([key, value]) => [key, String(value || "").trim()]));
      if (!data.nama) throw new Error("Isi nama kelas atau rombel.");
      if (classes.some((item) => item.id !== editingClassId && (item.nama || "").trim().toLowerCase() === data.nama.toLowerCase())) throw new Error("Nama kelas ini sudah digunakan pada tahun pelajaran yang dipilih.");
      data.teacherId = data.teacherId || null;
      if (editingClassId) await updateAcademicClass({ ...data, classId: editingClassId });
      else await createAcademicClass({ ...data, yearId });
      await refresh(); setEditingClassId(""); setClassForm({ ...emptyClass });
      setMessage({ type: "success", text: editingClassId ? "Data kelas berhasil diperbarui." : "Kelas berhasil ditambahkan." });
    });
  }
  async function placeStudents() {
    if (readOnly) return;
    await run("placement", async () => {
      if (!selected.length) throw new Error("Pilih minimal satu siswa.");
      if (!classes.some((item) => item.id === targetClass)) throw new Error("Pilih kelas tujuan pada tahun pelajaran ini.");
      checkEffectiveDate();
      const destination = classMap.get(targetClass)?.nama || "kelas tujuan";
      if (!window.confirm(`Tempatkan ${selected.length} siswa ke ${destination}, tahun ${year.nama}, mulai ${displayDate(effectiveDate)}? Riwayat kelas sebelumnya tetap tersimpan.`)) return;
      await placeAcademicStudents({ yearId, studentIds: selected, classId: targetClass, effectiveDate, status: "aktif" });
      await refresh(); setSelected([]);
      setMessage({ type: "success", text: "Penempatan siswa berhasil disimpan. Riwayat kegiatan sebelumnya tetap mengikuti kelas pada waktunya." });
    });
  }
  async function closeStudents() {
    if (readOnly) return;
    await run("closing", async () => {
      if (!selected.length) throw new Error("Pilih minimal satu siswa.");
      if (selected.some((id) => !activeRows.some((row) => row.student.id === id))) throw new Error("Kelulusan atau keluar hanya dapat diterapkan pada siswa berstatus aktif pada tahun pelajaran ini.");
      checkEffectiveDate(true);
      if (!window.confirm(`Tandai ${selected.length} siswa sebagai ${closeStatus === "lulus" ? "lulus" : "keluar"} mulai ${displayDate(effectiveDate)}? Tanggal ini adalah hari pertama siswa tidak lagi mengikuti pembelajaran. Data dan riwayat sebelumnya tetap tersimpan.`)) return;
      await closeAcademicStudents({ yearId, studentIds: selected, effectiveDate, status: closeStatus });
      await refresh(); setSelected([]);
      setMessage({ type: "success", text: `Status ${closeStatus} berhasil disimpan.` });
    });
  }
  async function activate() {
    if (readOnly || year.status === "active") return;
    await run("activate", async () => {
      if (!window.confirm(`Aktifkan tahun pelajaran ${year.nama}?\n\nPeriode: ${displayDate(year.startsOn)}–${displayDate(year.endsOn)}\nKelas: ${classes.length}\nSiswa aktif: ${activeRows.length}\nBelum ditempatkan: ${unplacedCount}\n\nTahun aktif sebelumnya akan menjadi arsip. Periksa kelas, pengajar, dan penempatan siswa sebelum melanjutkan.`)) return;
      await activateAcademicYear(yearId); await refresh();
      setMessage({ type: "success", text: `Tahun pelajaran ${year.nama} sekarang aktif.` });
    });
  }
  async function confirmLegacy() {
    if (readOnly) return;
    await run("review", async () => {
      if (!window.confirm(`Konfirmasi bahwa Anda sudah memeriksa kelas siswa dan pemetaan kegiatan lama untuk ${year.nama}.\n\nKelas awal diambil dari data kelas yang tersedia saat pembaruan. Riwayat perpindahan yang dahulu tidak dicatat perlu diperiksa secara terpisah. Kegiatan di luar periode tetap perlu dipetakan.\n\nTandai pemeriksaan awal selesai?`)) return;
      await reviewAcademicLegacy(yearId); await refresh();
      setMessage({ type: "success", text: "Pemeriksaan awal ditandai selesai. Kegiatan yang belum terpetakan tetap perlu ditinjau." });
    });
  }
  function toggleStudent(id) { setSelected((previous) => previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id]); }
  function toggleVisible() {
    const ids = visibleRows.map(({ student }) => student.id);
    setSelected((previous) => allVisibleSelected ? previous.filter((id) => !ids.includes(id)) : [...new Set([...previous, ...ids])]);
  }

  return <div className="ay-panel" aria-busy={!!busy}>
    <div className="ay-heading"><div><h2>Tahun Pelajaran</h2><p>Atur kelas, pengajar, dan penempatan siswa untuk setiap tahun pelajaran.</p></div><AcademicYearSelector years={years} value={yearId} onChange={onYearChange} disabled={!!busy} /></div>
    {message && <div className={`ay-notice ay-${message.type}`} role={message.type === "error" ? "alert" : "status"}>{message.text}</div>}
    {!year && <div className="ay-notice">Belum ada tahun pelajaran. Buat tahun pelajaran untuk mulai menata kelas.</div>}
    {year && <section className="ay-card">
      <div className="ay-heading"><div><h3>{year.nama} <span className={`ay-badge ay-status-${year.status}`}>{statusLabels[year.status] || year.status}</span></h3><p>{displayDate(year.startsOn)}–{displayDate(year.endsOn)}</p></div>{year.status === "draft" && <button type="button" className="ay-button ay-primary" disabled={!!busy} onClick={activate}>{busy === "activate" ? "Mengaktifkan…" : "Aktifkan tahun pelajaran"}</button>}</div>
      <div className="ay-metrics"><div><strong>{classes.length}</strong><span>Kelas / rombel</span></div><div><strong>{activeRows.length}</strong><span>Siswa aktif</span></div><div><strong>{unplacedCount}</strong><span>Belum ditempatkan</span></div></div>
      {readOnly && <p className="ay-note">Tahun ini telah diarsipkan. Data dapat dilihat; perubahan kelas dan penempatan siswa dinonaktifkan.</p>}
      {year.legacyReviewPending && <div className="ay-notice ay-warning"><strong>Periksa pemetaan data awal</strong><p>Penempatan awal menggunakan kelas yang tercatat saat pembaruan. Periksa daftar siswa dan laporan lama sebelum menyatakan pemetaan sesuai. Perpindahan yang sebelumnya belum dicatat tidak dapat dipastikan otomatis.</p><button type="button" className="ay-button" disabled={!!busy || readOnly} onClick={confirmLegacy}>{busy === "review" ? "Menyimpan…" : "Konfirmasi pemeriksaan awal selesai"}</button></div>}
      {unmappedTotal > 0 && <div className="ay-notice ay-warning"><strong>{unmappedTotal} catatan kegiatan belum terpetakan</strong><p>Ada catatan tanpa tahun pelajaran atau di luar periode awal. Periksa tanggal dan kelas catatan tersebut sebelum memasukkannya ke laporan tahunan. Catatan ini tetap disimpan.</p></div>}
    </section>}

    <details className="ay-card"><summary>Buat tahun pelajaran baru</summary><p className="ay-note">Salin struktur kelas sebagai titik awal. Penempatan siswa dan catatan kegiatan ditentukan untuk tahun baru. Periode dimulai tanggal 1 dan berakhir pada hari terakhir bulan.</p>
      <form onSubmit={submitYear}><fieldset disabled={!!busy}><div className="ay-form-grid">
        <label>Nama tahun pelajaran<input value={newYear.nama} maxLength={30} required placeholder="2027/2028" onChange={(event) => setNewYear({ ...newYear, nama: event.target.value })} /></label>
        <label>Tanggal mulai<input type="date" value={newYear.startsOn} required onChange={(event) => setNewYear({ ...newYear, startsOn: event.target.value })} /></label>
        <label>Tanggal selesai<input type="date" value={newYear.endsOn} min={newYear.startsOn} required onChange={(event) => setNewYear({ ...newYear, endsOn: event.target.value })} /></label>
        <label>Salin struktur kelas dari<select value={newYear.copyYearId} onChange={(event) => setNewYear({ ...newYear, copyYearId: event.target.value })}><option value="">Mulai tanpa kelas</option>{[...years].sort(yearSort).map((item) => <option key={item.id} value={item.id}>{item.nama}</option>)}</select></label>
      </div><button className="ay-button ay-primary" type="submit">{busy === "year" ? "Membuat…" : "Buat dalam status persiapan"}</button></fieldset></form>
    </details>

    {year && <>
      <section className="ay-card"><div className="ay-heading"><div><h3>Kelas dan rombel {year.nama}</h3><p>Nama, jurusan, rombel, dan pengajar berlaku untuk tahun pelajaran ini.</p></div></div>
        <div className="ay-table-wrap"><table className="ay-table"><thead><tr><th>Kelas / rombel</th><th>Tingkat</th><th>Jurusan</th><th>Rombel</th><th>Pengajar</th><th>Siswa aktif</th><th><span className="ay-sr-only">Tindakan</span></th></tr></thead><tbody>{classes.map((item) => <tr key={item.id}><td>{item.nama}</td><td>{item.tingkat || "—"}</td><td>{item.jurusan || "—"}</td><td>{item.rombel || "—"}</td><td>{teacherMap.get(item.teacherId) || "Belum ditugaskan"}</td><td>{activeRows.filter((row) => row.enrollment.classId === item.id).length}</td><td><button type="button" className="ay-button ay-small" disabled={!!busy || readOnly} onClick={() => { setEditingClassId(item.id); setClassForm({ nama: item.nama || "", tingkat: item.tingkat || "", jurusan: item.jurusan || "", rombel: item.rombel || "", teacherId: item.teacherId || "" }); }}>Ubah</button></td></tr>)}{!classes.length && <tr><td colSpan={7}>Belum ada kelas pada tahun pelajaran ini.</td></tr>}</tbody></table></div>
        {!readOnly && <form className="ay-class-form" onSubmit={submitClass}><fieldset disabled={!!busy}><legend>{editingClassId ? "Ubah kelas" : "Tambah kelas / rombel"}</legend><div className="ay-form-grid">
          <label>Nama kelas<input required maxLength={100} placeholder="XI TKJ 1" value={classForm.nama} onChange={(event) => setClassForm({ ...classForm, nama: event.target.value })} /></label>
          <label>Tingkat<input maxLength={20} placeholder="XI" value={classForm.tingkat} onChange={(event) => setClassForm({ ...classForm, tingkat: event.target.value })} /></label>
          <label>Jurusan<input maxLength={100} placeholder="TKJ" value={classForm.jurusan} onChange={(event) => setClassForm({ ...classForm, jurusan: event.target.value })} /></label>
          <label>Rombel<input maxLength={50} placeholder="1" value={classForm.rombel} onChange={(event) => setClassForm({ ...classForm, rombel: event.target.value })} /></label>
          <label>Pengajar<select value={classForm.teacherId} onChange={(event) => setClassForm({ ...classForm, teacherId: event.target.value })}><option value="">Belum ditugaskan</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.nama}</option>)}</select></label>
        </div><div className="ay-actions"><button className="ay-button ay-primary" type="submit">{busy === "class" ? "Menyimpan…" : editingClassId ? "Simpan perubahan kelas" : "Tambah kelas"}</button>{editingClassId && <button className="ay-button" type="button" onClick={() => { setEditingClassId(""); setClassForm({ ...emptyClass }); }}>Batal mengubah</button>}</div></fieldset></form>}
      </section>

      <section className="ay-card"><div className="ay-heading"><div><h3>Penempatan dan riwayat siswa</h3><p>Pilih siswa untuk ditempatkan, dipindahkan, dinaikkan kelas, atau ditandai lulus/keluar. Identitas siswa tetap sama.</p></div></div>
        <div className="ay-filters"><label>Cari siswa<input type="search" placeholder="Nama atau NIS" value={search} onChange={(event) => setSearch(event.target.value)} /></label><label>Penempatan<select value={placementFilter} onChange={(event) => setPlacementFilter(event.target.value)}><option value="all">Semua siswa</option><option value="unplaced">Belum ditempatkan</option><option value="placed">Sudah ditempatkan</option><option value="aktif">Aktif</option><option value="lulus">Lulus</option><option value="keluar">Keluar</option></select></label><label>Kelas tahun ini<select value={classFilter} onChange={(event) => setClassFilter(event.target.value)}><option value="all">Semua kelas</option>{classes.map((item) => <option value={item.id} key={item.id}>{item.nama}</option>)}</select></label></div>
        {!readOnly && <div className="ay-selection"><strong>{selected.length} siswa dipilih</strong><span>Pilihan tetap tersimpan saat berpindah halaman atau menyaring daftar.</span><button type="button" className="ay-button ay-small" disabled={!selected.length || !!busy} onClick={() => setSelected([])}>Batalkan pilihan</button></div>}
        <div className="ay-table-wrap"><table className="ay-table ay-roster"><thead><tr>{!readOnly && <th><input type="checkbox" aria-label="Pilih semua siswa pada halaman ini" checked={allVisibleSelected} disabled={!!busy || !visibleRows.length} onChange={toggleVisible} /></th>}<th>Nama / NIS</th><th>Kelas {year.nama}</th><th>Berlaku</th><th>Status</th><th>Riwayat</th></tr></thead><tbody>{visibleRows.map(({ student, enrollment, previous, history }) => <tr key={student.id} className={selectedSet.has(student.id) ? "ay-selected" : ""}>
          {!readOnly && <td><input type="checkbox" aria-label={`Pilih ${student.nama}`} checked={selectedSet.has(student.id)} disabled={!!busy} onChange={() => toggleStudent(student.id)} /></td>}
          <td><strong>{student.nama}</strong><small>{student.nis || "NIS belum diisi"}</small></td><td>{enrollment ? classMap.get(enrollment.classId)?.nama || "Kelas tidak ditemukan" : <span className="ay-muted">Belum ditempatkan</span>}{!enrollment && previous && <small>Sebelumnya: {classMap.get(previous.classId)?.nama || "—"} ({yearMap.get(previous.yearId)?.nama || "—"})</small>}</td>
          <td>{enrollment ? <>{displayDate(enrollment.startsOn)}<small>s.d. {enrollment.endsOn ? displayDate(enrollment.endsOn) : "akhir tahun / perubahan berikutnya"}</small></> : "—"}</td><td>{enrollment ? enrollmentLabels[enrollment.status] || enrollment.status : "—"}</td>
          <td>{history.length ? <details><summary>{history.length} penempatan</summary><ul className="ay-history">{history.map((item) => <li key={item.id}><strong>{yearMap.get(item.yearId)?.nama || "—"} · {classMap.get(item.classId)?.nama || "—"}</strong><small>{displayDate(item.startsOn)}–{displayDate(item.endsOn)} · {enrollmentLabels[item.status] || item.status}</small></li>)}</ul></details> : "Belum ada riwayat"}</td>
        </tr>)}{!visibleRows.length && <tr><td colSpan={readOnly ? 5 : 6}>Tidak ada siswa yang sesuai dengan pencarian.</td></tr>}</tbody></table></div>
        <div className="ay-pagination"><span>{filtered.length} siswa · halaman {Math.min(page, pageCount)} dari {pageCount}</span><div className="ay-actions"><button type="button" className="ay-button ay-small" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Sebelumnya</button><button type="button" className="ay-button ay-small" disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)}>Berikutnya</button></div></div>
        {!readOnly && <div className="ay-placement"><fieldset disabled={!!busy}><legend>Atur {selected.length} siswa yang dipilih</legend><label className="ay-date">Tanggal berlaku<input type="date" value={effectiveDate} min={year.startsOn} max={followingDay(year.endsOn)} required onChange={(event) => setEffectiveDate(event.target.value)} /></label><p className="ay-note">Gunakan tanggal awal tahun untuk kenaikan kelas. Penempatan dan perpindahan harus bertanggal dalam tahun pelajaran. Untuk lulus/keluar, tanggal berlaku adalah hari pertama siswa tidak lagi mengikuti pembelajaran; pilih {displayDate(followingDay(year.endsOn))} agar kegiatan pada hari terakhir tahun tetap disertakan.</p><div className="ay-placement-grid"><div><label>Kelas tujuan<select value={targetClass} onChange={(event) => setTargetClass(event.target.value)}><option value="">Pilih kelas tujuan</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.nama}</option>)}</select></label><button type="button" className="ay-button ay-primary" disabled={!selected.length || !targetClass} onClick={placeStudents}>{busy === "placement" ? "Menyimpan…" : "Simpan penempatan / perpindahan"}</button></div><div><label>Akhiri keikutsertaan tahun ini<select value={closeStatus} onChange={(event) => setCloseStatus(event.target.value)}><option value="lulus">Lulus</option><option value="keluar">Keluar / mutasi ke sekolah lain</option></select></label><button type="button" className="ay-button" disabled={!selected.length} onClick={closeStudents}>{busy === "closing" ? "Menyimpan…" : "Simpan status lulus / keluar"}</button></div></div></fieldset></div>}
      </section>
    </>}
  </div>;
}

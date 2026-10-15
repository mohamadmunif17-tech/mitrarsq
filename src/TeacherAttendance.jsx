import TeacherAttendanceRecap from "./TeacherAttendanceRecap.jsx";
import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, CheckCircle2, RefreshCw, Save } from "lucide-react";
import { fetchTeacherAttendance, saveTeacherAttendance } from "./db.js";
import { TEACHER_STATUSES, localDate, monthBounds, attendanceSummary, changedAttendance } from "./teacherAttendanceModel.js";
import { canWriteAcademicYear, dateInAcademicYear, yearMonthOptions } from "./academicYearModel.js";

const formatDate = (date) => new Date(`${date}T12:00:00`).toLocaleDateString("id-ID", {day:"numeric",month:"long",year:"numeric"});
const initialYearDate = (year) => !year ? localDate() : localDate() < year.startsOn ? year.startsOn : localDate() > year.endsOn ? year.endsOn : localDate();
const initialYearMonth = (year) => { const months = yearMonthOptions(year); return months.includes(localDate().slice(0, 7)) ? localDate().slice(0, 7) : months[0] || ""; };
export function AttendanceBadge({ status }) {
  const meta = TEACHER_STATUSES[status];
  return <span className={`ta-badge ${meta?.tone || ""}`}>{meta?.label || "Belum dicatat"}</span>;
}

export function TeacherAttendanceAdmin({ db }) {
  const year = db.academicYear;
  const [recapRevision, setRecapRevision] = useState(0);
  const [tanggal, setTanggal] = useState(() => initialYearDate(year));
  const [loadedDate, setLoadedDate] = useState("");
  const [baseline, setBaseline] = useState({});
  const [draft, setDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState("");
  const teachers = useMemo(() => [...db.teachers].sort((a,b) => a.nama.localeCompare(b.nama,"id")), [db.teachers]);
  const visible = teachers.filter((t) => t.nama.toLowerCase().includes(search.toLowerCase().trim()));
  const changes = changedAttendance(teachers, baseline, draft, tanggal);
  const validYearDate = dateInAcademicYear(tanggal, year);
  const writable = canWriteAcademicYear(year) && validYearDate;
  const unavailable = loading || loadedDate !== tanggal || !validYearDate;

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(""); setMessage("");
    if (!dateInAcademicYear(tanggal, year)) {
      setError("Pilih tanggal dalam tahun pelajaran yang dipilih."); setLoading(false); setLoadedDate("");
      return () => { cancelled = true; };
    }
    fetchTeacherAttendance({from:tanggal,to:tanggal}).then((rows) => {
      if (cancelled) return;
      const map = Object.fromEntries(rows.map((r) => [r.teacherId, {status:r.status,note:r.note}]));
      setBaseline(map); setDraft(map); setLoadedDate(tanggal);
    }).catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tanggal, reload, year?.id]);

  useEffect(() => {
    if (!changes.length) return;
    const warn = (event) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [changes.length]);

  function changeDate(value) {
    if (!value || value === tanggal) return;
    if (!dateInAcademicYear(value, year)) { setError("Tanggal harus berada dalam tahun pelajaran yang dipilih."); return; }
    if (changes.length && !window.confirm("Perubahan presensi belum disimpan. Pindah tanggal dan abaikan perubahan?")) return;
    setTanggal(value);
  }
  function update(id, fields) {
    if (!writable || saving) return;
    setDraft((old) => ({...old,[id]:{status:"",note:"",...old[id],...fields}})); setMessage("");
  }
  function markPresent() {
    if (!writable || saving || unavailable) return;
    setDraft((old) => {
      const next = {...old};
      visible.forEach((t) => { if (!old[t.id]?.status) next[t.id] = {status:"HADIR",note:old[t.id]?.note || ""}; });
      return next;
    }); setMessage("");
  }
  async function save() {
    if (saving || unavailable || !changes.length) return;
    if (!canWriteAcademicYear(year) || !dateInAcademicYear(tanggal, year)) { setError("Presensi hanya dapat disimpan pada tanggal dalam tahun pelajaran aktif."); return; }
    setSaving(true); setError(""); setMessage("");
    try {
      const rows = await saveTeacherAttendance(changes);
      const map = {...baseline};
      rows.forEach((r) => { map[r.teacherId] = {status:r.status,note:r.note}; });
      setBaseline(map); setDraft(map);
      setRecapRevision(n => n + 1);
      setMessage(`${rows.length} presensi pengajar tersimpan untuk ${formatDate(tanggal)}.`);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }
  return <section>
    <div className="portal-intro"><div><small>Administrasi pengajar · {year?.nama || "Pilih tahun pelajaran"}</small><h2>Kehadiran Pengajar</h2><p>Catat kehadiran harian. Pengajar dapat melihat catatannya dari dashboard.</p></div><span className="portal-intro-icon"><CalendarCheck size={27} /></span></div>
    {!canWriteAcademicYear(year) && <p className="ay-notice">Presensi tahun ini hanya dapat dilihat. Pencatatan tersedia pada tahun pelajaran aktif.</p>}
    <div className="t-card teacher-attendance">
      <div className="ta-heading">
        <div><h3>Presensi harian</h3><p>{teachers.length} pengajar terdaftar · satu catatan per pengajar per tanggal</p></div>
        <div className="ta-actions"><label><span className="ta-muted">Tanggal presensi</span><input className="t-input" type="date" aria-label="Tanggal presensi pengajar" min={year?.startsOn} max={year?.endsOn} value={tanggal} disabled={saving} onChange={(e) => changeDate(e.target.value)} /></label>
          <button className="t-btn t-btn-ghost" disabled={loading || saving} onClick={() => { if (!changes.length || window.confirm("Muat ulang dan abaikan perubahan yang belum disimpan?")) setReload((n)=>n+1); }} aria-label="Muat ulang presensi"><RefreshCw size={15} /></button>
        </div>
      </div>
      <div className="ta-heading">
        <input className="t-input" style={{maxWidth:280}} placeholder="Cari nama pengajar..." aria-label="Cari pengajar" value={search} onChange={(e)=>setSearch(e.target.value)} />
        <button className="t-btn t-btn-ghost" onClick={markPresent} disabled={!writable || unavailable || saving || !visible.length}><CheckCircle2 size={15} /> Tandai hadir yang belum diisi</button>
      </div>
      {error && <div className="ta-message error" role="alert">{error}</div>}
      {message && <div className="ta-message" role="status">{message}</div>}
      {unavailable ? <p className="ta-muted">{error ? "Data belum tersedia. Klik muat ulang untuk mencoba lagi." : "Memuat presensi..."}</p> : <div className="ta-table-wrap">
        <table className="t-table ta-admin-table"><thead><tr><th>Pengajar</th><th>Status</th><th>Catatan untuk pengajar</th></tr></thead><tbody>
          {visible.map((teacher) => <tr key={teacher.id}>
            <td><div className="ta-teacher">{teacher.fotoUrl && <img src={teacher.fotoUrl} alt="" />}<strong>{teacher.nama}</strong></div></td>
            <td><select className="t-select" aria-label={`Kehadiran ${teacher.nama}`} disabled={saving || !writable} value={draft[teacher.id]?.status || ""} onChange={(e)=>update(teacher.id,{status:e.target.value})}>
              <option value="" disabled={!!baseline[teacher.id]?.status}>Belum dicatat</option>
              {Object.entries(TEACHER_STATUSES).map(([key,value])=><option key={key} value={key}>{value.label}</option>)}
            </select></td>
            <td><input className="t-input ta-note" aria-label={`Catatan ${teacher.nama}`} placeholder="Opsional, maksimal 500 karakter" maxLength={500} disabled={saving || !writable || !draft[teacher.id]?.status} value={draft[teacher.id]?.note || ""} onChange={(e)=>update(teacher.id,{note:e.target.value})} /></td>
          </tr>)}
          {!visible.length && <tr><td colSpan={3}>Tidak ada pengajar yang sesuai.</td></tr>}
        </tbody></table>
      </div>}
      <div className="ta-savebar"><span className="ta-muted">{changes.length} perubahan belum disimpan{search ? " (termasuk baris di luar pencarian)" : ""}. Status kosong tidak dihitung sebagai Alpha.</span>
        <button className="t-btn t-btn-primary" onClick={save} disabled={!writable || saving || unavailable || !changes.length}><Save size={15} /> {saving ? "Menyimpan..." : "Simpan presensi pengajar"}</button>
      </div>
    </div>
    <TeacherAttendanceRecap db={db} revision={recapRevision} />
  </section>;
}

export function TeacherAttendanceDashboard({ user, db }) {
  const year = db?.academicYear;
  const months = yearMonthOptions(year);
  const today = localDate();
  const showToday = dateInAcademicYear(today, year);
  const [month, setMonth] = useState(() => initialYearMonth(year));
  const [state, setState] = useState({rows:[],today:null,loading:true,error:"",key:""});
  const [reload, setReload] = useState(0);
  const key = `${year?.id}:${user.refId}:${month}`;
  useEffect(() => {
    const update = () => { if (document.visibilityState !== "hidden") setReload((n)=>n+1); };
    const timer = window.setInterval(update,60000);
    window.addEventListener("focus",update);
    return () => { window.clearInterval(timer); window.removeEventListener("focus",update); };
  }, []);
  useEffect(() => {
    let cancelled=false;
    if (!user.refId) { setState({rows:[],today:null,loading:false,error:"Profil belum terhubung ke data pengajar. Hubungi admin.",key}); return; }
    if (!months.includes(month)) { setState({rows:[],today:null,loading:false,error:"Pilih bulan dalam tahun pelajaran yang dipilih.",key}); return; }
    setState((s)=>({...s,loading:true,error:""}));
    const bounds=monthBounds(month);
    Promise.all([
      fetchTeacherAttendance({...bounds,teacherId:user.refId}),
      !showToday || month === today.slice(0,7) ? Promise.resolve(null) : fetchTeacherAttendance({from:today,to:today,teacherId:user.refId}),
    ]).then(([rows,todayRows])=>{
      if(!cancelled) setState({rows,today:(todayRows || rows).find((r)=>r.tanggal===today) || null,loading:false,error:"",key});
    }).catch(e=>{if(!cancelled) setState({rows:[],today:null,loading:false,error:e.message,key});});
    return ()=>{cancelled=true;};
  }, [month,user.refId,today,reload,year?.id]);
  const summary=attendanceSummary(state.rows);
  const pending=state.loading || state.key!==key;
  return <section className="t-card teacher-attendance">
    <div className="ta-heading"><div><h3>Kehadiran Saya · {year?.nama || "Pilih tahun pelajaran"}</h3><p>Dicatat oleh admin · diperbarui otomatis setiap menit saat halaman terbuka</p></div>
      <div className="ta-actions"><input className="t-input" type="month" aria-label="Bulan kehadiran saya" min={months[0]} max={months[months.length - 1]} value={month} onChange={(e)=>{if(months.includes(e.target.value)) setMonth(e.target.value);}} />
        <button className="t-btn t-btn-ghost" disabled={pending} onClick={()=>setReload(n=>n+1)} aria-label="Perbarui kehadiran saya"><RefreshCw size={15} /></button>
      </div>
    </div>
    {state.error ? <div role="alert" className="ta-message error">{state.error}</div> : pending ? <p className="ta-muted">Memuat kehadiran Anda...</p> : <>
      <div className="ta-summary">
        {showToday && <div className="ta-today"><small>Hari ini · {formatDate(today)}</small><AttendanceBadge status={state.today?.status} /><span className="ta-muted">{state.today?.note || "Catatan kehadiran dikelola oleh admin."}</span></div>}
        {Object.entries(TEACHER_STATUSES).map(([status,meta])=><div className="ta-count" key={status}><AttendanceBadge status={status} /><strong>{summary.counts[status]}</strong><span>hari tercatat pada bulan pilihan</span></div>)}
      </div>
      <p className="ta-muted">{summary.total ? `Kehadiran ${summary.percent}% dari ${summary.total} hari yang dicatat pada bulan pilihan.` : "Belum ada catatan kehadiran pada bulan ini."} Tanggal tanpa catatan tidak dihitung.</p>
      <details className="ta-history"><summary>Lihat riwayat bulan ini ({state.rows.length})</summary><div className="ta-table-wrap"><table className="t-table"><thead><tr><th>Tanggal</th><th>Status</th><th>Catatan admin</th></tr></thead><tbody>
        {[...state.rows].sort((a,b)=>b.tanggal.localeCompare(a.tanggal)).map((row)=><tr key={row.tanggal}><td>{formatDate(row.tanggal)}</td><td><AttendanceBadge status={row.status} /></td><td>{row.note || "—"}</td></tr>)}
        {!state.rows.length && <tr><td colSpan={3}>Belum ada catatan.</td></tr>}
      </tbody></table></div></details>
    </>}
  </section>;
}

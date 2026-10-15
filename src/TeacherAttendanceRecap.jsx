import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { fetchTeacherAttendance } from "./db.js";
import { attendanceSummary, localDate, monthBounds } from "./teacherAttendanceModel.js";
import { yearMonthOptions } from "./academicYearModel.js";

export default function TeacherAttendanceRecap({ db, revision = 0 }) {
  const year = db.academicYear;
  const months = yearMonthOptions(year);
  const [month, setMonth] = useState(() => months.includes(localDate().slice(0, 7)) ? localDate().slice(0, 7) : months[0] || "");
  const [search, setSearch] = useState("");
  const [reload, setReload] = useState(0);
  const [state, setState] = useState({rows:[],loading:true,error:"",key:""});
  const key = `${year?.id}:${month}:${revision}:${reload}`;
  useEffect(() => {
    let cancelled = false;
    setState({rows:[],loading:true,error:"",key});
    if (!months.includes(month)) {
      setState({rows:[],loading:false,error:"Pilih bulan dalam tahun pelajaran yang dipilih.",key});
      return () => { cancelled = true; };
    }
    fetchTeacherAttendance(monthBounds(month)).then(rows => {
      if (!cancelled) setState({rows,loading:false,error:"",key});
    }).catch(e => {
      if (!cancelled) setState({rows:[],loading:false,error:e.message,key});
    });
    return () => { cancelled = true; };
  }, [month, revision, reload, year?.id]);
  const rows = useMemo(() => {
    const grouped = new Map();
    state.rows.forEach(row => {
      if (!grouped.has(row.teacherId)) grouped.set(row.teacherId,[]);
      grouped.get(row.teacherId).push(row);
    });
    return [...db.teachers].sort((a,b) => a.nama.localeCompare(b.nama,"id"))
      .map(t => ({...t,...attendanceSummary(grouped.get(t.id) || [])}));
  }, [db.teachers,state.rows]);
  const visible = rows.filter(t => t.nama.toLocaleLowerCase("id").includes(search.trim().toLocaleLowerCase("id")));
  const total = rows.reduce((a,t) => ({present:a.present+t.counts.HADIR,records:a.records+t.total}), {present:0,records:0});
  const percent = total.records ? Math.round(total.present/total.records*100) : null;
  const pending = state.loading || state.key !== key;
  return <section className="t-card teacher-attendance" style={{marginTop:24}}>
    <div className="ta-heading">
      <div><h3>Rekap Kehadiran Pengajar</h3><p>Ringkasan bulanan seluruh pengajar · {year?.nama || "Pilih tahun pelajaran"}</p></div>
      <div className="ta-actions">
        <label style={{display:"grid",gap:6,fontSize:12}}>Bulan rekap pengajar
          <input type="month" className="t-input" min={months[0]} max={months[months.length - 1]} value={month} onChange={e => {if(months.includes(e.target.value)) setMonth(e.target.value);}} />
        </label>
        <button type="button" className="t-btn t-btn-ghost" aria-label="Muat ulang rekap pengajar" disabled={pending} onClick={() => setReload(n => n+1)}><RefreshCw size={15}/></button>
      </div>
    </div>
    <p className="ta-muted">Persentase hadir = Hadir ÷ (Hadir + Sakit + Izin + Alpha) × 100%, dibulatkan ke bilangan bulat. Tanggal tanpa catatan tidak dihitung; tanda — berarti belum ada presensi.</p>
    {pending ? <p role="status">Memuat rekap pengajar...</p> : state.error ? <p className="ta-message error" role="alert">{state.error}</p> : <>
      <div className="ta-heading">
        <p role="status"><strong>Kehadiran keseluruhan: {percent === null ? "—" : `${percent}%`}</strong><br/><span className="ta-muted">{total.present} hadir dari {total.records} catatan seluruh pengajar</span></p>
        <input className="t-input" style={{maxWidth:280}} type="search" aria-label="Cari pengajar dalam rekap" placeholder="Cari nama pengajar..." value={search} onChange={e => setSearch(e.target.value)}/>
      </div>
      <div className="ta-table-wrap">
        <table className="t-table"><thead><tr><th>Pengajar</th><th>Hadir</th><th>Sakit</th><th>Izin</th><th>Alpha</th><th>Hari tercatat</th><th>Persentase hadir</th></tr></thead>
          <tbody>{visible.map(t => <tr key={t.id}>
            <td><strong>{t.nama}</strong></td><td>{t.counts.HADIR}</td><td>{t.counts.SAKIT}</td><td>{t.counts.IZIN}</td><td>{t.counts.ALPHA}</td><td>{t.total}</td>
            <td><strong>{t.percent === null ? "—" : `${t.percent}%`}</strong>{t.percent !== null && <progress aria-label={`Persentase hadir ${t.nama}`} value={t.percent} max={100} style={{display:"block",width:100,marginTop:6,accentColor:"#2e6d60"}}/>}</td>
          </tr>)}{!visible.length && <tr><td colSpan={7}>Tidak ada pengajar yang sesuai.</td></tr>}</tbody>
        </table>
      </div>
    </>}
  </section>;
}

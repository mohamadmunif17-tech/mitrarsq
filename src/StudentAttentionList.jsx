import { useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export default function StudentAttentionList({alerts,db,classes}) {
  const [selected,setSelected] = useState("all");
  const options = [...(classes || db.classes.filter(c => alerts.some(a => a.student.kelasId === c.id)))]
    .sort((a,b) => a.nama.localeCompare(b.nama,"id",{numeric:true}));
  const hasUnassigned = alerts.some(a => !db.classes.some(c => c.id === a.student.kelasId));
  const filter = selected === "all" || options.some(c => c.id === selected) || (selected === "unassigned" && hasUnassigned) ? selected : "all";
  const visible = alerts.filter(a => filter === "all" || (filter === "unassigned"
    ? !db.classes.some(c => c.id === a.student.kelasId)
    : a.student.kelasId === filter));
  return <div>
    <label style={{display:"grid",gap:6,fontSize:12,fontWeight:600,marginBottom:12}}>
      Filter kelas — Perlu Perhatian
      <select className="t-select" value={filter} onChange={e => setSelected(e.target.value)} style={{width:"100%",minWidth:0}}>
        <option value="all">Semua kelas ({alerts.length} siswa)</option>
        {options.map(c => <option key={c.id} value={c.id}>{c.nama} ({alerts.filter(a => a.student.kelasId === c.id).length} siswa)</option>)}
        {hasUnassigned && <option value="unassigned">Kelas belum terhubung</option>}
      </select>
    </label>
    <p role="status" style={{fontSize:12,color:"#60756b",margin:"0 0 12px"}}>{visible.length} siswa perlu perhatian{filter !== "all" ? " pada kelas pilihan" : " dari seluruh kelas pada daftar ini"}.</p>
    {!visible.length ? <div style={{display:"flex",gap:8,alignItems:"center",fontSize:13,color:"var(--teal)",padding:"12px 0"}}>
      <CheckCircle2 size={17}/>Tidak ada siswa yang perlu perhatian pada pilihan ini.
    </div> : <div style={{display:"grid",gap:10,maxHeight:540,overflowY:"auto",paddingRight:3}}>
      {visible.map(({student,reasons}) => <article key={student.id} className="t-card-soft" style={{padding:14,display:"flex",alignItems:"flex-start",gap:10}}>
        <AlertTriangle size={17} color="var(--red)" style={{flexShrink:0,marginTop:2}} aria-hidden="true"/>
        <div style={{minWidth:0,flex:1}}>
          <div style={{fontWeight:700,fontSize:13,lineHeight:1.5,overflowWrap:"anywhere"}}>{student.nama}</div>
          <div style={{display:"inline-block",margin:"6px 0",padding:"4px 9px",borderRadius:6,background:"#dfeee6",color:"#235a48",fontSize:12,fontWeight:700}}>
            Kelas: {db.classes.find(c => c.id === student.kelasId)?.nama || "Belum terhubung"}
          </div>
          <div style={{fontSize:12,color:"#75684f",lineHeight:1.6}}>{reasons.join(" · ")}</div>
        </div>
      </article>)}
    </div>}
  </div>;
}

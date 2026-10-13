import { useEffect, useState } from "react";
import { updateStudentReligion } from "./db.js";
export default function StudentReligionEditor({student,refresh}) {
  const [value,setValue] = useState(student.agama || "");
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  const [error,setError] = useState(false);
  useEffect(() => {setValue(student.agama || "");},[student.agama]);
  async function save() {
    if(busy) return;
    setBusy(true);setMessage("");setError(false);
    try {
      await updateStudentReligion(student.id,value);
      setMessage("Perubahan tersimpan.");
      try {await refresh();} catch {setMessage("Sudah tersimpan. Muat ulang untuk memperbarui tampilan.");}
    } catch(e) {setError(true);setMessage(e.message);}
    finally {setBusy(false);}
  }
  return <div style={{minWidth:190,maxWidth:250,whiteSpace:"normal"}}>
    <span className={`student-religion-badge ${student.agama && student.agama !== "Islam" ? "exempt" : ""}`}>
      {!student.agama ? "Agama belum diverifikasi" : student.agama === "Islam" ? "Peserta Tahfidz" : "Non-Muslim · tidak ikut Tahfidz"}
    </span>
    <select className="t-select" aria-label={`Agama ${student.nama}`} value={value} disabled={busy} onChange={e => {setValue(e.target.value);setMessage("");}}>
      <option value="">Belum diverifikasi</option>
      {["Islam","Kristen","Katolik","Hindu","Buddha","Konghucu","Kepercayaan"].map(r => <option key={r} value={r}>{r}</option>)}
    </select>
    {value !== (student.agama || "") && <button type="button" className="t-btn t-btn-primary" onClick={save} disabled={busy} style={{marginTop:6}}>{busy ? "Menyimpan..." : "Simpan agama"}</button>}
    {message && <p role={error ? "alert" : "status"} style={{fontSize:12,color:error ? "var(--red)" : "var(--teal)"}}>{message}</p>}
  </div>;
}

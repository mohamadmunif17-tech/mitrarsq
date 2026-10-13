import { useState } from "react";
import { KeyRound, Download, Trash2, Loader2 } from "lucide-react";
import { adminResetPassword, deleteScore } from "./db.js";
import { canDeleteScore, photo3x4 } from "./reportTools.js";

export function AdminUserActions({ profile, db }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [message, setMessage] = useState("");
  const teacher = db.teachers.find((t) => profile.role === "pengajar" && t.id === profile.refId);
  async function reset(e) {
    e.preventDefault();
    if (busy) return;
    if (password !== repeat) { setMessage("Konfirmasi password tidak sama."); return; }
    setBusy(true); setMessage("");
    try {
      await adminResetPassword(profile.id, password);
      setPassword(""); setRepeat(""); setOpen(false);
      setMessage(`Password ${profile.nama} berhasil diganti. Sampaikan password baru langsung kepada pengguna.`);
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  async function download() {
    if (!teacher || pdfBusy) return;
    setPdfBusy(true); setMessage("");
    try {
      const jpeg = await photo3x4(teacher.fotoUrl);
      const { downloadTeacherPdf } = await import("./pdfExports.js");
      await downloadTeacherPdf(teacher, db, jpeg);
    } catch (error) { setMessage("Gagal mengunduh profil: " + error.message); }
    finally { setPdfBusy(false); }
  }
  return <div className="um-account-actions" style={{display:"flex",gap:8,flexWrap:"wrap",maxWidth:360}}>
    <button className="t-btn t-btn-ghost" onClick={() => { setOpen(true); setMessage(""); }}><KeyRound size={14} /> Reset password</button>
    {profile.role === "pengajar" && <button className="t-btn t-btn-ghost" onClick={download} disabled={pdfBusy || !teacher} title={!teacher ? "Data pengajar belum terhubung" : "Unduh profil lengkap"}>
      {pdfBusy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} PDF profil
    </button>}
    {message && <div role="status" style={{fontSize:12,whiteSpace:"normal",width:"100%"}}>{message}</div>}
    {open && <div role="dialog" aria-modal="true" aria-label={`Reset password ${profile.nama}`} style={{position:"fixed",inset:0,zIndex:1000,background:"#0008",display:"grid",placeItems:"center",padding:16}}>
      <form onSubmit={reset} className="t-card" style={{padding:24,width:"100%",maxWidth:440,whiteSpace:"normal"}}>
        <h3 style={{marginTop:0}}>Reset password</h3>
        <p>Akun: <strong>{profile.nama}</strong>. Password lama akan diganti.</p>
        <label>Password baru (12–128 karakter)
          <input autoFocus autoComplete="new-password" className="t-input" type="password" minLength={12} maxLength={128} required value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy} />
        </label>
        <label style={{display:"block",marginTop:12}}>Ulangi password baru
          <input autoComplete="new-password" className="t-input" type="password" minLength={12} maxLength={128} required value={repeat} onChange={(e) => setRepeat(e.target.value)} disabled={busy} />
        </label>
        {message && <p role="alert" style={{color:"var(--red)"}}>{message}</p>}
        <div style={{display:"flex",gap:8,marginTop:18}}>
          <button type="button" className="t-btn t-btn-ghost" disabled={busy} onClick={() => {setOpen(false);setPassword("");setRepeat("");setMessage("");}}>Batal</button>
          <button type="submit" className="t-btn t-btn-primary" disabled={busy}>{busy ? "Mengganti..." : "Ganti password"}</button>
        </div>
      </form>
    </div>}
  </div>;
}

export function DeleteScoreButton({ score, user, db, refresh }) {
  const [busy, setBusy] = useState(false);
  if (!canDeleteScore(user, score, db)) return null;
  async function remove() {
    const name = db.students.find((s) => s.id === score.studentId)?.nama || "siswa";
    const surah = db.surahs.find((s) => s.id === score.surahId)?.nama || "surat";
    if (busy || !window.confirm(`Hapus penilaian ${name}, ${surah} ayat ${score.ayatMulai}-${score.ayatAkhir}, tanggal ${score.tanggal}? Data tidak dapat dikembalikan dari web.`)) return;
    setBusy(true);
    try {
      await deleteScore(score.id);
      await refresh({scoresFor: score.studentId});
    } catch (error) { window.alert("Gagal menghapus penilaian: " + error.message); }
    finally { setBusy(false); }
  }
  return <button className="t-btn t-btn-danger" onClick={remove} disabled={busy} title="Hapus penilaian" aria-label="Hapus penilaian">
    {busy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} {busy ? "Menghapus..." : "Hapus"}
  </button>;
}

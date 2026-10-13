import { useState } from "react";
import { UserCog, Loader2 } from "lucide-react";
import { changeUserRole } from "./roleApi.js";

export default function RoleChangeButton({profile,db,user,refresh}) {
  const [open,setOpen]=useState(false);
  const [newRole,setNewRole]=useState(profile.role === "admin" ? "pengajar" : "admin");
  const [teacherId,setTeacherId]=useState("");
  const [mode,setMode]=useState("existing");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  if (user?.role !== "admin" || user?.status !== "aktif" || !["admin","pengajar"].includes(profile.role)) return null;
  const lastAdmin=profile.role === "admin" && profile.status === "aktif" && db.profiles.filter(p=>p.role === "admin" && p.status === "aktif").length <= 1;
  const available=db.teachers.filter(t=>!db.profiles.some(p=>p.id !== profile.id && p.refId === t.id));
  function show() {
    const previous=available.find(t=>t.id === profile.refId);
    setNewRole(profile.role === "admin" ? "pengajar" : "admin");
    setTeacherId(previous?.id || ""); setMode("existing");
    setError("");setMessage("");setOpen(true);
  }
  async function submit(e) {
    e.preventDefault(); if (busy) return;
    setBusy(true);setError("");
    try {
      await changeUserRole({userId:profile.id,newRole,teacherId,createTeacher:mode === "new"});
    } catch (e) {setError(e.message);setBusy(false);return;}
    setOpen(false);setBusy(false);
    if (profile.id === user.id) {
      // Reload reads the updated profile before rendering the new role's menu.
      window.location.reload(); return;
    }
    setMessage(`Role ${profile.nama} berhasil diubah menjadi ${newRole === "admin" ? "Admin" : "Pengajar"}. Pengguna perlu memuat ulang halaman.`);
    try {await refresh();} catch {setMessage("Role sudah berubah, tetapi daftar belum berhasil dimuat ulang. Muat ulang halaman.");}
  }
  return <div className="um-role-control" style={{marginTop:8,maxWidth:240,whiteSpace:"normal"}}>
    <button className="t-btn t-btn-ghost" type="button" disabled={lastAdmin || busy} onClick={show} title={lastAdmin ? "Tambahkan admin aktif lain sebelum mengubah role akun ini." : "Ubah akses akun"}><UserCog size={14} /> Ubah role</button>
    {lastAdmin && <p style={{fontSize:11,color:"#73857a",margin:"5px 0"}}>Admin aktif terakhir harus dipertahankan.</p>}
    {message && <p role="status" style={{fontSize:12}}>{message}</p>}
    {open && <div role="dialog" aria-modal="true" aria-label={`Ubah role ${profile.nama}`} style={{position:"fixed",inset:0,zIndex:1000,background:"#102a2266",display:"grid",placeItems:"center",padding:16}}>
      <form onSubmit={submit} className="t-card" style={{padding:24,width:"100%",maxWidth:470,maxHeight:"90dvh",overflowY:"auto"}}>
        <h3 style={{marginTop:0}}>Ubah role akun</h3>
        <p style={{fontSize:13,lineHeight:1.6}}><strong>{profile.nama}</strong><br />Role saat ini: {profile.role === "admin" ? "Admin" : "Pengajar"}<br />Status akun tetap: {profile.status}</p>
        <label style={{display:"block",fontSize:13}}>Role baru
          <select autoFocus className="t-select" value={newRole} disabled={busy} onChange={e=>setNewRole(e.target.value)}>
            {profile.role !== "admin" && <option value="admin">Admin</option>}
            {profile.role !== "pengajar" && <option value="pengajar">Pengajar</option>}
          </select>
        </label>
        {newRole === "admin" ? <p className="t-card-soft" style={{fontSize:12,lineHeight:1.6,padding:12}}>Akun ini akan mendapat akses administrasi, termasuk pengelolaan pengguna. Data pengajar dan riwayatnya tetap tersimpan.</p> : <>
          <p style={{fontSize:12,lineHeight:1.6}}>Hubungkan akun ke data pengajar yang benar agar kelas dan kehadirannya sesuai.</p>
          <label style={{display:"block",fontSize:13}}>Data pengajar
            <select className="t-select" value={mode} disabled={busy} onChange={e=>setMode(e.target.value)}>
              <option value="existing">Pilih data yang sudah ada</option><option value="new">Buat data pengajar baru</option>
            </select>
          </label>
          {mode === "existing" ? <label style={{display:"block",fontSize:13,marginTop:12}}>Nama pengajar
            <select className="t-select" required value={teacherId} disabled={busy} onChange={e=>setTeacherId(e.target.value)}>
              <option value="">Pilih pengajar...</option>
              {available.map(t=><option key={t.id} value={t.id}>{t.nama}</option>)}
            </select>
          </label> : <p style={{fontSize:12}}>Data baru akan dibuat dengan nama <strong>{profile.nama}</strong>. Penugasan kelas diatur setelahnya melalui Master Data.</p>}
          {mode === "existing" && !available.length && <p style={{fontSize:12}}>Tidak ada data pengajar yang belum terhubung ke akun lain. Pilih buat data baru jika diperlukan.</p>}
          {profile.id === user.id && <p style={{fontSize:12,color:"#985342"}}>Ini akun Anda sendiri. Setelah berhasil, halaman akan dimuat ulang dengan menu Pengajar.</p>}
        </>}
        {error && <p role="alert" style={{fontSize:12,color:"var(--red)",lineHeight:1.6}}>{error}</p>}
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:18}}>
          <button type="button" className="t-btn t-btn-ghost" disabled={busy} onClick={()=>setOpen(false)}>Batal</button>
          <button type="submit" className="t-btn t-btn-primary" disabled={busy || (newRole === "pengajar" && mode === "existing" && !teacherId)}>{busy && <Loader2 size={14} className="animate-spin" />}{busy ? "Menyimpan..." : "Simpan perubahan role"}</button>
        </div>
      </form>
    </div>}
  </div>;
}

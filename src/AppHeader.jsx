import "./brand.css";
import "./headerYear.css";
import { useState } from "react";
import { Menu, LogOut, Loader2, ChevronRight } from "lucide-react";

export default function AppHeader({ user, viewLabel, roleLabel, photoUrl, onMenu, onLogout, yearControl }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    if (busy) return;
    setBusy(true); setError("");
    try { await onLogout(); }
    catch { setError("Belum berhasil keluar. Periksa koneksi dan coba kembali."); }
    finally { setBusy(false); }
  }
  const initials = (user.nama || "Pengguna").split(/\s+/).slice(0, 2).map((s) => s[0]).join("");
  return <>
    <header className="portal-topbar no-print">
      <div className="portal-brand">
        <button className="portal-menu" onClick={onMenu} aria-label="Buka menu"><Menu size={22} /></button>
        <div className="saquin-mark" aria-hidden="true">S</div>
        <div className="saquin-wordmark" aria-label="SAQUIN — Sahabat Quran Indonesia">
          <strong>SAQUIN</strong><span>Sahabat Quran Indonesia</span>
        </div>
      </div>
      <div className="portal-breadcrumb"><span>Ruang kerja</span><ChevronRight size={14} /><strong>{viewLabel}</strong></div>
      <div className="portal-tools">
        {yearControl && <div className="portal-year-control">{yearControl}</div>}
        <div className="portal-account">
          <div className="portal-avatar">{photoUrl ? <img src={photoUrl} alt="" /> : initials}</div>
          <div className="portal-user"><strong>{user.nama}</strong><span>{roleLabel}</span></div>
          <button className="portal-logout" disabled={busy} onClick={logout}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />} {busy ? "Keluar..." : "Keluar"}
          </button>
        </div>
      </div>
    </header>
    {error && <div className="portal-alert no-print" role="alert">{error}</div>}
  </>;
}

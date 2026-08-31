import { useState, useEffect } from "react";
import {
  LayoutDashboard, ClipboardCheck, BookOpen, Users, Settings, BarChart3,
  FileText, LogOut, CheckCircle2, XCircle, MinusCircle, CircleDot,
  GraduationCap, UserCog, Shield, ChevronRight, Plus, Trash2,
  Loader2, BookMarked, TrendingUp, CalendarCheck, Star, AlertTriangle, Trophy, Download, Printer
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar,
} from "recharts";
import * as XLSX from "xlsx";
import { supabase } from "./supabaseClient.js";
import {
  fetchAllData, saveAttendanceBatch, insertScore, insertStudent, bulkInsertStudents,
  deleteStudent, insertClass, deleteClass, findOrCreateClassByName, insertGroup, deleteGroup,
  setProfileStatus,
} from "./db.js";


export const SMK_LOGO = "data:image/png;base64,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";
export const RUTABA_LOGO = "data:image/jpeg;base64,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";

/* ============================== STYLE TOKENS ============================== */
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');

    .tahfidz-root {
      --ink: #1B3A34;
      --paper: #FAF6EE;
      --panel: #FFFFFF;
      --panel-soft: #F3EEE1;
      --gold: #B08D57;
      --gold-soft: #E7D9BC;
      --teal: #2F6F63;
      --teal-soft: #DCEAE6;
      --red: #B5533F;
      --red-soft: #F3DFD9;
      --blue: #3E6486;
      --blue-soft: #DCE6EE;
      --line: #E4DCC9;
      font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
      background: var(--paper);
      color: var(--ink);
      min-height: 100vh;
    }
    .tahfidz-root .font-display { font-family: 'Fraunces', serif; }
    .tahfidz-root .font-mono { font-family: 'IBM Plex Mono', monospace; }

    .t-card {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 14px;
    }
    .t-card-soft {
      background: var(--panel-soft);
      border: 1px solid var(--line);
      border-radius: 14px;
    }
    .t-btn {
      display: inline-flex; align-items: center; gap: 6px;
      border-radius: 10px; font-weight: 600; font-size: 13px;
      padding: 9px 16px; transition: all .15s ease; cursor: pointer;
      border: 1px solid transparent;
    }
    .t-btn-primary { background: var(--teal); color: white; }
    .t-btn-primary:hover { background: #255950; }
    .t-btn-primary:disabled { opacity: .5; cursor: not-allowed; }
    .t-btn-ghost { background: transparent; color: var(--ink); border-color: var(--line); }
    .t-btn-ghost:hover { background: var(--panel-soft); }
    .t-btn-danger { background: transparent; color: var(--red); border-color: var(--red-soft); }
    .t-btn-danger:hover { background: var(--red-soft); }
    .t-btn-gold { background: var(--gold); color: white; }
    .t-btn-gold:hover { background: #93713f; }

    .t-nav-item {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 14px; border-radius: 10px; font-size: 14px; font-weight: 500;
      color: #EDE6D4; cursor: pointer; transition: all .15s ease;
    }
    .t-nav-item:hover { background: rgba(255,255,255,0.08); }
    .t-nav-item.active { background: var(--gold); color: white; }

    .t-input, .t-select {
      width: 100%; border: 1px solid var(--line); border-radius: 9px;
      padding: 8px 12px; font-size: 14px; background: white; color: var(--ink);
      outline: none;
    }
    .t-input:focus, .t-select:focus { border-color: var(--teal); box-shadow: 0 0 0 3px var(--teal-soft); }

    .t-tag {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 11px; font-weight: 700; letter-spacing: .02em;
      padding: 3px 9px; border-radius: 999px;
    }
    .t-status-btn {
      flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px;
      padding: 8px 4px; border-radius: 10px; border: 1.5px solid var(--line);
      font-size: 11px; font-weight: 700; cursor: pointer; background: white;
      transition: all .12s ease;
    }
    .t-status-btn.selected-HADIR { background: var(--teal-soft); border-color: var(--teal); color: var(--teal); }
    .t-status-btn.selected-SAKIT { background: var(--gold-soft); border-color: var(--gold); color: #7A5E32; }
    .t-status-btn.selected-IZIN { background: var(--blue-soft); border-color: var(--blue); color: var(--blue); }
    .t-status-btn.selected-ALPHA { background: var(--red-soft); border-color: var(--red); color: var(--red); }

    .bead {
      width: 11px; height: 11px; border-radius: 50%;
      background: var(--line); flex-shrink: 0;
    }
    .bead.filled { background: var(--gold); }
    .bead.absent { background: var(--red-soft); }

    table.t-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    table.t-table th {
      text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .04em;
      color: #8A8064; padding: 8px 10px; border-bottom: 1.5px solid var(--line);
    }
    table.t-table td { padding: 9px 10px; border-bottom: 1px solid var(--line); }
    table.t-table tr:last-child td { border-bottom: none; }

    .t-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
    .t-scrollbar::-webkit-scrollbar-thumb { background: var(--line); border-radius: 3px; }

    .report-sheet { max-width: 760px; margin: 0 auto; }
    .report-kop { text-align: center; border-bottom: 2px solid var(--ink); padding-bottom: 14px; margin-bottom: 18px; }
    .report-stat-box { background: var(--panel-soft); border-radius: 10px; padding: 12px; text-align: center; }
    .report-sig { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 34px; }
    .report-sig div { text-align: center; font-size: 12.5px; }
    .report-sig .line { margin-top: 46px; border-top: 1px solid var(--ink); padding-top: 4px; font-weight: 600; }

    @media print {
      .no-print { display: none !important; }
      .tahfidz-root { background: white !important; padding: 0 !important; }
      .print-area { display: block !important; }
      .report-page { page-break-after: always; padding-top: 8px; }
      .report-page:last-child { page-break-after: auto; }
      .t-card { border: none !important; }
      @page { size: A4; margin: 14mm; }
    }
  `}</style>
);

/* ============================== SEED DATA ============================== */
function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/* ============================== HELPERS ============================== */
const STATUS_META = {
  HADIR: { label: "Hadir", icon: CheckCircle2, color: "var(--teal)" },
  SAKIT: { label: "Sakit", icon: MinusCircle, color: "#7A5E32" },
  IZIN: { label: "Izin", icon: CircleDot, color: "var(--blue)" },
  ALPHA: { label: "Alpha", icon: XCircle, color: "var(--red)" },
};

function fmtDate(iso) {
  return new Date(iso + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}
function monthKey(iso) {
  return iso.slice(0, 7);
}
function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}
function prevMonthKey(mk) {
  const [y, m] = mk.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(mk) {
  const [y, m] = mk.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}
function lastMonthOptions(n = 6) {
  const opts = [];
  let mk = currentMonthKey();
  for (let i = 0; i < n; i++) {
    opts.push(mk);
    mk = prevMonthKey(mk);
  }
  return opts;
}
function surahName(db, id) {
  return db.surahs.find((s) => s.id === id)?.nama || "-";
}
function className(db, id) {
  return db.classes.find((c) => c.id === id)?.nama || "-";
}
function groupName(db, id) {
  return db.groups.find((g) => g.id === id)?.nama || "-";
}
function studentName(db, id) {
  return db.students.find((s) => s.id === id)?.nama || "-";
}
function groupMembers(db, groupId) {
  return db.students.filter((s) => s.groupId === groupId);
}
function mentorStudents(db, mentorId) {
  const ids = db.mentorAssignments.filter((ma) => ma.mentorId === mentorId).map((ma) => ma.studentId);
  return db.students.filter((s) => ids.includes(s.id));
}
function studentScores(db, studentId) {
  return db.scores.filter((s) => s.studentId === studentId).sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1));
}
function studentAttendance(db, studentId) {
  return db.attendance.filter((a) => a.studentId === studentId).sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1));
}
function avg(arr) {
  if (!arr.length) return 0;
  return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;
}
function attendancePct(records) {
  if (!records.length) return 0;
  const hadir = records.filter((r) => r.status === "HADIR").length;
  return Math.round((hadir / records.length) * 100);
}

function daysSinceLastScore(scores) {
  if (!scores.length) return null;
  const latest = [...scores].sort((a, b) => (a.tanggal > b.tanggal ? -1 : 1))[0];
  const diffMs = new Date(isoDaysAgo(0)) - new Date(latest.tanggal);
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function buildAlerts(db, students) {
  const mk = currentMonthKey();
  const alerts = [];
  students.forEach((s) => {
    const att = db.attendance.filter((a) => a.studentId === s.id && monthKey(a.tanggal) === mk);
    const scores = studentScores(db, s.id);
    const reasons = [];
    if (att.length >= 3 && attendancePct(att) < 75) {
      reasons.push(`Kehadiran ${attendancePct(att)}% bulan ini`);
    }
    const gap = daysSinceLastScore(scores);
    if (gap === null) {
      reasons.push("Belum pernah setor");
    } else if (gap >= 10) {
      reasons.push(`${gap} hari tidak setor`);
    }
    if (reasons.length) alerts.push({ student: s, reasons });
  });
  return alerts;
}

function buildLeaderboard(db, students, limit = 5) {
  const mk = currentMonthKey();
  return students
    .map((s) => {
      const scores = db.scores.filter((sc) => sc.studentId === s.id && monthKey(sc.tanggal) === mk);
      return { student: s, count: scores.length, avgNilai: avg(scores.map((sc) => sc.nilai)) };
    })
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count || b.avgNilai - a.avgNilai)
    .slice(0, limit);
}

function AlertList({ alerts }) {
  if (!alerts.length) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--teal)", fontSize: 13, fontWeight: 600, padding: "8px 2px" }}>
        <CheckCircle2 size={16} /> Tidak ada siswa yang perlu perhatian khusus saat ini.
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {alerts.map(({ student, reasons }) => (
        <div key={student.id} className="t-card-soft" style={{ padding: "10px 12px", display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ color: "var(--red)", flexShrink: 0, marginTop: 1 }}><AlertTriangle size={16} /></div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{student.nama}</div>
            <div style={{ fontSize: 11.5, color: "#8A8064" }}>{reasons.join(" · ")}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Leaderboard({ rows }) {
  if (!rows.length) return <Empty text="Belum ada data setoran bulan ini." />;
  const medalColor = ["#B08D57", "#9CA3AF", "#B5754A"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map((r, i) => (
        <div key={r.student.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 4px", borderBottom: i < rows.length - 1 ? "1px solid var(--line)" : "none" }}>
          <div style={{
            width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            background: i < 3 ? medalColor[i] : "var(--panel-soft)", color: i < 3 ? "white" : "#8A8064", flexShrink: 0,
          }}>
            {i < 3 ? <Trophy size={13} /> : <span style={{ fontSize: 11, fontWeight: 700 }}>{i + 1}</span>}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{r.student.nama}</div>
            <div style={{ fontSize: 11, color: "#8A8064" }}>Rata-rata nilai {r.avgNilai}</div>
          </div>
          <div className="font-mono" style={{ fontWeight: 700, color: "var(--teal)", fontSize: 14 }}>{r.count}x</div>
        </div>
      ))}
    </div>
  );
}

/* ============================== SMALL UI PIECES ============================== */
function StatCard({ icon: Icon, label, value, sub, accent = "teal" }) {
  return (
    <div className="t-card" style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
          background: accent === "gold" ? "var(--gold-soft)" : accent === "red" ? "var(--red-soft)" : "var(--teal-soft)",
          color: accent === "gold" ? "#7A5E32" : accent === "red" ? "var(--red)" : "var(--teal)",
        }}>
          <Icon size={18} />
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#8A8064" }}>{label}</div>
      </div>
      <div className="font-display" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#8A8064", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function TasbihTracker({ attendance, scores, days = 21 }) {
  const cells = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = isoDaysAgo(i);
    const att = attendance.find((a) => a.tanggal === date);
    const hasSetoran = scores.some((s) => s.tanggal === date);
    let cls = "bead";
    if (hasSetoran) cls += " filled";
    else if (att?.status === "ALPHA") cls += " absent";
    cells.push(<div key={date} className={cls} title={date} />);
  }
  return (
    <div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{cells}</div>
      <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: 11, color: "#8A8064" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span className="bead filled" /> Setoran</span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span className="bead" /> Tidak setor</span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span className="bead absent" /> Alpha</span>
      </div>
    </div>
  );
}

function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h2 className="font-display" style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{children}</h2>
      {sub && <p style={{ fontSize: 13, color: "#8A8064", marginTop: 4 }}>{sub}</p>}
    </div>
  );
}

function Empty({ text }) {
  return <div style={{ padding: 24, textAlign: "center", color: "#8A8064", fontSize: 13 }}>{text}</div>;
}

/* ============================== LOGIN ============================== */
function LoginScreen({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) return;
    setLoading(true);
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(), password,
    });
    if (authError) {
      setError("Email atau password salah.");
      setLoading(false);
      return;
    }
    await onLoginSuccess(data.session);
    setLoading(false);
  }

  return (
    <div className="tahfidz-root" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <GlobalStyle />
      <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 14 }}>
            <img src={SMK_LOGO} alt="Logo SMK Telkom Malang" style={{ height: 32, objectFit: "contain" }} />
            <div style={{ width: 1, height: 26, background: "var(--line)" }} />
            <img src={RUTABA_LOGO} alt="Logo Rutaba Shohibul Qur'an" style={{ height: 40, objectFit: "contain", borderRadius: "50%" }} />
          </div>
          <h1 className="font-display" style={{ fontSize: 30, fontWeight: 700, margin: 0 }}>Monitoring Tahfidz</h1>
          <p style={{ color: "#8A8064", marginTop: 6, fontSize: 14 }}>SMK Telkom Malang &mdash; masuk dengan akun yang diberikan Admin</p>
        </div>

        <div className="t-card" style={{ padding: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#8A8064" }}>Email</label>
              <input type="email" className="t-input" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@sekolah.sch.id" required />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#8A8064" }}>Password</label>
              <input type="password" className="t-input" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <div style={{ fontSize: 12.5, color: "var(--red)", fontWeight: 600 }}>{error}</div>}
            <button type="submit" className="t-btn t-btn-primary" style={{ justifyContent: "center", marginTop: 4 }} disabled={loading}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : <ChevronRight size={15} />} {loading ? "Memeriksa..." : "Masuk"}
            </button>
          </div>
        </div>
        <p style={{ textAlign: "center", fontSize: 11.5, color: "#B4AA8C", marginTop: 16 }}>
          Belum punya akun? Hubungi Admin sistem untuk dibuatkan akses.
        </p>
      </form>
    </div>
  );
}
/* ============================== SHELL ============================== */
const NAV_BY_ROLE = {
  admin: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "master", label: "Master Data", icon: Users },
    { id: "userman", label: "Manajemen User", icon: UserCog },
    { id: "monitoring", label: "Monitoring", icon: BarChart3 },
    { id: "report", label: "Report Bulanan", icon: FileText },
  ],
  pengajar: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "presensi", label: "Presensi Harian", icon: ClipboardCheck },
    { id: "penilaian", label: "Penilaian Tahfidz", icon: BookOpen },
    { id: "rekap", label: "Rekap Kelompok", icon: FileText },
    { id: "report", label: "Report Bulanan", icon: FileText },
  ],
  mentor: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "penilaian", label: "Input Penilaian", icon: BookOpen },
    { id: "rekap", label: "Rekap Siswa Binaan", icon: FileText },
    { id: "report", label: "Report Bulanan", icon: FileText },
  ],
  siswa: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "rekap", label: "Rekap Tahfidz", icon: BookOpen },
    { id: "presensi", label: "Presensi Saya", icon: ClipboardCheck },
  ],
};

const ROLE_LABEL = { admin: "Admin", pengajar: "Pengajar Tahfidz", mentor: "Mentor", siswa: "Siswa" };

function Sidebar({ user, view, setView, onLogout }) {
  const items = NAV_BY_ROLE[user.role];
  return (
    <div className="no-print" style={{ width: 232, background: "var(--ink)", minHeight: "100vh", padding: 18, display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 26, padding: "0 4px" }}>
        <img src={RUTABA_LOGO} alt="Logo Rutaba" style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
        <div>
          <div className="font-display" style={{ color: "white", fontWeight: 700, fontSize: 15, lineHeight: 1.1 }}>Tahfidz</div>
          <div style={{ color: "#B4AA8C", fontSize: 10 }}>SMK Telkom Malang</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
        {items.map((it) => (
          <div key={it.id} className={`t-nav-item ${view === it.id ? "active" : ""}`} onClick={() => setView(it.id)}>
            <it.icon size={16} /> {it.label}
          </div>
        ))}
      </div>
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 14, marginTop: 14 }}>
        <div style={{ color: "white", fontSize: 13, fontWeight: 600 }}>{user.nama}</div>
        <div style={{ color: "#B4AA8C", fontSize: 11, marginBottom: 10 }}>{ROLE_LABEL[user.role]}</div>
        <div className="t-nav-item" onClick={onLogout}>
          <LogOut size={16} /> Keluar
        </div>
      </div>
    </div>
  );
}

/* ============================== DASHBOARDS ============================== */
function DashboardAdmin({ db }) {
  const mk = currentMonthKey();
  const monthScores = db.scores.filter((s) => monthKey(s.tanggal) === mk);
  const monthAtt = db.attendance.filter((a) => monthKey(a.tanggal) === mk);
  const perGroup = db.groups.map((g) => {
    const members = groupMembers(db, g.id).map((m) => m.id);
    const gs = monthScores.filter((s) => members.includes(s.studentId));
    return { nama: g.nama, rataNilai: avg(gs.map((s) => s.nilai)) || 0 };
  });
  const recent = [...db.scores].sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1)).slice(0, 6);
  const alerts = buildAlerts(db, db.students);
  const leaderboard = buildLeaderboard(db, db.students);

  return (
    <div>
      <SectionTitle sub="Ringkasan aktivitas tahfidz seluruh sekolah bulan ini">Dashboard Admin</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        <StatCard icon={Users} label="Total Siswa" value={db.students.length} sub={`${db.groups.length} kelompok tahfidz`} />
        <StatCard icon={GraduationCap} label="Pengajar & Mentor" value={db.teachers.length + db.mentors.length} sub={`${db.teachers.length} pengajar, ${db.mentors.length} mentor`} accent="gold" />
        <StatCard icon={CalendarCheck} label="Kehadiran Bulan Ini" value={`${attendancePct(monthAtt)}%`} sub={`${monthAtt.length} catatan presensi`} />
        <StatCard icon={BookOpen} label="Setoran Bulan Ini" value={monthScores.length} sub={`Rata-rata nilai ${avg(monthScores.map((s) => s.nilai))}`} accent="gold" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div className="t-card" style={{ padding: 18 }}>
          <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Rata-rata Nilai per Kelompok</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={perGroup}>
              <CartesianGrid stroke="#E4DCC9" vertical={false} />
              <XAxis dataKey="nama" tick={{ fontSize: 12 }} stroke="#8A8064" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#8A8064" />
              <Tooltip />
              <Bar dataKey="rataNilai" fill="#B08D57" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="t-card" style={{ padding: 18 }}>
          <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Setoran Terbaru</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {recent.map((s) => (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderBottom: "1px solid var(--line)", paddingBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{studentName(db, s.studentId)}</div>
                  <div style={{ color: "#8A8064", fontSize: 11.5 }}>{surahName(db, s.surahId)} · {fmtDate(s.tanggal)}</div>
                </div>
                <div className="font-mono" style={{ fontWeight: 700, color: "var(--teal)" }}>{s.nilai}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="t-card" style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, fontWeight: 700, fontSize: 14 }}>
            <AlertTriangle size={16} color="var(--red)" /> Perlu Perhatian
          </div>
          <div style={{ fontSize: 11.5, color: "#8A8064", marginBottom: 12 }}>Kehadiran rendah atau lama tidak setor bulan ini</div>
          <AlertList alerts={alerts} />
        </div>
        <div className="t-card" style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, fontWeight: 700, fontSize: 14 }}>
            <Trophy size={16} color="var(--gold)" /> Papan Peringkat Setoran
          </div>
          <div style={{ fontSize: 11.5, color: "#8A8064", marginBottom: 12 }}>Siswa paling rajin setor bulan ini, seluruh sekolah</div>
          <Leaderboard rows={leaderboard} />
        </div>
      </div>
    </div>
  );
}

function DashboardPengajar({ db, user }) {
  const teacher = db.teachers.find((t) => t.id === user.refId);
  const group = db.groups.find((g) => g.teacherId === teacher.id);
  const members = groupMembers(db, group.id);
  const mk = currentMonthKey();
  const memberIds = members.map((m) => m.id);
  const monthScores = db.scores.filter((s) => monthKey(s.tanggal) === mk && memberIds.includes(s.studentId));
  const todayAtt = db.attendance.filter((a) => a.tanggal === isoDaysAgo(0) && memberIds.includes(a.studentId));
  const alerts = buildAlerts(db, members);
  const leaderboard = buildLeaderboard(db, members);

  return (
    <div>
      <SectionTitle sub={`${group.nama} · ${members.length} siswa binaan`}>Dashboard Pengajar</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
        <StatCard icon={Users} label="Siswa Diampu" value={members.length} sub={group.nama} />
        <StatCard icon={CalendarCheck} label="Presensi Hari Ini" value={`${todayAtt.filter((a) => a.status === "HADIR").length}/${members.length}`} sub="Hadir hari ini" accent="gold" />
        <StatCard icon={BookOpen} label="Setoran Bulan Ini" value={monthScores.length} sub={`Rata-rata nilai ${avg(monthScores.map((s) => s.nilai))}`} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div className="t-card" style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, fontWeight: 700, fontSize: 14 }}>
            <AlertTriangle size={16} color="var(--red)" /> Perlu Perhatian
          </div>
          <div style={{ fontSize: 11.5, color: "#8A8064", marginBottom: 12 }}>Kehadiran rendah atau lama tidak setor bulan ini</div>
          <AlertList alerts={alerts} />
        </div>
        <div className="t-card" style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, fontWeight: 700, fontSize: 14 }}>
            <Trophy size={16} color="var(--gold)" /> Papan Peringkat Setoran
          </div>
          <div style={{ fontSize: 11.5, color: "#8A8064", marginBottom: 12 }}>Siswa paling rajin setor bulan ini di {group.nama}</div>
          <Leaderboard rows={leaderboard} />
        </div>
      </div>
      <div className="t-card" style={{ padding: 18 }}>
        <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Siswa Binaan</div>
        <table className="t-table">
          <thead><tr><th>Nama</th><th>Kelas</th><th>Setoran Bulan Ini</th><th>Rata-rata Nilai</th></tr></thead>
          <tbody>
            {members.map((m) => {
              const sc = studentScores(db, m.id).filter((s) => monthKey(s.tanggal) === mk);
              return (
                <tr key={m.id}>
                  <td style={{ fontWeight: 600 }}>{m.nama}</td>
                  <td>{className(db, m.kelasId)}</td>
                  <td>{sc.length}</td>
                  <td className="font-mono">{avg(sc.map((s) => s.nilai)) || "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DashboardMentor({ db, user }) {
  const mentor = db.mentors.find((m) => m.id === user.refId);
  const students = mentorStudents(db, mentor.id);
  const mk = currentMonthKey();
  const ids = students.map((s) => s.id);
  const monthScores = db.scores.filter((s) => monthKey(s.tanggal) === mk && ids.includes(s.studentId));
  const alerts = buildAlerts(db, students);
  const leaderboard = buildLeaderboard(db, students);

  return (
    <div>
      <SectionTitle sub={`${students.length} siswa menjadi tanggung jawab Anda`}>Dashboard Mentor</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
        <StatCard icon={Users} label="Siswa Binaan" value={students.length} />
        <StatCard icon={BookOpen} label="Penilaian Bulan Ini" value={monthScores.length} accent="gold" />
        <StatCard icon={TrendingUp} label="Rata-rata Nilai" value={avg(monthScores.map((s) => s.nilai)) || "-"} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div className="t-card" style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, fontWeight: 700, fontSize: 14 }}>
            <AlertTriangle size={16} color="var(--red)" /> Perlu Perhatian
          </div>
          <div style={{ fontSize: 11.5, color: "#8A8064", marginBottom: 12 }}>Kehadiran rendah atau lama tidak setor bulan ini</div>
          <AlertList alerts={alerts} />
        </div>
        <div className="t-card" style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, fontWeight: 700, fontSize: 14 }}>
            <Trophy size={16} color="var(--gold)" /> Papan Peringkat Setoran
          </div>
          <div style={{ fontSize: 11.5, color: "#8A8064", marginBottom: 12 }}>Siswa binaan paling rajin setor bulan ini</div>
          <Leaderboard rows={leaderboard} />
        </div>
      </div>
      <div className="t-card" style={{ padding: 18 }}>
        <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Daftar Siswa</div>
        <table className="t-table">
          <thead><tr><th>Nama</th><th>Kelas</th><th>Kelompok</th><th>Setoran Terakhir</th></tr></thead>
          <tbody>
            {students.map((s) => {
              const last = studentScores(db, s.id)[0];
              return (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.nama}</td>
                  <td>{className(db, s.kelasId)}</td>
                  <td>{groupName(db, s.groupId)}</td>
                  <td>{last ? `${surahName(db, last.surahId)} · ${fmtDate(last.tanggal)}` : "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DashboardSiswa({ db, user }) {
  const student = db.students.find((s) => s.id === user.refId);
  const scores = studentScores(db, student.id);
  const attendance = studentAttendance(db, student.id);
  const mk = currentMonthKey();
  const monthScores = scores.filter((s) => monthKey(s.tanggal) === mk);
  const monthAtt = attendance.filter((a) => monthKey(a.tanggal) === mk);
  const chartData = [...scores].reverse().map((s) => ({ tanggal: fmtDate(s.tanggal).slice(0, 6), nilai: s.nilai }));

  return (
    <div>
      <SectionTitle sub={`${className(db, student.kelasId)} · ${groupName(db, student.groupId)}`}>Assalamu'alaikum, {student.nama.split(" ")[0]}</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
        <StatCard icon={BookOpen} label="Total Setoran" value={scores.length} sub={`${monthScores.length} bulan ini`} />
        <StatCard icon={Star} label="Rata-rata Nilai" value={avg(scores.map((s) => s.nilai)) || "-"} accent="gold" />
        <StatCard icon={CalendarCheck} label="Kehadiran Bulan Ini" value={`${attendancePct(monthAtt)}%`} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="t-card" style={{ padding: 18 }}>
          <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Perkembangan Nilai</div>
          {chartData.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid stroke="#E4DCC9" vertical={false} />
                <XAxis dataKey="tanggal" tick={{ fontSize: 11 }} stroke="#8A8064" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#8A8064" />
                <Tooltip />
                <Line type="monotone" dataKey="nilai" stroke="#2F6F63" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <Empty text="Belum ada riwayat setoran." />}
        </div>
        <div className="t-card" style={{ padding: 18 }}>
          <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 14 }}>Jejak Setoran (21 Hari Terakhir)</div>
          <div style={{ fontSize: 12, color: "#8A8064", marginBottom: 14 }}>Setiap manik mewakili satu hari</div>
          <TasbihTracker attendance={attendance} scores={scores} />
        </div>
      </div>
    </div>
  );
}

/* ============================== PRESENSI HARIAN ============================== */
function PresensiHarian({ db, refresh, user }) {
  const teacher = db.teachers.find((t) => t.id === user.refId);
  const group = db.groups.find((g) => g.teacherId === teacher.id);
  const members = groupMembers(db, group.id);
  const availableClasses = db.classes.filter((c) => members.some((m) => m.kelasId === c.id));
  const [kelasFilter, setKelasFilter] = useState("all");
  const visibleMembers = kelasFilter === "all" ? members : members.filter((m) => m.kelasId === kelasFilter);
  const [tanggal, setTanggal] = useState(isoDaysAgo(0));
  const [draft, setDraft] = useState({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const map = {};
    members.forEach((m) => {
      const existing = db.attendance.find((a) => a.studentId === m.id && a.tanggal === tanggal);
      map[m.id] = existing?.status || null;
    });
    setDraft(map);
    setSaved(false);
    // eslint-disable-next-line
  }, [tanggal]);

  function setStatus(studentId, status) {
    setDraft((d) => ({ ...d, [studentId]: status }));
    setSaved(false);
  }
  function hadirSemua() {
    const map = { ...draft };
    visibleMembers.forEach((m) => { map[m.id] = draft[m.id] || "HADIR"; });
    setDraft(map);
    setSaved(false);
  }
  async function simpan() {
    const newRecords = members.filter((m) => draft[m.id]).map((m) => ({
      studentId: m.id,
      tanggal,
      status: draft[m.id],
      note: "",
      inputBy: user.id,
    }));
    if (!newRecords.length) return;
    setSaving(true);
    try {
      await saveAttendanceBatch(newRecords);
      await refresh();
      setSaved(true);
    } catch (e) {
      alert("Gagal menyimpan presensi: " + e.message);
    }
    setSaving(false);
  }

  return (
    <div>
      <SectionTitle sub={`${group.nama} · tandai kehadiran lalu simpan`}>Presensi Harian</SectionTitle>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input type="date" className="t-input" style={{ width: 180 }} value={tanggal} max={isoDaysAgo(0)} onChange={(e) => setTanggal(e.target.value)} />
          {availableClasses.length > 1 && (
            <select className="t-select" style={{ width: 200 }} value={kelasFilter} onChange={(e) => setKelasFilter(e.target.value)}>
              <option value="all">Semua Kelas ({members.length} siswa)</option>
              {availableClasses.map((c) => {
                const count = members.filter((m) => m.kelasId === c.id).length;
                return <option key={c.id} value={c.id}>{c.nama} ({count} siswa)</option>;
              })}
            </select>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="t-btn t-btn-ghost" onClick={hadirSemua}>Tandai Hadir Semua{kelasFilter !== "all" ? " (Kelas Ini)" : ""}</button>
          <button className="t-btn t-btn-primary" onClick={simpan} disabled={saving}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} {saving ? "Menyimpan..." : "Simpan Presensi"}
          </button>
        </div>
      </div>
      {saved && <div className="t-card-soft" style={{ padding: "8px 14px", marginBottom: 14, fontSize: 13, color: "var(--teal)", fontWeight: 600 }}>Presensi tersimpan.</div>}
      <div className="t-card" style={{ padding: 8 }}>
        <table className="t-table">
          <thead><tr><th>Siswa</th><th>Kelas</th><th style={{ width: 320 }}>Status</th></tr></thead>
          <tbody>
            {visibleMembers.map((m) => (
              <tr key={m.id}>
                <td style={{ fontWeight: 600 }}>{m.nama}</td>
                <td>{className(db, m.kelasId)}</td>
                <td>
                  <div style={{ display: "flex", gap: 6 }}>
                    {Object.entries(STATUS_META).map(([key, meta]) => (
                      <button
                        key={key}
                        className={`t-status-btn ${draft[m.id] === key ? "selected-" + key : ""}`}
                        onClick={() => setStatus(m.id, key)}
                      >
                        <meta.icon size={15} /> {meta.label}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================== PENILAIAN TAHFIDZ ============================== */
function PenilaianTahfidz({ db, refresh, user }) {
  const isMentor = user.role === "mentor";
  const scopeStudents = isMentor
    ? mentorStudents(db, db.mentors.find((m) => m.id === user.refId).id)
    : groupMembers(db, db.groups.find((g) => g.teacherId === user.refId).id);

  const availableClasses = db.classes.filter((c) => scopeStudents.some((s) => s.kelasId === c.id));
  const [kelasFilter, setKelasFilter] = useState("all");
  const filteredStudents = kelasFilter === "all" ? scopeStudents : scopeStudents.filter((s) => s.kelasId === kelasFilter);

  const [studentId, setStudentId] = useState(scopeStudents[0]?.id || "");
  const [surahId, setSurahId] = useState(db.surahs[0].id);
  const [ayatMulai, setAyatMulai] = useState(1);
  const [ayatAkhir, setAyatAkhir] = useState(1);
  const [nilai, setNilai] = useState(80);
  const [tanggal, setTanggal] = useState(isoDaysAgo(0));
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  function handleKelasFilter(val) {
    setKelasFilter(val);
    const list = val === "all" ? scopeStudents : scopeStudents.filter((s) => s.kelasId === val);
    setStudentId(list[0]?.id || "");
  }

  const surah = db.surahs.find((s) => s.id === surahId);

  async function submit() {
    if (!studentId) return;
    if (ayatAkhir < ayatMulai) { setMsg("Ayat akhir tidak boleh lebih kecil dari ayat mulai."); return; }
    if (ayatAkhir > surah.ayat) { setMsg(`Surat ${surah.nama} hanya memiliki ${surah.ayat} ayat.`); return; }
    const entry = {
      studentId, tanggal, surahId, ayatMulai: Number(ayatMulai), ayatAkhir: Number(ayatAkhir), nilai: Number(nilai),
      penguji: user.nama, inputBy: user.id,
    };
    setSaving(true);
    try {
      await insertScore(entry);
      await refresh();
      setMsg("Penilaian tersimpan.");
      setTimeout(() => setMsg(""), 2500);
    } catch (e) {
      setMsg("Gagal menyimpan: " + e.message);
    }
    setSaving(false);
  }

  const history = studentScores(db, studentId).slice(0, 6);

  return (
    <div>
      <SectionTitle sub="Catat hasil simakan/setoran hafalan siswa">{isMentor ? "Input Penilaian" : "Penilaian Tahfidz"}</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="t-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {availableClasses.length > 1 && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#8A8064" }}>Sortir berdasarkan Kelas</label>
                <select className="t-select" value={kelasFilter} onChange={(e) => handleKelasFilter(e.target.value)}>
                  <option value="all">Semua Kelas ({scopeStudents.length} siswa)</option>
                  {availableClasses.map((c) => {
                    const count = scopeStudents.filter((s) => s.kelasId === c.id).length;
                    return <option key={c.id} value={c.id}>{c.nama} ({count} siswa)</option>;
                  })}
                </select>
              </div>
            )}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#8A8064" }}>Siswa</label>
              <select className="t-select" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                {filteredStudents.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#8A8064" }}>Tanggal</label>
              <input type="date" className="t-input" max={isoDaysAgo(0)} value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#8A8064" }}>Surat</label>
              <select className="t-select" value={surahId} onChange={(e) => { setSurahId(e.target.value); setAyatMulai(1); setAyatAkhir(1); }}>
                {db.surahs.map((s) => <option key={s.id} value={s.id}>{s.nama} ({s.ayat} ayat)</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#8A8064" }}>Ayat Mulai</label>
                <input type="number" min={1} max={surah.ayat} className="t-input" value={ayatMulai} onChange={(e) => setAyatMulai(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#8A8064" }}>Ayat Akhir</label>
                <input type="number" min={1} max={surah.ayat} className="t-input" value={ayatAkhir} onChange={(e) => setAyatAkhir(e.target.value)} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#8A8064" }}>Nilai: <span className="font-mono" style={{ color: "var(--teal)", fontWeight: 700 }}>{nilai}</span></label>
              <input type="range" min={0} max={100} value={nilai} onChange={(e) => setNilai(e.target.value)} style={{ width: "100%" }} />
            </div>
            {msg && <div style={{ fontSize: 12.5, color: msg.includes("tersimpan") ? "var(--teal)" : "var(--red)", fontWeight: 600 }}>{msg}</div>}
            <button className="t-btn t-btn-primary" style={{ justifyContent: "center" }} onClick={submit} disabled={saving}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} {saving ? "Menyimpan..." : "Simpan Penilaian"}
            </button>
          </div>
        </div>
        <div className="t-card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Riwayat Terbaru &mdash; {scopeStudents.find((s) => s.id === studentId)?.nama}</div>
          {history.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {history.map((h) => (
                <div key={h.id} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--line)", paddingBottom: 8, fontSize: 13 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{surahName(db, h.surahId)} ({h.ayatMulai}-{h.ayatAkhir})</div>
                    <div style={{ fontSize: 11.5, color: "#8A8064" }}>{fmtDate(h.tanggal)} · {h.penguji}</div>
                  </div>
                  <div className="font-mono" style={{ fontWeight: 700, color: "var(--teal)" }}>{h.nilai}</div>
                </div>
              ))}
            </div>
          ) : <Empty text="Belum ada riwayat penilaian." />}
        </div>
      </div>
    </div>
  );
}

/* ============================== REKAP ============================== */
function RekapView({ db, user }) {
  let students = [];
  let title = "Rekap Tahfidz";
  let sub = "";
  if (user.role === "admin") { students = db.students; sub = "Seluruh siswa"; }
  if (user.role === "pengajar") {
    const group = db.groups.find((g) => g.teacherId === user.refId);
    students = groupMembers(db, group.id);
    sub = group.nama;
  }
  if (user.role === "mentor") {
    students = mentorStudents(db, user.refId);
    sub = "Siswa binaan Anda";
  }
  if (user.role === "siswa") {
    students = db.students.filter((s) => s.id === user.refId);
    sub = "Riwayat pribadi";
  }
  const [filter, setFilter] = useState(students[0]?.id || "all");
  const rows = (filter === "all" ? students : students.filter((s) => s.id === filter))
    .flatMap((s) => studentScores(db, s.id).map((sc) => ({ ...sc, _nama: s.nama })))
    .sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1));

  return (
    <div>
      <SectionTitle sub={sub}>{title}</SectionTitle>
      {students.length > 1 && (
        <select className="t-select" style={{ width: 240, marginBottom: 14 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">Semua siswa</option>
          {students.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
        </select>
      )}
      <div className="t-card" style={{ padding: 8 }}>
        <table className="t-table">
          <thead>
            <tr>
              {students.length > 1 && filter === "all" && <th>Siswa</th>}
              <th>Tanggal</th><th>Surat</th><th>Ayat</th><th>Nilai</th><th>Penguji</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((r) => (
              <tr key={r.id}>
                {students.length > 1 && filter === "all" && <td style={{ fontWeight: 600 }}>{r._nama}</td>}
                <td>{fmtDate(r.tanggal)}</td>
                <td>{surahName(db, r.surahId)}</td>
                <td>{r.ayatMulai}-{r.ayatAkhir}</td>
                <td className="font-mono" style={{ fontWeight: 700 }}>{r.nilai}</td>
                <td>{r.penguji}</td>
              </tr>
            )) : (
              <tr><td colSpan={6}><Empty text="Belum ada data setoran." /></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PresensiSiswa({ db, user }) {
  const student = db.students.find((s) => s.id === user.refId);
  const records = studentAttendance(db, student.id);
  return (
    <div>
      <SectionTitle sub="Riwayat kehadiran tahfidz Anda">Presensi Saya</SectionTitle>
      <div className="t-card" style={{ padding: 8 }}>
        <table className="t-table">
          <thead><tr><th>Tanggal</th><th>Status</th></tr></thead>
          <tbody>
            {records.map((r) => {
              const meta = STATUS_META[r.status];
              return (
                <tr key={r.id}>
                  <td>{fmtDate(r.tanggal)}</td>
                  <td>
                    <span className="t-tag" style={{ background: meta.color + "22", color: meta.color }}>
                      <meta.icon size={12} /> {meta.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================== REPORT BULANAN (PDF) ============================== */
function reportStats(db, studentId, mk) {
  const scores = db.scores.filter((s) => s.studentId === studentId && monthKey(s.tanggal) === mk)
    .sort((a, b) => (a.tanggal < b.tanggal ? -1 : 1));
  const prevScores = db.scores.filter((s) => s.studentId === studentId && monthKey(s.tanggal) === prevMonthKey(mk));
  const att = db.attendance.filter((a) => a.studentId === studentId && monthKey(a.tanggal) === mk);
  const totalAyat = scores.reduce((sum, s) => sum + (s.ayatAkhir - s.ayatMulai + 1), 0);
  const avgNilai = avg(scores.map((s) => s.nilai));
  const avgPrev = avg(prevScores.map((s) => s.nilai));
  const delta = prevScores.length ? Math.round((avgNilai - avgPrev) * 10) / 10 : null;
  const kategori = !scores.length ? "Belum Ada Data" : avgNilai >= 85 ? "Sangat Baik" : avgNilai >= 75 ? "Baik" : avgNilai >= 60 ? "Cukup" : "Perlu Pendampingan";
  const counts = { HADIR: 0, SAKIT: 0, IZIN: 0, ALPHA: 0 };
  att.forEach((a) => { counts[a.status] = (counts[a.status] || 0) + 1; });
  return { scores, totalAyat, avgNilai, delta, kategori, counts, pct: attendancePct(att), attCount: att.length };
}

function reportNarrative(student, stats, mkLabel) {
  if (!stats.scores.length) {
    return `Belum ada aktivitas setoran tahfidz yang tercatat untuk ${student.nama} pada periode ${mkLabel}.`;
  }
  let text = `Selama ${mkLabel}, ${student.nama} melakukan ${stats.scores.length} kali setoran dengan total ${stats.totalAyat} ayat, dan tingkat kehadiran ${stats.pct}% (${stats.attCount} pertemuan tercatat). Rata-rata nilai pada periode ini adalah ${stats.avgNilai} dengan kategori capaian "${stats.kategori}"`;
  if (stats.delta !== null) {
    if (stats.delta > 0) text += `, meningkat ${Math.abs(stats.delta)} poin dibanding bulan sebelumnya.`;
    else if (stats.delta < 0) text += `, menurun ${Math.abs(stats.delta)} poin dibanding bulan sebelumnya.`;
    else text += `, relatif stabil dibanding bulan sebelumnya.`;
  } else {
    text += ".";
  }
  return text;
}

function ReportSheet({ db, student, mk }) {
  const stats = reportStats(db, student.id, mk);
  const teacher = db.teachers.find((t) => t.id === db.groups.find((g) => g.id === student.groupId)?.teacherId);
  const kategoriColor = {
    "Sangat Baik": "var(--teal)", "Baik": "var(--teal)", "Cukup": "#7A5E32",
    "Perlu Pendampingan": "var(--red)", "Belum Ada Data": "#8A8064",
  };
  return (
    <div className="report-page">
      <div className="t-card report-sheet" style={{ padding: 32 }}>
        <div className="report-kop">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 8 }}>
            <img src={SMK_LOGO} alt="Logo SMK Telkom Malang" style={{ height: 26, objectFit: "contain" }} />
            <img src={RUTABA_LOGO} alt="Logo Rutaba" style={{ height: 32, borderRadius: "50%", objectFit: "cover" }} />
          </div>
          <div className="font-display" style={{ fontSize: 20, fontWeight: 700 }}>SMK TELKOM MALANG</div>
          <div style={{ fontSize: 13, color: "#8A8064", marginTop: 2 }}>Laporan Perkembangan Tahfidz Bulanan</div>
          <div style={{ fontSize: 12, fontWeight: 600, marginTop: 6 }}>{monthLabel(mk)}</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 13, marginBottom: 18 }}>
          <div><b>Nama</b> &nbsp;: {student.nama}</div>
          <div><b>NIS</b> &nbsp;&nbsp;&nbsp;: {student.nis}</div>
          <div><b>Kelas</b> &nbsp;: {className(db, student.kelasId)}</div>
          <div><b>Kelompok</b> : {groupName(db, student.groupId)}</div>
          <div><b>Jenis Kelamin</b> : {student.jenisKelamin === "L" ? "Laki-laki" : student.jenisKelamin === "P" ? "Perempuan" : "-"}</div>
          <div><b>Pengajar</b> : {teacher?.nama || "-"}</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 18 }}>
          <div className="report-stat-box">
            <div style={{ fontSize: 10.5, color: "#8A8064", fontWeight: 600 }}>KEHADIRAN</div>
            <div className="font-display" style={{ fontSize: 20, fontWeight: 700 }}>{stats.pct}%</div>
          </div>
          <div className="report-stat-box">
            <div style={{ fontSize: 10.5, color: "#8A8064", fontWeight: 600 }}>SETORAN</div>
            <div className="font-display" style={{ fontSize: 20, fontWeight: 700 }}>{stats.scores.length}x</div>
          </div>
          <div className="report-stat-box">
            <div style={{ fontSize: 10.5, color: "#8A8064", fontWeight: 600 }}>TOTAL AYAT</div>
            <div className="font-display" style={{ fontSize: 20, fontWeight: 700 }}>{stats.totalAyat}</div>
          </div>
          <div className="report-stat-box">
            <div style={{ fontSize: 10.5, color: "#8A8064", fontWeight: 600 }}>RATA-RATA NILAI</div>
            <div className="font-display" style={{ fontSize: 20, fontWeight: 700 }}>{stats.avgNilai || "-"}</div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <span className="t-tag" style={{ background: kategoriColor[stats.kategori] + "22", color: kategoriColor[stats.kategori] }}>
            Kategori: {stats.kategori}
          </span>
        </div>

        <div style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 18, color: "#3A362B" }}>
          {reportNarrative(student, stats, monthLabel(mk))}
        </div>

        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Rincian Setoran</div>
        <table className="t-table" style={{ marginBottom: 8 }}>
          <thead><tr><th>Tanggal</th><th>Surat</th><th>Ayat</th><th>Nilai</th><th>Penguji</th></tr></thead>
          <tbody>
            {stats.scores.length ? stats.scores.map((s) => (
              <tr key={s.id}>
                <td>{fmtDate(s.tanggal)}</td>
                <td>{surahName(db, s.surahId)}</td>
                <td>{s.ayatMulai}-{s.ayatAkhir}</td>
                <td className="font-mono" style={{ fontWeight: 700 }}>{s.nilai}</td>
                <td>{s.penguji}</td>
              </tr>
            )) : <tr><td colSpan={5}><Empty text="Tidak ada setoran pada periode ini." /></td></tr>}
          </tbody>
        </table>

        <div className="report-sig">
          <div>
            <div>Pengajar / Pembina Tahfidz</div>
            <div className="line">{teacher?.nama || "-"}</div>
          </div>
          <div>
            <div>Mengetahui, Kepala Program</div>
            <div className="line">Kepala Program Keagamaan</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportBulanan({ db, user }) {
  let students = [];
  let sub = "";
  if (user.role === "admin") { students = db.students; sub = "Seluruh siswa"; }
  if (user.role === "pengajar") {
    const group = db.groups.find((g) => g.teacherId === user.refId);
    students = groupMembers(db, group.id); sub = group.nama;
  }
  if (user.role === "mentor") { students = mentorStudents(db, user.refId); sub = "Siswa binaan Anda"; }

  const [mk, setMk] = useState(currentMonthKey());
  const [studentId, setStudentId] = useState(students[0]?.id || "");
  const months = lastMonthOptions(6);

  function handleDownload() { window.print(); }

  const selected = studentId === "all" ? students : students.filter((s) => s.id === studentId);

  return (
    <div>
      <SectionTitle sub={sub}>Report Bulanan</SectionTitle>
      <div className="no-print" style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
        <select className="t-select" style={{ width: 220 }} value={studentId} onChange={(e) => setStudentId(e.target.value)}>
          {students.length > 1 && <option value="all">Semua siswa ({sub})</option>}
          {students.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
        </select>
        <select className="t-select" style={{ width: 180 }} value={mk} onChange={(e) => setMk(e.target.value)}>
          {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
        <button className="t-btn t-btn-gold" onClick={handleDownload}>
          <FileText size={15} /> Unduh PDF
        </button>
        <span style={{ fontSize: 11.5, color: "#8A8064" }}>Pada dialog cetak, pilih tujuan &ldquo;Save as PDF&rdquo;.</span>
      </div>

      {selected.length ? (
        <div className="print-area">
          {selected.map((s) => <ReportSheet key={s.id} db={db} student={s} mk={mk} />)}
        </div>
      ) : <Empty text="Tidak ada siswa pada cakupan ini." />}
    </div>
  );
}

/* ============================== ADMIN: MASTER DATA ============================== */
function MasterData({ db, refresh }) {
  const [tab, setTab] = useState("siswa");
  const [form, setForm] = useState({ nama: "", nis: "", kelasId: db.classes[0]?.id, groupId: db.groups[0]?.id, jenisKelamin: "L" });
  const [newClass, setNewClass] = useState("");
  const [newGroup, setNewGroup] = useState({ nama: "", teacherId: db.teachers[0]?.id });
  const [preview, setPreview] = useState([]);
  const [importGroupId, setImportGroupId] = useState(db.groups[0]?.id);
  const [importError, setImportError] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function addStudent() {
    if (!form.nama.trim() || !form.nis.trim()) return;
    setBusy(true);
    try {
      await insertStudent({ nis: form.nis, nama: form.nama, kelasId: form.kelasId, groupId: form.groupId, jenisKelamin: form.jenisKelamin });
      await refresh();
      setForm({ ...form, nama: "", nis: "" });
    } catch (e) {
      alert("Gagal menambah siswa: " + e.message);
    }
    setBusy(false);
  }
  async function removeStudent(id) {
    if (!confirm("Hapus siswa ini beserta seluruh riwayat presensi & nilainya?")) return;
    setBusy(true);
    try {
      await deleteStudent(id);
      await refresh();
    } catch (e) {
      alert("Gagal menghapus siswa: " + e.message);
    }
    setBusy(false);
  }
  async function addClass() {
    if (!newClass.trim()) return;
    setBusy(true);
    try {
      await insertClass(newClass);
      await refresh();
      setNewClass("");
    } catch (e) {
      alert("Gagal menambah kelas: " + e.message);
    }
    setBusy(false);
  }
  async function removeClass(id) {
    if (!confirm("Hapus kelas ini?")) return;
    setBusy(true);
    try {
      await deleteClass(id);
      await refresh();
    } catch (e) {
      alert("Gagal menghapus kelas (mungkin masih dipakai siswa): " + e.message);
    }
    setBusy(false);
  }
  async function addGroup() {
    if (!newGroup.nama.trim()) return;
    setBusy(true);
    try {
      await insertGroup(newGroup.nama, newGroup.teacherId);
      await refresh();
      setNewGroup({ ...newGroup, nama: "" });
    } catch (e) {
      alert("Gagal menambah kelompok: " + e.message);
    }
    setBusy(false);
  }
  async function removeGroup(id) {
    if (!confirm("Hapus kelompok ini?")) return;
    setBusy(true);
    try {
      await deleteGroup(id);
      await refresh();
    } catch (e) {
      alert("Gagal menghapus kelompok (mungkin masih ada siswa di dalamnya): " + e.message);
    }
    setBusy(false);
  }

  function normalizeHeader(h) {
    return String(h || "").trim().toLowerCase().replace(/[^a-z]/g, "");
  }
  function normalizeGender(v) {
    const s = String(v || "").trim().toLowerCase();
    if (["l", "lakilaki", "pria", "male", "m"].includes(s.replace(/[^a-z]/g, ""))) return "L";
    if (["p", "perempuan", "wanita", "female", "f"].includes(s.replace(/[^a-z]/g, ""))) return "P";
    return "";
  }
  function getField(row, names) {
    const keys = Object.keys(row);
    for (const k of keys) {
      if (names.includes(normalizeHeader(k))) return row[k];
    }
    return "";
  }

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImportError(""); setImportMsg("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target.result);
        const wb = XLSX.read(data, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        const mapped = json
          .map((row) => ({
            nama: String(getField(row, ["nama", "namasiswa", "name"])).trim(),
            nis: String(getField(row, ["nis", "nomorindukswa", "nomorindukssiswa", "nisn"])).trim(),
            kelas: String(getField(row, ["kelas", "class", "rombel"])).trim(),
            jenisKelamin: normalizeGender(getField(row, ["jeniskelamin", "gender", "jk", "lp"])),
          }))
          .filter((r) => r.nama);
        if (!mapped.length) {
          setImportError("Tidak ada baris valid ditemukan. Pastikan file memiliki kolom Nama, Kelas, dan Jenis Kelamin.");
          setPreview([]);
        } else {
          setPreview(mapped);
        }
      } catch (err) {
        setImportError("Gagal membaca file. Pastikan formatnya .xlsx, .xls, atau .csv.");
        setPreview([]);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  }

  async function commitImport() {
    setBusy(true);
    try {
      let classes = db.classes;
      const rows = [];
      for (let i = 0; i < preview.length; i++) {
        const row = preview[i];
        let kelasObj = null;
        if (row.kelas) {
          kelasObj = await findOrCreateClassByName(row.kelas, classes);
          if (!classes.some((c) => c.id === kelasObj.id)) classes = [...classes, kelasObj];
        }
        rows.push({
          nis: row.nis || `IMP${String(Date.now()).slice(-6)}${i}`,
          nama: row.nama,
          jenisKelamin: row.jenisKelamin || "",
          kelasId: kelasObj ? kelasObj.id : (db.classes[0]?.id || ""),
          groupId: importGroupId || db.groups[0]?.id,
        });
      }
      await bulkInsertStudents(rows);
      await refresh();
      setImportMsg(`${rows.length} siswa berhasil diimpor.`);
      setPreview([]);
    } catch (e) {
      setImportError("Gagal mengimpor: " + e.message);
    }
    setBusy(false);
  }

  function downloadTemplate() {
    const csv = "Nama,NIS,Kelas,Jenis Kelamin\nContoh Siswa Satu,2201099,X RPL 1,Laki-laki\nContoh Siswa Dua,2201098,XI TKJ 1,Perempuan\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "Template_Import_Siswa.csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <SectionTitle sub="Kelola data induk: siswa, kelas, dan kelompok tahfidz">Master Data</SectionTitle>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["siswa", "kelas", "kelompok"].map((t) => (
          <button key={t} className="t-btn" style={{ background: tab === t ? "var(--ink)" : "var(--panel-soft)", color: tab === t ? "white" : "var(--ink)" }} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "siswa" && (
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="t-card" style={{ padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Tambah Siswa Manual</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input className="t-input" placeholder="Nama siswa" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} />
                <input className="t-input" placeholder="NIS" value={form.nis} onChange={(e) => setForm({ ...form, nis: e.target.value })} />
                <select className="t-select" value={form.jenisKelamin} onChange={(e) => setForm({ ...form, jenisKelamin: e.target.value })}>
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
                <select className="t-select" value={form.kelasId} onChange={(e) => setForm({ ...form, kelasId: e.target.value })}>
                  {db.classes.map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}
                </select>
                <select className="t-select" value={form.groupId} onChange={(e) => setForm({ ...form, groupId: e.target.value })}>
                  {db.groups.map((g) => <option key={g.id} value={g.id}>{g.nama}</option>)}
                </select>
                <button className="t-btn t-btn-primary" style={{ justifyContent: "center" }} onClick={addStudent} disabled={busy}><Plus size={14} /> Tambah</button>
              </div>
            </div>

            <div className="t-card" style={{ padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Import dari File</div>
              <div style={{ fontSize: 11.5, color: "#8A8064", marginBottom: 10 }}>
                Format .xlsx, .xls, atau .csv dengan kolom Nama, NIS (opsional), Kelas, dan Jenis Kelamin.
              </div>
              <button className="t-btn t-btn-ghost" style={{ width: "100%", justifyContent: "center", marginBottom: 8 }} onClick={downloadTemplate}>
                <FileText size={14} /> Unduh Template
              </button>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#8A8064" }}>Kelompok tujuan (untuk semua data yang diimpor)</label>
                <select className="t-select" style={{ marginBottom: 8 }} value={importGroupId} onChange={(e) => setImportGroupId(e.target.value)}>
                  {db.groups.map((g) => <option key={g.id} value={g.id}>{g.nama}</option>)}
                </select>
              </div>
              <input type="file" accept=".xlsx,.xls,.csv" className="t-input" style={{ padding: 6 }} onChange={handleFile} />
              {importError && <div style={{ fontSize: 12, color: "var(--red)", marginTop: 8, fontWeight: 600 }}>{importError}</div>}
              {importMsg && <div style={{ fontSize: 12, color: "var(--teal)", marginTop: 8, fontWeight: 600 }}>{importMsg}</div>}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {preview.length > 0 && (
              <div className="t-card-soft" style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>Pratinjau Import &mdash; {preview.length} siswa terdeteksi</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="t-btn t-btn-ghost" onClick={() => setPreview([])}>Batalkan</button>
                    <button className="t-btn t-btn-primary" onClick={commitImport} disabled={busy}><CheckCircle2 size={14} /> {busy ? "Mengimpor..." : `Import ${preview.length} Siswa`}</button>
                  </div>
                </div>
                <div style={{ maxHeight: 260, overflowY: "auto" }} className="t-scrollbar">
                  <table className="t-table">
                    <thead><tr><th>Nama</th><th>NIS</th><th>Kelas</th><th>L/P</th></tr></thead>
                    <tbody>
                      {preview.map((r, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{r.nama}</td>
                          <td className="font-mono">{r.nis || <span style={{ color: "#B4AA8C" }}>otomatis</span>}</td>
                          <td>{r.kelas || <span style={{ color: "var(--red)" }}>kosong</span>}</td>
                          <td>{r.jenisKelamin || <span style={{ color: "var(--red)" }}>?</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className="t-card" style={{ padding: 8 }}>
              <table className="t-table">
                <thead><tr><th>NIS</th><th>Nama</th><th>L/P</th><th>Kelas</th><th>Kelompok</th><th></th></tr></thead>
                <tbody>
                  {db.students.map((s) => (
                    <tr key={s.id}>
                      <td className="font-mono">{s.nis}</td>
                      <td style={{ fontWeight: 600 }}>{s.nama}</td>
                      <td>{s.jenisKelamin || "-"}</td>
                      <td>{className(db, s.kelasId)}</td>
                      <td>{groupName(db, s.groupId)}</td>
                      <td><button className="t-btn t-btn-danger" style={{ padding: "5px 8px" }} onClick={() => removeStudent(s.id)}><Trash2 size={13} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "kelas" && (
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16 }}>
          <div className="t-card" style={{ padding: 16, height: "fit-content" }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Tambah Kelas</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input className="t-input" placeholder="Nama kelas (mis. X RPL 2)" value={newClass} onChange={(e) => setNewClass(e.target.value)} />
              <button className="t-btn t-btn-primary" style={{ justifyContent: "center" }} onClick={addClass} disabled={busy}><Plus size={14} /> Tambah</button>
            </div>
          </div>
          <div className="t-card" style={{ padding: 8 }}>
            <table className="t-table">
              <thead><tr><th>Nama Kelas</th><th>Jumlah Siswa</th><th></th></tr></thead>
              <tbody>
                {db.classes.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.nama}</td>
                    <td>{db.students.filter((s) => s.kelasId === c.id).length}</td>
                    <td><button className="t-btn t-btn-danger" style={{ padding: "5px 8px" }} onClick={() => removeClass(c.id)}><Trash2 size={13} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "kelompok" && (
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16 }}>
          <div className="t-card" style={{ padding: 16, height: "fit-content" }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Tambah Kelompok</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input className="t-input" placeholder="Nama kelompok" value={newGroup.nama} onChange={(e) => setNewGroup({ ...newGroup, nama: e.target.value })} />
              <select className="t-select" value={newGroup.teacherId} onChange={(e) => setNewGroup({ ...newGroup, teacherId: e.target.value })}>
                {db.teachers.map((t) => <option key={t.id} value={t.id}>{t.nama}</option>)}
              </select>
              <button className="t-btn t-btn-primary" style={{ justifyContent: "center" }} onClick={addGroup} disabled={busy}><Plus size={14} /> Tambah</button>
            </div>
          </div>
          <div className="t-card" style={{ padding: 8 }}>
            <table className="t-table">
              <thead><tr><th>Kelompok</th><th>Pengajar</th><th>Jumlah Siswa</th><th></th></tr></thead>
              <tbody>
                {db.groups.map((g) => (
                  <tr key={g.id}>
                    <td style={{ fontWeight: 600 }}>{g.nama}</td>
                    <td>{db.teachers.find((t) => t.id === g.teacherId)?.nama}</td>
                    <td>{groupMembers(db, g.id).length}</td>
                    <td><button className="t-btn t-btn-danger" style={{ padding: "5px 8px" }} onClick={() => removeGroup(g.id)}><Trash2 size={13} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================== ADMIN: MANAJEMEN USER ============================== */
function ManajemenUser({ db, refresh }) {
  const [busyId, setBusyId] = useState(null);
  async function toggle(p) {
    setBusyId(p.id);
    try {
      await setProfileStatus(p.id, p.status === "aktif" ? "nonaktif" : "aktif");
      await refresh();
    } catch (e) {
      alert("Gagal mengubah status: " + e.message);
    }
    setBusyId(null);
  }
  const roleColor = { admin: "var(--red)", pengajar: "var(--teal)", mentor: "var(--blue)", siswa: "#8A8064" };
  return (
    <div>
      <SectionTitle sub="Aktifkan atau nonaktifkan akses akun pengguna. Untuk menambah akun baru, buat dulu di Supabase Authentication lalu hubungkan lewat tabel profiles.">Manajemen User</SectionTitle>
      <div className="t-card" style={{ padding: 8 }}>
        <table className="t-table">
          <thead><tr><th>Nama</th><th>Role</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {db.profiles.map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.nama}</td>
                <td><span className="t-tag" style={{ background: roleColor[p.role] + "1A", color: roleColor[p.role] }}>{ROLE_LABEL[p.role]}</span></td>
                <td>
                  <span className="t-tag" style={{ background: p.status === "aktif" ? "var(--teal-soft)" : "var(--red-soft)", color: p.status === "aktif" ? "var(--teal)" : "var(--red)" }}>
                    {p.status === "aktif" ? "Aktif" : "Nonaktif"}
                  </span>
                </td>
                <td>
                  {p.role !== "admin" && (
                    <button className="t-btn t-btn-ghost" style={{ padding: "5px 10px" }} onClick={() => toggle(p)} disabled={busyId === p.id}>
                      {busyId === p.id ? "..." : p.status === "aktif" ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================== ADMIN: MONITORING ============================== */
function Monitoring({ db }) {
  const mk = currentMonthKey();
  const rows = db.groups.map((g) => {
    const members = groupMembers(db, g.id);
    const ids = members.map((m) => m.id);
    const att = db.attendance.filter((a) => monthKey(a.tanggal) === mk && ids.includes(a.studentId));
    const sc = db.scores.filter((s) => monthKey(s.tanggal) === mk && ids.includes(s.studentId));
    return {
      nama: g.nama,
      pengajar: db.teachers.find((t) => t.id === g.teacherId)?.nama,
      jumlahSiswa: members.length,
      kehadiran: attendancePct(att),
      setoran: sc.length,
      rataNilai: avg(sc.map((s) => s.nilai)) || 0,
    };
  });
  return (
    <div>
      <SectionTitle sub="Perbandingan performa antar kelompok tahfidz bulan ini">Monitoring</SectionTitle>
      <div className="t-card" style={{ padding: 18, marginBottom: 16 }}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={rows}>
            <CartesianGrid stroke="#E4DCC9" vertical={false} />
            <XAxis dataKey="nama" tick={{ fontSize: 12 }} stroke="#8A8064" />
            <YAxis tick={{ fontSize: 12 }} stroke="#8A8064" />
            <Tooltip />
            <Bar dataKey="setoran" fill="#2F6F63" radius={[6, 6, 0, 0]} name="Jumlah Setoran" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="t-card" style={{ padding: 8 }}>
        <table className="t-table">
          <thead><tr><th>Kelompok</th><th>Pengajar</th><th>Siswa</th><th>Kehadiran</th><th>Setoran</th><th>Rata-rata Nilai</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.nama}>
                <td style={{ fontWeight: 600 }}>{r.nama}</td>
                <td>{r.pengajar}</td>
                <td>{r.jumlahSiswa}</td>
                <td>{r.kehadiran}%</td>
                <td>{r.setoran}</td>
                <td className="font-mono" style={{ fontWeight: 700 }}>{r.rataNilai}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================== APP ROOT ============================== */
export default function TahfidzApp() {
  const [db, setDb] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [view, setView] = useState("dashboard");

  async function refresh() {
    try {
      const data = await fetchAllData();
      setDb(data);
    } catch (e) {
      console.error("Gagal memuat data:", e);
    }
  }

  async function handleSession(session) {
    if (!session) {
      setProfile(null);
      setDb(null);
      setLoading(false);
      return;
    }
    const { data: prof, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (error || !prof) {
      setAuthError("Akun ini belum terhubung ke profil peran. Hubungi Admin untuk menyelesaikan setup akun.");
      await supabase.auth.signOut();
      setProfile(null);
      setLoading(false);
      return;
    }
    if (prof.status !== "aktif") {
      setAuthError("Akun Anda sedang dinonaktifkan. Hubungi Admin.");
      await supabase.auth.signOut();
      setProfile(null);
      setLoading(false);
      return;
    }
    setAuthError("");
    setProfile({ id: prof.id, nama: prof.nama, role: prof.role, refId: prof.ref_id, status: prof.status });
    await refresh();
    setLoading(false);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => handleSession(session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });
    return () => listener.subscription.unsubscribe();
    // eslint-disable-next-line
  }, []);

  async function handleLoginSuccess() {
    setLoading(true);
    setView("dashboard");
    // handleSession dipanggil otomatis lewat onAuthStateChange
  }
  async function handleLogout() {
    await supabase.auth.signOut();
    setView("dashboard");
  }

  if (loading) {
    return (
      <div className="tahfidz-root" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <GlobalStyle />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, color: "#8A8064" }}>
          <Loader2 className="animate-spin" size={26} />
          <div style={{ fontSize: 13 }}>Menghubungkan ke database...</div>
        </div>
      </div>
    );
  }

  if (!profile || !db) {
    return (
      <div>
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
        {authError && (
          <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: "#B5533F", color: "white", padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, maxWidth: 380, textAlign: "center" }}>
            {authError}
          </div>
        )}
      </div>
    );
  }

  const user = profile;

  let content = null;
  if (view === "dashboard") {
    if (user.role === "admin") content = <DashboardAdmin db={db} />;
    if (user.role === "pengajar") content = <DashboardPengajar db={db} user={user} />;
    if (user.role === "mentor") content = <DashboardMentor db={db} user={user} />;
    if (user.role === "siswa") content = <DashboardSiswa db={db} user={user} />;
  } else if (view === "presensi") {
    content = user.role === "pengajar" ? <PresensiHarian db={db} refresh={refresh} user={user} /> : <PresensiSiswa db={db} user={user} />;
  } else if (view === "penilaian") {
    content = <PenilaianTahfidz db={db} refresh={refresh} user={user} />;
  } else if (view === "rekap") {
    content = <RekapView db={db} user={user} />;
  } else if (view === "master") {
    content = <MasterData db={db} refresh={refresh} />;
  } else if (view === "userman") {
    content = <ManajemenUser db={db} refresh={refresh} />;
  } else if (view === "monitoring") {
    content = <Monitoring db={db} />;
  } else if (view === "report") {
    content = <ReportBulanan db={db} user={user} />;
  }

  return (
    <div className="tahfidz-root" style={{ display: "flex" }}>
      <GlobalStyle />
      <Sidebar user={user} view={view} setView={setView} onLogout={handleLogout} />
      <div style={{ flex: 1, padding: 28, maxWidth: 1180 }}>{content}</div>
    </div>
  );
}

import { surahNumber, sortSurahs, surahsForJuz } from "./quranOrder.js";
import { resolvePicSignature } from "./reportSignature.js";
import AlertList from "./StudentAttentionList.jsx";
import { tahfidzData, isTahfidzStudent } from "./studentEligibility.js";
import StudentReligionEditor from "./StudentReligionEditor.jsx";
import "./studentUpdate.css";
import "./userManagement.css";
import RoleChangeButton from "./RoleChangeButton.jsx";
import AppHeader from "./AppHeader.jsx";
import { TeacherAttendanceAdmin, TeacherAttendanceDashboard } from "./TeacherAttendance.jsx";
import "./theme.css";
import "./dashboardPolish.css";
import { AdminUserActions, DeleteScoreButton } from "./ExtraFeatures.jsx";
import { PIC_TAHFIDZ, defaultReportDate, longDateID } from "./reportTools.js";
import { fetchReportMonthSettings, saveReportMonthSettings } from "./db.js";
import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard, ClipboardCheck, BookOpen, Users, Settings, BarChart3,
  FileText, LogOut, CheckCircle2, XCircle, MinusCircle, CircleDot,
  GraduationCap, UserCog, Shield, ChevronRight, Plus, Trash2,
  Loader2, BookMarked, TrendingUp, CalendarCheck, Star, AlertTriangle, Trophy, KeyRound, Mail, Download, Printer, Menu,
  Upload, Award, Phone, MapPin, Stamp, ImageIcon
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar,
} from "recharts";
import { supabase } from "./supabaseClient.js";
import {
  fetchAllData, fetchActivityData, fetchStudentScores, fetchScoresForStudents, fetchAttendanceForDate, saveAttendanceBatch, insertScore, bulkInsertScores, insertStudent, bulkInsertStudents, bulkUpsertStudents,
  deleteStudent, insertClass, deleteClass, findOrCreateClassByName, updateClassTeacher,
  setProfileStatus, changeOwnPassword, sendPasswordResetEmail, createUserAccount,
  updateStudentClass, bulkUpdateStudentClass, bulkDeleteStudents,
  uploadFile, updateOwnSignature, updateTeacherProfile, addCertification, deleteCertification,
  updateSchoolStamp, fetchRiwayatPendidikan, addRiwayatPendidikan, deleteRiwayatPendidikan,
} from "./db.js";

const CLIENT_REQUEST_TIMEOUT_MS = 15000;
let xlsxModulePromise;

function withClientTimeout(request, label, timeoutMs = CLIENT_REQUEST_TIMEOUT_MS) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} belum merespons setelah ${Math.round(timeoutMs / 1000)} detik.`)), timeoutMs);
  });
  return Promise.race([Promise.resolve(request), timeout]).finally(() => clearTimeout(timer));
}

async function loadXlsx() {
  xlsxModulePromise ||= import("xlsx");
  const module = await xlsxModulePromise;
  return module.default?.utils ? module.default : module;
}


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
    .dashboard-clock { min-width:164px; padding:9px 12px; border:1px solid #e4e4e7; border-radius:12px; background:#fff; color:#27272a; text-align:right; box-shadow:0 3px 12px #18181b0b; }
    .dashboard-clock-time { font-size:19px; font-weight:800; line-height:1.15; letter-spacing:.035em; font-variant-numeric:tabular-nums; white-space:nowrap; }
    .dashboard-clock-date { margin-top:4px; color:#71717a; font-size:11px; line-height:1.25; white-space:nowrap; }
    .dashboard-intro-actions { display:flex; align-items:center; gap:12px; flex-shrink:0; }
    .dashboard-intro { flex-wrap:wrap; }
    .dashboard-section-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; flex-wrap:wrap; }
    .portal-intro .dashboard-clock { border-color:#ffffff24; background:#ffffff12; color:#fff; box-shadow:none; }
    .portal-intro .dashboard-clock-date { color:#f4f4f5; }

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

    /* ---- Layout grid yang menyesuaikan lebar layar ---- */
    .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); }
    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); }
    .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); }
    .master-grid { display: grid; grid-template-columns: 300px 1fr; gap: 16px; }

    .app-topbar {
      display: none;
      align-items: center; gap: 12px;
      padding: 12px 16px; background: var(--ink); position: sticky; top: 0; z-index: 30;
    }
    .app-topbar button { background: transparent; border: none; color: white; padding: 4px; cursor: pointer; }
    .sidebar-overlay { display: none; }

    @media (max-width: 980px) {
      .master-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 760px) {
      .grid-4 { grid-template-columns: repeat(2, 1fr); }
      .grid-3 { grid-template-columns: repeat(2, 1fr); }
      .grid-2 { grid-template-columns: 1fr; }
    }
    @media (max-width: 600px) {
      .dashboard-intro { flex-direction:column; align-items:stretch; }
      .dashboard-intro-actions { width:100%; justify-content:space-between; }
      .dashboard-intro-actions .dashboard-clock { text-align:left; }
    }
    @media (max-width: 480px) {
      .grid-4 { grid-template-columns: 1fr; }
      .grid-3 { grid-template-columns: 1fr; }
    }

    @media (max-width: 860px) {
      .app-topbar { display: flex; }
      .app-sidebar {
        position: fixed !important; left: 0; top: 0; bottom: 0; z-index: 50;
        transform: translateX(-100%); transition: transform .22s ease;
        box-shadow: 4px 0 24px rgba(0,0,0,0.25);
      }
      .app-sidebar.open { transform: translateX(0); }
      .sidebar-overlay.open {
        display: block; position: fixed; inset: 0; background: rgba(27,58,52,0.45); z-index: 40;
      }
      .app-content { padding: 16px !important; }
    }

    .report-sheet { max-width: 760px; margin: 0 auto; }
    .report-kop { text-align: center; border-bottom: 2px solid var(--ink); padding-bottom: 14px; margin-bottom: 18px; }
    .report-stat-box { background: var(--panel-soft); border-radius: 10px; padding: 12px; text-align: center; }
    .report-sig { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 34px; }
    .report-sig div { text-align: center; font-size: 12.5px; }
    .report-sig .line { margin-top: 12px; border-top: 1px solid var(--ink); padding-top: 4px; font-weight: 600; }

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
function todayLongID() {
  return new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
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
function safeExportName(value) {
  return String(value || "kelas").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 60);
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
function teacherName(db, id) {
  return db.teachers.find((t) => t.id === id)?.nama || "-";
}
function studentName(db, id) {
  return db.students.find((s) => s.id === id)?.nama || "-";
}
function classTeacherId(db, kelasId) {
  return db.classes.find((c) => c.id === kelasId)?.teacherId || null;
}
function teacherClasses(db, teacherId) {
  return db.classes.filter((c) => c.teacherId === teacherId);
}
function teacherStudents(db, teacherId) {
  const classIds = teacherClasses(db, teacherId).map((c) => c.id);
  return db.students.filter((s) => classIds.includes(s.kelasId) && isTahfidzStudent(s));
}
function classListLabel(classes) {
  return classes.length ? classes.map((c) => c.nama).join(", ") : "Belum ada kelas ditugaskan";
}
function mentorStudents(db, mentorId) {
  const ids = db.mentorAssignments.filter((ma) => ma.mentorId === mentorId).map((ma) => ma.studentId);
  return db.students.filter((s) => ids.includes(s.id) && isTahfidzStudent(s));
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

function Leaderboard({ rows, db }) {
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
            <div style={{ fontWeight: 600, fontSize: 13 }}>{r.student.nama}</div><div className="student-class-label">{className(db, r.student.kelasId)}</div>
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

function DashboardClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const timeText = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);
  const dateText = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(now);

  return (
    <div className="dashboard-clock" role="group" aria-label={`Waktu saat ini ${dateText}, ${timeText} WIB`}>
      <div className="dashboard-clock-time">{timeText} WIB</div>
      <div className="dashboard-clock-date">{dateText}</div>
    </div>
  );
}

function Empty({ text }) {
  return <div style={{ padding: 24, textAlign: "center", color: "#8A8064", fontSize: 13 }}>{text}</div>;
}

/* ============================== LOGIN ============================== */
function LoginScreen({ onLoginSuccess }) {
  const [mode, setMode] = useState("login"); // "login" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setInfo("");
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

  async function handleForgot(e) {
    e.preventDefault();
    setError(""); setInfo("");
    if (!email.trim()) return;
    setLoading(true);
    try {
      await sendPasswordResetEmail(email.trim());
      setInfo("Link reset password sudah dikirim ke email tersebut (cek folder Spam kalau tidak ada di Inbox).");
    } catch (e) {
      setError("Gagal mengirim email reset: " + e.message);
    }
    setLoading(false);
  }

  return (
    <div className="tahfidz-root saqu-auth" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <GlobalStyle />
      <form onSubmit={mode === "login" ? handleSubmit : handleForgot} style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 14 }}>
            <div className="saquin-mark saquin-login-mark" aria-hidden="true">S</div>
            <div className="saquin-login-wordmark"><strong>SAQUIN</strong><span>Sahabat Quran Indonesia</span></div>
          </div>
          <h1 className="saqu-auth-title">{mode === "login" ? "Selamat datang" : "Lupa password?"}</h1>
          <p style={{ color: "#8A8064", marginTop: 6, fontSize: 14 }}>
            {mode === "login" ? "Masuk ke akun SAQUIN Anda." : "Masukkan email untuk menerima link reset password"}
          </p>
        </div>

        <div className="t-card" style={{ padding: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label htmlFor="saqu-email" style={{ fontSize: 12, fontWeight: 600, color: "#8A8064" }}>Email</label>
              <input id="saqu-email" type="email" className="t-input" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@sekolah.sch.id" required />
            </div>
            {mode === "login" && (
              <div>
                <label htmlFor="saqu-password" style={{ fontSize: 12, fontWeight: 600, color: "#8A8064" }}>Password</label>
                <input id="saqu-password" type="password" className="t-input" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            )}
            {error && <div style={{ fontSize: 12.5, color: "var(--red)", fontWeight: 600 }}>{error}</div>}
            {info && <div style={{ fontSize: 12.5, color: "var(--teal)", fontWeight: 600 }}>{info}</div>}
            <button type="submit" className="t-btn t-btn-primary" style={{ justifyContent: "center", marginTop: 4 }} disabled={loading}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : mode === "login" ? <ChevronRight size={15} /> : <Mail size={15} />}
              {" "}{loading ? "Memproses..." : mode === "login" ? "Masuk" : "Kirim Link Reset"}
            </button>
            <button
              type="button"
              onClick={() => { setMode(mode === "login" ? "forgot" : "login"); setError(""); setInfo(""); }}
              style={{ background: "none", border: "none", color: "var(--teal)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: 4 }}
            >
              {mode === "login" ? "Lupa password?" : "Kembali ke halaman login"}
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
    { id: "teacher-attendance", label: "Kehadiran Pengajar", icon: CalendarCheck },
    { id: "master", label: "Master Data", icon: Users },
    { id: "userman", label: "Manajemen User", icon: UserCog },
    { id: "monitoring", label: "Monitoring", icon: BarChart3 },
    { id: "rekap", label: "Rekap Kelas", icon: FileText },
    { id: "report", label: "Report Bulanan", icon: FileText },
    { id: "profil", label: "Profil Saya", icon: Stamp },
    { id: "password", label: "Ganti Password", icon: KeyRound },
  ],
  pengajar: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "presensi", label: "Presensi Harian", icon: ClipboardCheck },
    { id: "penilaian", label: "Penilaian Tahfidz", icon: BookOpen },
    { id: "rekap", label: "Rekap Kelas", icon: FileText },
    { id: "report", label: "Report Bulanan", icon: FileText },
    { id: "profil", label: "Profil Saya", icon: Award },
    { id: "password", label: "Ganti Password", icon: KeyRound },
  ],
  mentor: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "penilaian", label: "Input Penilaian", icon: BookOpen },
    { id: "rekap", label: "Rekap Siswa Binaan", icon: FileText },
    { id: "report", label: "Report Bulanan", icon: FileText },
    { id: "password", label: "Ganti Password", icon: KeyRound },
  ],
  siswa: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "rekap", label: "Rekap Tahfidz", icon: BookOpen },
    { id: "presensi", label: "Presensi Saya", icon: ClipboardCheck },
    { id: "password", label: "Ganti Password", icon: KeyRound },
  ],
};

const ROLE_LABEL = { admin: "Admin", pengajar: "Pengajar Tahfidz", mentor: "Mentor", siswa: "Siswa" };

function GantiPassword({ onDone }) {
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    if (pw1.length < 6) { setMsg("Password minimal 6 karakter."); return; }
    if (pw1 !== pw2) { setMsg("Konfirmasi password tidak sama."); return; }
    setBusy(true);
    try {
      await changeOwnPassword(pw1);
      setMsg("Password berhasil diubah.");
      setPw1(""); setPw2("");
    } catch (e) {
      setMsg("Gagal mengubah password: " + e.message);
    }
    setBusy(false);
  }

  return (
    <div>
      <SectionTitle sub="Ubah password untuk akun Anda sendiri">Ganti Password</SectionTitle>
      <form onSubmit={submit} className="t-card" style={{ padding: 20, maxWidth: 400 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#8A8064" }}>Password Baru</label>
            <input type="password" className="t-input" value={pw1} onChange={(e) => setPw1(e.target.value)} required minLength={6} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#8A8064" }}>Konfirmasi Password Baru</label>
            <input type="password" className="t-input" value={pw2} onChange={(e) => setPw2(e.target.value)} required minLength={6} />
          </div>
          {msg && <div style={{ fontSize: 12.5, color: msg.includes("berhasil") ? "var(--teal)" : "var(--red)", fontWeight: 600 }}>{msg}</div>}
          <button type="submit" className="t-btn t-btn-primary" style={{ justifyContent: "center" }} disabled={busy}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />} {busy ? "Menyimpan..." : "Simpan Password Baru"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ResetPasswordScreen({ onDone }) {
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    if (pw1.length < 6) { setMsg("Password minimal 6 karakter."); return; }
    if (pw1 !== pw2) { setMsg("Konfirmasi password tidak sama."); return; }
    setBusy(true);
    try {
      await changeOwnPassword(pw1);
      onDone();
    } catch (e) {
      setMsg("Gagal: " + e.message);
    }
    setBusy(false);
  }

  return (
    <div className="tahfidz-root saqu-auth" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <GlobalStyle />
      <form onSubmit={submit} style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 14 }}>
            <div className="saquin-mark saquin-login-mark" aria-hidden="true">S</div>
            <div className="saquin-login-wordmark"><strong>SAQUIN</strong><span>Sahabat Quran Indonesia</span></div>
          </div>
          <h1 className="font-display" style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Atur Password Baru</h1>
          <p style={{ color: "#8A8064", marginTop: 6, fontSize: 14 }}>Masukkan password baru untuk akun Anda</p>
        </div>
        <div className="t-card" style={{ padding: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#8A8064" }}>Password Baru</label>
              <input type="password" className="t-input" value={pw1} onChange={(e) => setPw1(e.target.value)} required minLength={6} autoFocus />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#8A8064" }}>Konfirmasi Password Baru</label>
              <input type="password" className="t-input" value={pw2} onChange={(e) => setPw2(e.target.value)} required minLength={6} />
            </div>
            {msg && <div style={{ fontSize: 12.5, color: "var(--red)", fontWeight: 600 }}>{msg}</div>}
            <button type="submit" className="t-btn t-btn-primary" style={{ justifyContent: "center" }} disabled={busy}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />} {busy ? "Menyimpan..." : "Simpan & Masuk"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function SignatureUploader({ label, currentUrl, onUpload, uploading }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#8A8064", display: "block", marginBottom: 6 }}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 130, height: 70, border: "1.5px dashed var(--line)", borderRadius: 10,
          display: "flex", alignItems: "center", justifyContent: "center", background: "white", overflow: "hidden", flexShrink: 0,
        }}>
          {currentUrl ? <img src={currentUrl} alt={label} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} /> : <span style={{ fontSize: 11, color: "#B4AA8C" }}>Belum ada</span>}
        </div>
        <label className="t-btn t-btn-ghost" style={{ cursor: "pointer" }}>
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} {uploading ? "Mengunggah..." : "Unggah PNG"}
          <input type="file" accept="image/png,image/jpeg" style={{ display: "none" }} onChange={onUpload} disabled={uploading} />
        </label>
      </div>
      <div style={{ fontSize: 11, color: "#8A8064", marginTop: 4 }}>Gunakan PNG latar transparan untuk hasil terbaik di dokumen.</div>
    </div>
  );
}

function ProfilSaya({ db, refresh, user }) {
  const isAdmin = user.role === "admin";
  const teacher = user.role === "pengajar" ? db.teachers.find((t) => t.id === user.refId) : null;
  const myProfile = db.profiles.find((p) => p.id === user.id);

  const [form, setForm] = useState({
    namaPanggilan: teacher?.namaPanggilan || "",
    nik: teacher?.nik || "",
    tempatLahir: teacher?.tempatLahir || "",
    tanggalLahir: teacher?.tanggalLahir || "",
    agama: teacher?.agama || "",
    statusPernikahan: teacher?.statusPernikahan || "",
    noHp: teacher?.noHp || "",
    pendidikanTerakhir: teacher?.pendidikanTerakhir || "",
    alamat: teacher?.alamat || "",
    kota: teacher?.kota || "",
    provinsi: teacher?.provinsi || "",
  });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(teacher?.fotoUrl || "");
  useEffect(() => { setPhotoPreview(teacher?.fotoUrl || ""); }, [teacher?.fotoUrl]);
  const [uploadingTtd, setUploadingTtd] = useState(false);
  const [uploadingStempel, setUploadingStempel] = useState(false);

  const [certForm, setCertForm] = useState({ nama: "", penyelenggara: "", tahun: new Date().getFullYear() });
  const [addingCert, setAddingCert] = useState(false);
  const myCerts = teacher ? db.certifications.filter((c) => c.teacherId === teacher.id).sort((a, b) => (b.tahun || 0) - (a.tahun || 0)) : [];

  const [eduForm, setEduForm] = useState({ jenjang: "S1", institusi: "", jurusan: "", tahunLulus: "" });
  const [addingEdu, setAddingEdu] = useState(false);
  const myEdu = teacher ? (db.riwayatPendidikan || []).filter((r) => r.teacherId === teacher.id).sort((a, b) => (b.tahunLulus || 0) - (a.tahunLulus || 0)) : [];

  async function handleFotoUpload(e) {
    const file = e.target.files[0];
    if (!file || !teacher) return;
    if (!["image/jpeg", "image/png"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      alert("Gunakan foto JPG/PNG maksimal 5 MB."); e.target.value = ""; return;
    }
    setUploadingFoto(true);
    try {
      const url = await uploadFile(file, `foto/${teacher.id}`);
      await updateTeacherProfile(teacher.id, { fotoUrl: url });
      setPhotoPreview(url);
      await refresh();
    } catch (err) {
      alert("Gagal unggah foto: " + err.message);
    }
    setUploadingFoto(false);
  }

  async function handleSignatureUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingTtd(true);
    try {
      const url = await uploadFile(file, `ttd/${user.id}`);
      await updateOwnSignature(user.id, url);
      await refresh();
    } catch (err) {
      alert("Gagal unggah tanda tangan: " + err.message);
    }
    setUploadingTtd(false);
  }

  async function handleStempelUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingStempel(true);
    try {
      const url = await uploadFile(file, "stempel");
      await updateSchoolStamp(url);
      await refresh();
    } catch (err) {
      alert("Gagal unggah stempel: " + err.message);
    }
    setUploadingStempel(false);
  }

  async function saveProfile(e) {
    e.preventDefault();
    if (!teacher) return;
    setSaving(true);
    setSaveMsg("");
    try {
      await updateTeacherProfile(teacher.id, form);
      setSaveMsg("Profil tersimpan.");
      try { await refresh(); } catch { setSaveMsg("Profil sudah tersimpan, tetapi tampilan gagal diperbarui. Muat ulang halaman."); }

    } catch (err) {
      setSaveMsg("Gagal: " + err.message);
    }
    setSaving(false);
  }

  async function submitCert(e) {
    e.preventDefault();
    if (!teacher || !certForm.nama.trim()) return;
    setAddingCert(true);
    try {
      await addCertification(teacher.id, certForm);
      await refresh();
      setCertForm({ nama: "", penyelenggara: "", tahun: new Date().getFullYear() });
    } catch (err) {
      alert("Gagal menambah sertifikasi: " + err.message);
    }
    setAddingCert(false);
  }
  async function removeCert(id) {
    if (!confirm("Hapus sertifikasi ini?")) return;
    try {
      await deleteCertification(id);
      await refresh();
    } catch (err) {
      alert("Gagal menghapus: " + err.message);
    }
  }

  async function submitEdu(e) {
    e.preventDefault();
    if (!teacher || !eduForm.institusi.trim()) return;
    setAddingEdu(true);
    try {
      await addRiwayatPendidikan(teacher.id, eduForm);
      await refresh();
      setEduForm({ jenjang: "S1", institusi: "", jurusan: "", tahunLulus: "" });
    } catch (err) {
      alert("Gagal menambah riwayat pendidikan: " + err.message);
    }
    setAddingEdu(false);
  }
  async function removeEdu(id) {
    if (!confirm("Hapus riwayat pendidikan ini?")) return;
    try {
      await deleteRiwayatPendidikan(id);
      await refresh();
    } catch (err) {
      alert("Gagal menghapus: " + err.message);
    }
  }

  return (
    <div>
      <SectionTitle sub="Kelola foto, kontak, tanda tangan digital, dan sertifikasi Anda">Profil Saya</SectionTitle>

      <div className="master-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {teacher && (
            <div className="t-card" style={{ padding: 18 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Foto Profil (3 × 4)</div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 90, height: 120, borderRadius: 6, overflow: "hidden", background: "var(--panel-soft)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {photoPreview ? <img src={photoPreview} alt="Pasfoto pengajar 3 x 4" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageIcon size={22} color="#B4AA8C" />}
                </div>
                <label className="t-btn t-btn-ghost" style={{ cursor: "pointer" }}>
                  {uploadingFoto ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} {uploadingFoto ? "Mengunggah..." : "Ganti Foto"}
                  <input type="file" accept="image/png,image/jpeg" style={{ display: "none" }} onChange={handleFotoUpload} disabled={uploadingFoto} />
                </label>
              </div>
            </div>
          )}

          <div className="t-card" style={{ padding: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Tanda Tangan Digital</div>
            <SignatureUploader label={isAdmin ? "Tanda Tangan Kepala Program / PIC Tahfidz" : "Tanda Tangan Pengajar"} currentUrl={myProfile?.signatureUrl} onUpload={handleSignatureUpload} uploading={uploadingTtd} />
          </div>

          {isAdmin && (
            <div className="t-card" style={{ padding: 18 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Stempel Sekolah</div>
              <SignatureUploader label="Stempel (dipakai di semua Report)" currentUrl={db.schoolSettings?.stempelUrl} onUpload={handleStempelUpload} uploading={uploadingStempel} />
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          {teacher && (
            <form onSubmit={saveProfile} className="t-card" style={{ padding: 18 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Data Pribadi</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#8A8064" }}>Nama Panggilan</label>
                    <input className="t-input" value={form.namaPanggilan} onChange={(e) => setForm({ ...form, namaPanggilan: e.target.value })} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#8A8064" }}>NIK</label>
                    <input className="t-input" value={form.nik} onChange={(e) => setForm({ ...form, nik: e.target.value })} placeholder="16 digit" />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#8A8064" }}>Tempat Lahir</label>
                    <input className="t-input" value={form.tempatLahir} onChange={(e) => setForm({ ...form, tempatLahir: e.target.value })} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#8A8064" }}>Tanggal Lahir</label>
                    <input type="date" className="t-input" value={form.tanggalLahir || ""} onChange={(e) => setForm({ ...form, tanggalLahir: e.target.value })} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#8A8064" }}>Agama</label>
                    <select className="t-select" value={form.agama} onChange={(e) => setForm({ ...form, agama: e.target.value })}>
                      <option value="">Pilih</option>
                      <option>Islam</option><option>Kristen</option><option>Katolik</option>
                      <option>Hindu</option><option>Buddha</option><option>Konghucu</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#8A8064" }}>Status Pernikahan</label>
                    <select className="t-select" value={form.statusPernikahan} onChange={(e) => setForm({ ...form, statusPernikahan: e.target.value })}>
                      <option value="">Pilih</option>
                      <option>Belum Menikah</option><option>Menikah</option><option>Cerai</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Kontak, Pendidikan & Alamat</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#8A8064" }}><Phone size={11} style={{ verticalAlign: -1 }} /> No. HP / WhatsApp</label>
                  <input className="t-input" value={form.noHp} onChange={(e) => setForm({ ...form, noHp: e.target.value })} placeholder="08xxxxxxxxxx" />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#8A8064" }}><GraduationCap size={11} style={{ verticalAlign: -1 }} /> Pendidikan Terakhir (ringkas)</label>
                  <input className="t-input" value={form.pendidikanTerakhir} onChange={(e) => setForm({ ...form, pendidikanTerakhir: e.target.value })} placeholder="mis. S1 Pendidikan Agama Islam" />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#8A8064" }}><MapPin size={11} style={{ verticalAlign: -1 }} /> Alamat</label>
                  <textarea className="t-input" style={{ minHeight: 60, resize: "vertical", fontFamily: "inherit" }} value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input className="t-input" placeholder="Kota" value={form.kota} onChange={(e) => setForm({ ...form, kota: e.target.value })} />
                  <input className="t-input" placeholder="Provinsi" value={form.provinsi} onChange={(e) => setForm({ ...form, provinsi: e.target.value })} />
                </div>
                {saveMsg && <div style={{ fontSize: 12.5, color: saveMsg.includes("tersimpan") ? "var(--teal)" : "var(--red)", fontWeight: 600 }}>{saveMsg}</div>}
                <button type="submit" className="t-btn t-btn-primary" style={{ justifyContent: "center" }} disabled={saving}>
                  {saving ? "Menyimpan..." : "Simpan Data"}
                </button>
              </div>
            </form>
          )}

          {teacher && (
            <div className="t-card" style={{ padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 13, marginBottom: 12 }}>
                <GraduationCap size={16} color="var(--teal)" /> Riwayat Pendidikan
              </div>
              <form onSubmit={submitEdu} style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid var(--line)" }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <select className="t-select" style={{ flex: 1 }} value={eduForm.jenjang} onChange={(e) => setEduForm({ ...eduForm, jenjang: e.target.value })}>
                    <option>SD</option><option>SMP</option><option>SMA/SMK</option>
                    <option>D3</option><option>S1</option><option>S2</option><option>S3</option>
                  </select>
                  <input className="t-input" placeholder="Tahun Lulus" type="number" value={eduForm.tahunLulus} onChange={(e) => setEduForm({ ...eduForm, tahunLulus: e.target.value })} style={{ flex: 1 }} />
                </div>
                <input className="t-input" placeholder="Nama Institusi/Sekolah/Kampus" value={eduForm.institusi} onChange={(e) => setEduForm({ ...eduForm, institusi: e.target.value })} required />
                <input className="t-input" placeholder="Jurusan (opsional)" value={eduForm.jurusan} onChange={(e) => setEduForm({ ...eduForm, jurusan: e.target.value })} />
                <button type="submit" className="t-btn t-btn-primary" style={{ justifyContent: "center" }} disabled={addingEdu}>
                  <Plus size={14} /> {addingEdu ? "Menyimpan..." : "Tambah Riwayat Pendidikan"}
                </button>
              </form>
              {myEdu.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {myEdu.map((r) => (
                    <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{r.jenjang} &mdash; {r.institusi}</div>
                        <div style={{ fontSize: 11.5, color: "#8A8064" }}>{[r.jurusan, r.tahunLulus].filter(Boolean).join(" · ")}</div>
                      </div>
                      <button className="t-btn t-btn-danger" style={{ padding: "4px 8px" }} onClick={() => removeEdu(r.id)}><Trash2 size={12} /></button>
                    </div>
                  ))}
                </div>
              ) : <Empty text="Belum ada riwayat pendidikan ditambahkan." />}
            </div>
          )}

          {teacher && (
            <div className="t-card" style={{ padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 13, marginBottom: 12 }}>
                <Award size={16} color="var(--gold)" /> Sertifikasi / Pelatihan yang Pernah Diikuti
              </div>
              <form onSubmit={submitCert} style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid var(--line)" }}>
                <input className="t-input" placeholder="Nama sertifikasi/pelatihan" value={certForm.nama} onChange={(e) => setCertForm({ ...certForm, nama: e.target.value })} required />
                <div style={{ display: "flex", gap: 8 }}>
                  <input className="t-input" placeholder="Penyelenggara" value={certForm.penyelenggara} onChange={(e) => setCertForm({ ...certForm, penyelenggara: e.target.value })} style={{ flex: 2 }} />
                  <input className="t-input" type="number" placeholder="Tahun" value={certForm.tahun} onChange={(e) => setCertForm({ ...certForm, tahun: e.target.value })} style={{ flex: 1 }} />
                </div>
                <button type="submit" className="t-btn t-btn-primary" style={{ justifyContent: "center" }} disabled={addingCert}>
                  <Plus size={14} /> {addingCert ? "Menyimpan..." : "Tambah Sertifikasi"}
                </button>
              </form>
              {myCerts.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {myCerts.map((c) => (
                    <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{c.nama}</div>
                        <div style={{ fontSize: 11.5, color: "#8A8064" }}>{[c.penyelenggara, c.tahun].filter(Boolean).join(" · ")}</div>
                      </div>
                      <button className="t-btn t-btn-danger" style={{ padding: "4px 8px" }} onClick={() => removeCert(c.id)}><Trash2 size={12} /></button>
                    </div>
                  ))}
                </div>
              ) : <Empty text="Belum ada sertifikasi ditambahkan." />}
            </div>
          )}

          {!teacher && !isAdmin && (
            <div className="t-card-soft" style={{ padding: 16, fontSize: 13 }}>
              Kelengkapan profil dan sertifikasi saat ini khusus untuk Pengajar.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


function Sidebar({ user, view, setView, mobileOpen, onClose }) {
  const items = NAV_BY_ROLE[user.role];
  function handleNav(id) {
    setView(id);
    onClose();
  }
  return (
    <>
      <div className={`sidebar-overlay ${mobileOpen ? "open" : ""}`} onClick={onClose} />
      <div className={`no-print app-sidebar ${mobileOpen ? "open" : ""}`} style={{ width: 232, background: "var(--ink)", minHeight: "100vh", padding: 18, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <button className="portal-sidebar-close" aria-label="Tutup menu" onClick={onClose}><XCircle size={22} /></button>
        <div className="saqu-menu-caption">MENU UTAMA</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
          {items.map((it) => (
            <button type="button" key={it.id} className={`t-nav-item ${view === it.id ? "active" : ""}`} aria-current={view === it.id ? "page" : undefined} onClick={() => handleNav(it.id)}>
              <it.icon size={16} /> {it.label}
            </button>
          ))}
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 14, marginTop: 14 }}>
          <div style={{ color: "white", fontSize: 13, fontWeight: 600 }}>{user.nama}</div>
          <div style={{ color: "#B4AA8C", fontSize: 11, marginBottom: 10 }}>{ROLE_LABEL[user.role]}</div>

        </div>
      </div>
    </>
  );
}

/* ============================== DASHBOARDS ============================== */
function DashboardAdmin({ db }) {
  const mk = currentMonthKey();
  const monthScores = db.scores.filter((s) => monthKey(s.tanggal) === mk);
  const monthAtt = db.attendance.filter((a) => monthKey(a.tanggal) === mk);
  const perTeacher = db.teachers.map((t) => {
    const ids = teacherStudents(db, t.id).map((m) => m.id);
    const gs = monthScores.filter((s) => ids.includes(s.studentId));
    return { id: t.id, nama: t.nama, jumlah: gs.length, rataNilai: avg(gs.map((s) => s.nilai)) || 0 };
  });
  const recent = [...db.scores].sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1)).slice(0, 6);
  const alerts = buildAlerts(db, db.students);
  const leaderboard = buildLeaderboard(db, db.students);

  return (
    <div>
      <div className="portal-intro dashboard-intro"><div><small>Dashboard admin</small><h2>Kelola kegiatan tahfidz</h2><p>Ringkasan aktivitas siswa dan pengajar di SMK Telkom Malang.</p></div><div className="dashboard-intro-actions"><DashboardClock /><span className="portal-intro-icon"><LayoutDashboard size={27} /></span></div></div>
      <div className="grid-4" style={{ gap: 14, marginBottom: 20 }}>
        <StatCard icon={Users} label="Siswa Peserta Tahfidz" value={db.students.length} sub={`${db.classes.length} kelas · ${db.excludedStudentCount || 0} non-Muslim tidak ikut · ${db.unknownReligionCount || 0} belum diverifikasi`} />
        <StatCard icon={GraduationCap} label="Pengajar & Mentor" value={db.teachers.length + db.mentors.length} sub={`${db.teachers.length} pengajar, ${db.mentors.length} mentor`} accent="gold" />
        <StatCard icon={CalendarCheck} label="Kehadiran Bulan Ini" value={`${attendancePct(monthAtt)}%`} sub={`${monthAtt.length} catatan presensi`} />
        <StatCard icon={BookOpen} label="Setoran Bulan Ini" value={monthScores.length} sub={`Rata-rata nilai ${avg(monthScores.map((s) => s.nilai))}`} accent="gold" />
      </div>
      <div className="grid-2" style={{ gap: 14, marginBottom: 14 }}>
        <div className="t-card saqu-teacher-chart" style={{ padding: 20, alignSelf: "start" }}>
          <h3>Rata-rata Nilai per Pengajar</h3>
          <p className="saqu-chart-caption">Nilai siswa binaan bulan ini · skala 0–100</p>
          <div className="saqu-chart-rows">
            {perTeacher.filter(t => t.jumlah > 0).sort((a,b) => b.rataNilai - a.rataNilai || a.nama.localeCompare(b.nama, "id")).map(t => (
              <div className="saqu-chart-row" key={t.id}>
                <div className="saqu-chart-label"><span>{t.nama}</span><strong>{Number(t.rataNilai).toLocaleString("id-ID", {maximumFractionDigits:1})}</strong></div>
                <div className="saqu-chart-track" aria-hidden="true"><div style={{width:`${Math.min(100,Math.max(0,t.rataNilai))}%`}} /></div>
                <small>{t.jumlah} penilaian</small>
              </div>
            ))}
            {!perTeacher.some(t => t.jumlah > 0) && <p className="saqu-chart-caption">Belum ada penilaian pada bulan ini.</p>}
          </div>
          {perTeacher.some(t => !t.jumlah) && <details className="saqu-chart-pending"><summary>Belum ada penilaian ({perTeacher.filter(t => !t.jumlah).length} pengajar)</summary><ul>{perTeacher.filter(t => !t.jumlah).sort((a,b)=>a.nama.localeCompare(b.nama,"id")).map(t=><li key={t.id}>{t.nama}</li>)}</ul></details>}
        </div>
        <div className="t-card" style={{ padding: 18 }}>
          <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Setoran Terbaru</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {recent.map((s) => (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderBottom: "1px solid var(--line)", paddingBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{studentName(db, s.studentId)}</div><div className="student-class-label">{className(db, db.students.find(m => m.id === s.studentId)?.kelasId)}</div>
                  <div style={{ color: "#8A8064", fontSize: 11.5 }}>{surahName(db, s.surahId)} · {fmtDate(s.tanggal)}</div>
                </div>
                <div className="font-mono" style={{ fontWeight: 700, color: "var(--teal)" }}>{s.nilaiHuruf || s.nilai}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid-2" style={{ gap: 14 }}>
        <div className="t-card" style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, fontWeight: 700, fontSize: 14 }}>
            <AlertTriangle size={16} color="var(--red)" /> Perlu Perhatian
          </div>
          <div style={{ fontSize: 11.5, color: "#8A8064", marginBottom: 12 }}>Kehadiran rendah atau lama tidak setor bulan ini</div>
          <AlertList alerts={alerts} db={db} />
        </div>
        <div className="t-card" style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, fontWeight: 700, fontSize: 14 }}>
            <Trophy size={16} color="var(--gold)" /> Papan Peringkat Setoran
          </div>
          <div style={{ fontSize: 11.5, color: "#8A8064", marginBottom: 12 }}>Siswa paling rajin setor bulan ini, seluruh sekolah</div>
          <Leaderboard rows={leaderboard} db={db} />
        </div>
      </div>
    </div>
  );
}

function DashboardPengajar({ db, user }) {
  const classes = teacherClasses(db, user.refId);
  const members = teacherStudents(db, user.refId);
  const [binaanClass, setBinaanClass] = useState("all");
  const validBinaanClass = classes.some(c => c.id === binaanClass) ? binaanClass : "all";
  const visibleMembers = members.filter(m => validBinaanClass === "all" || m.kelasId === validBinaanClass)
    .sort((a,b) => a.nama.localeCompare(b.nama,"id"));
  const mk = currentMonthKey();
  const memberIds = members.map((m) => m.id);
  const monthScores = db.scores.filter((s) => monthKey(s.tanggal) === mk && memberIds.includes(s.studentId));
  const todayAtt = db.attendance.filter((a) => a.tanggal === isoDaysAgo(0) && memberIds.includes(a.studentId));
  const alerts = buildAlerts(db, members);
  const leaderboard = buildLeaderboard(db, members);

  return (
    <div>
      <div className="portal-intro dashboard-intro"><div><small>Dashboard pengajar</small><h2>Selamat datang, {user.nama}</h2><p>{classListLabel(classes)} · {members.length} siswa binaan</p></div><div className="dashboard-intro-actions"><DashboardClock /><span className="portal-intro-icon"><BookOpen size={27} /></span></div></div>
      <TeacherAttendanceDashboard user={user} />
      <div className="grid-3" style={{ gap: 14, marginBottom: 20 }}>
        <StatCard icon={Users} label="Siswa Diampu" value={members.length} sub={classListLabel(classes)} />
        <StatCard icon={CalendarCheck} label="Presensi Siswa Hari Ini" value={`${todayAtt.filter((a) => a.status === "HADIR").length}/${members.length}`} sub="Hadir hari ini" accent="gold" />
        <StatCard icon={BookOpen} label="Setoran Bulan Ini" value={monthScores.length} sub={`Rata-rata nilai ${avg(monthScores.map((s) => s.nilai))}`} />
      </div>
      <div className="grid-2" style={{ gap: 14, marginBottom: 14 }}>
        <div className="t-card" style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, fontWeight: 700, fontSize: 14 }}>
            <AlertTriangle size={16} color="var(--red)" /> Perlu Perhatian
          </div>
          <div style={{ fontSize: 11.5, color: "#8A8064", marginBottom: 12 }}>Kehadiran rendah atau lama tidak setor bulan ini</div>
          <AlertList alerts={alerts} db={db} classes={classes} />
        </div>
        <div className="t-card" style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, fontWeight: 700, fontSize: 14 }}>
            <Trophy size={16} color="var(--gold)" /> Papan Peringkat Setoran
          </div>
          <div style={{ fontSize: 11.5, color: "#8A8064", marginBottom: 12 }}>Siswa paling rajin setor bulan ini</div>
          <Leaderboard rows={leaderboard} db={db} />
        </div>
      </div>
      <div className="t-card" style={{ padding: 18 }}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"end",gap:12,flexWrap:"wrap",marginBottom:14}}>
          <div><h3 style={{margin:"0 0 6px",fontSize:14}}>Siswa Binaan</h3><span role="status" style={{fontSize:12,color:"#64786e"}}>{visibleMembers.length} siswa ditampilkan</span></div>
          <label style={{display:"grid",gap:6,fontSize:12}}>Kelas siswa binaan
            <select className="t-select" style={{width:240,maxWidth:"100%"}} value={validBinaanClass} onChange={e => setBinaanClass(e.target.value)}>
              <option value="all">Semua kelas ({members.length} siswa)</option>
              {[...classes].sort((a,b) => a.nama.localeCompare(b.nama,"id",{numeric:true})).map(c => <option key={c.id} value={c.id}>{c.nama} ({members.filter(m => m.kelasId === c.id).length} siswa)</option>)}
            </select>
          </label>
        </div>
        <div style={{overflowX:"auto"}}>
        <table className="t-table">
          <thead><tr><th>Nama</th><th>Kelas</th><th>Setoran Bulan Ini</th><th>Rata-rata Nilai</th></tr></thead>
          <tbody>
            {visibleMembers.map((m) => {
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
          {!visibleMembers.length && <tr><td colSpan={4}><Empty text="Belum ada siswa peserta Tahfidz pada kelas ini." /></td></tr>}
          </tbody>
        </table></div>
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
      <div className="dashboard-section-heading"><SectionTitle sub={`${students.length} siswa menjadi tanggung jawab Anda`}>Dashboard Mentor</SectionTitle><DashboardClock /></div>
      <div className="grid-3" style={{ gap: 14, marginBottom: 20 }}>
        <StatCard icon={Users} label="Siswa Binaan" value={students.length} />
        <StatCard icon={BookOpen} label="Penilaian Bulan Ini" value={monthScores.length} accent="gold" />
        <StatCard icon={TrendingUp} label="Rata-rata Nilai" value={avg(monthScores.map((s) => s.nilai)) || "-"} />
      </div>
      <div className="grid-2" style={{ gap: 14, marginBottom: 14 }}>
        <div className="t-card" style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, fontWeight: 700, fontSize: 14 }}>
            <AlertTriangle size={16} color="var(--red)" /> Perlu Perhatian
          </div>
          <div style={{ fontSize: 11.5, color: "#8A8064", marginBottom: 12 }}>Kehadiran rendah atau lama tidak setor bulan ini</div>
          <AlertList alerts={alerts} db={db} />
        </div>
        <div className="t-card" style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, fontWeight: 700, fontSize: 14 }}>
            <Trophy size={16} color="var(--gold)" /> Papan Peringkat Setoran
          </div>
          <div style={{ fontSize: 11.5, color: "#8A8064", marginBottom: 12 }}>Siswa binaan paling rajin setor bulan ini</div>
          <Leaderboard rows={leaderboard} db={db} />
        </div>
      </div>
      <div className="t-card" style={{ padding: 18 }}>
        <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Daftar Siswa</div>
        <table className="t-table">
          <thead><tr><th>Nama</th><th>Kelas</th><th>Setoran Terakhir</th></tr></thead>
          <tbody>
            {students.map((s) => {
              const last = studentScores(db, s.id)[0];
              return (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.nama}</td>
                  <td>{className(db, s.kelasId)}</td>
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
  if (!student) return <Empty text="Akun ini tidak termasuk peserta Tahfidz atau data siswa belum terhubung. Hubungi admin bila perlu diperiksa." />;
  const scores = studentScores(db, student.id);
  const attendance = studentAttendance(db, student.id);
  const mk = currentMonthKey();
  const monthScores = scores.filter((s) => monthKey(s.tanggal) === mk);
  const monthAtt = attendance.filter((a) => monthKey(a.tanggal) === mk);
  const chartData = [...scores].reverse().map((s) => ({ tanggal: fmtDate(s.tanggal).slice(0, 6), nilai: s.nilai }));

  return (
    <div>
      <div className="dashboard-section-heading"><SectionTitle sub={className(db, student.kelasId)}>Assalamu'alaikum, {student.nama.split(" ")[0]}</SectionTitle><DashboardClock /></div>
      <div className="grid-3" style={{ gap: 14, marginBottom: 20 }}>
        <StatCard icon={BookOpen} label="Total Setoran" value={scores.length} sub={`${monthScores.length} bulan ini`} />
        <StatCard icon={Star} label="Rata-rata Nilai" value={avg(scores.map((s) => s.nilai)) || "-"} accent="gold" />
        <StatCard icon={CalendarCheck} label="Kehadiran Bulan Ini" value={`${attendancePct(monthAtt)}%`} />
      </div>
      <div className="grid-2" style={{ gap: 14 }}>
        <div className="t-card" style={{ padding: 18 }}>
          <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Perkembangan Nilai</div>
          {chartData.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid stroke="#e4e4e7" vertical={false} />
                <XAxis dataKey="tanggal" tick={{ fontSize: 11 }} stroke="#71717a" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#71717a" />
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
  const availableClasses = teacherClasses(db, user.refId);
  const members = teacherStudents(db, user.refId);
  const [kelasFilter, setKelasFilter] = useState("all");
  const visibleMembers = members
    .filter(m => kelasFilter === "all" || m.kelasId === kelasFilter)
    .sort((a,b) => (a.nama || "").trim().localeCompare((b.nama || "").trim(), "id", {sensitivity:"base", numeric:true}));
  const [tanggal, setTanggal] = useState(isoDaysAgo(0));
  const [draft, setDraft] = useState({});
  const [saved, setSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const map = {};
    members.forEach((m) => {
      const existing = db.attendance.find((a) => a.studentId === m.id && a.tanggal === tanggal);
      map[m.id] = existing?.status || null;
    });
    setDraft(map);
    setSaved(false); setSaveMessage("");
    // eslint-disable-next-line
  }, [tanggal]);

  function setStatus(studentId, status) {
    setDraft((d) => ({ ...d, [studentId]: status }));
    setSaved(false); setSaveMessage("");
  }
  function hadirSemua() {
    const map = { ...draft };
    visibleMembers.forEach((m) => { map[m.id] = draft[m.id] || "HADIR"; });
    setDraft(map);
    setSaved(false); setSaveMessage("");
  }
  async function simpan() {
    if (saving) return;
    setSaved(false); setSaveMessage("");
    const newRecords = members.filter((m) => draft[m.id]).map((m) => ({
      studentId: m.id,
      tanggal,
      status: draft[m.id],
      note: "",
      inputBy: user.id,
    }));
    if (!newRecords.length) {setSaveMessage("Belum ada presensi yang dipilih. Tandai minimal satu siswa, lalu simpan."); return;}
    setSaving(true);
    try {
      const result = await saveAttendanceBatch(newRecords);
      const notice = result.savedCount
        ? `${result.savedCount} presensi berhasil tersimpan untuk ${fmtDate(tanggal)}.`
        : "Tidak ada presensi yang disimpan karena siswa yang dipilih bukan peserta Tahfidz.";
      const excluded = result.excludedCount ? ` ${result.excludedCount} siswa non-Muslim tidak disertakan.` : "";
      setSaved(true);
      setSaveMessage(notice + excluded);
      try { await refresh({attendanceFor:{studentIds:members.map((member) => member.id), date:tanggal}}); } catch { setSaveMessage(notice + excluded + " Tampilan gagal diperbarui. Muat ulang halaman."); }
    } catch (e) {
      setSaveMessage("Gagal menyimpan presensi: " + e.message);
    }
    setSaving(false);
  }

  return (
    <div className="student-presensi">
      <SectionTitle sub={`${classListLabel(availableClasses)} · tandai kehadiran lalu simpan`}>Presensi Harian</SectionTitle>
      {members.length === 0 && (
        <div className="t-card-soft" style={{ padding: 16, marginBottom: 16, fontSize: 13 }}>
          Belum ada siswa pada kelas yang Anda ampu. Minta Admin memeriksa penugasan kelas dan penempatan siswa di Master Data.
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input type="date" className="t-input" style={{ width: 180 }} disabled={saving} value={tanggal} max={isoDaysAgo(0)} onChange={(e) => setTanggal(e.target.value)} />
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
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="t-btn t-btn-ghost" disabled={saving} onClick={hadirSemua}>Tandai Hadir Semua{kelasFilter !== "all" ? " (Kelas Ini)" : ""}</button>
          <button className="t-btn t-btn-primary" onClick={simpan} disabled={saving || !members.length}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} {saving ? "Menyimpan..." : "Simpan Presensi"}
          </button>
        </div>
      </div>
      {saveMessage && <div className={`save-feedback ${saved ? "success" : "error"}`} role={saved ? "status" : "alert"}>{saveMessage}</div>}
      <div className="t-card" style={{ padding: 8, overflowX: "auto" }}>
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
                        disabled={saving} onClick={() => setStatus(m.id, key)}
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
    ? mentorStudents(db, user.refId)
    : teacherStudents(db, user.refId);

  const availableClasses = db.classes.filter((c) => scopeStudents.some((s) => s.kelasId === c.id));
  const [kelasFilter, setKelasFilter] = useState(availableClasses[0]?.id || "all");
  const filteredStudents = kelasFilter === "all" ? scopeStudents : scopeStudents.filter((s) => s.kelasId === kelasFilter);

  const [studentId, setStudentId] = useState(filteredStudents[0]?.id || "");
  const availableJuz = [...new Set(db.surahs.map((s) => Number(s.juz)).filter(n => Number.isInteger(n) && n >= 1 && n <= 30))].sort((a, b) => a - b);
  const [juzFilter, setJuzFilter] = useState(availableJuz[0] || 30);
  const surahsInJuz = surahsForJuz(db.surahs, juzFilter);
  const [surahId, setSurahId] = useState(surahsInJuz[0]?.id || sortSurahs(db.surahs)[0]?.id || "");
  const [ayatMulai, setAyatMulai] = useState(1);
  const [ayatAkhir, setAyatAkhir] = useState(1);
  const [nilaiHuruf, setNilaiHuruf] = useState("A");
  const [catatan, setCatatan] = useState("");
  const [tanggal, setTanggal] = useState(isoDaysAgo(0));
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [templateBusy, setTemplateBusy] = useState(false);
  const [templateMsg, setTemplateMsg] = useState("");

  function handleKelasFilter(val) {
    setKelasFilter(val);
    const list = val === "all" ? scopeStudents : scopeStudents.filter((s) => s.kelasId === val);
    setStudentId(list[0]?.id || "");
  }
  function handleJuzFilter(val) {
    const juzNum = Number(val);
    setJuzFilter(juzNum);
    const list = surahsForJuz(db.surahs, juzNum);
    setSurahId(list[0]?.id || "");
    setAyatMulai(1); setAyatAkhir(1);
  }

  const surah = db.surahs.find((s) => s.id === surahId);

  async function submit() {
    if (saving) return;
    setMsg("");
    if (!studentId) { setMsg("Pilih siswa terlebih dahulu."); return; }
    if (!filteredStudents.some((s) => s.id === studentId)) {
      setMsg("Siswa tidak termasuk dalam pilihan kelas Anda. Pilih ulang kelas dan siswa.");
      return;
    }
    if (!surah) { setMsg("Pilih surat terlebih dahulu."); return; }
    if (!Number.isInteger(Number(ayatMulai)) || !Number.isInteger(Number(ayatAkhir)) || Number(ayatMulai) < 1) {
      setMsg("Nomor ayat harus berupa bilangan bulat mulai dari 1."); return;
    }
    if (Number(ayatAkhir) < Number(ayatMulai)) { setMsg("Ayat akhir tidak boleh lebih kecil dari ayat mulai."); return; }
    if (Number(ayatAkhir) > Number(surah.ayat)) { setMsg(`Surat ${surah.nama} hanya memiliki ${surah.ayat} ayat.`); return; }
    const entry = {
      studentId, tanggal, surahId, ayatMulai: Number(ayatMulai), ayatAkhir: Number(ayatAkhir),
      nilaiHuruf, catatan: catatan.trim(), penguji: user.nama, inputBy: user.id,
    };
    setSaving(true);
    try {
      await insertScore(entry);
      setMsg(`Penilaian ${filteredStudents.find(s => s.id === studentId)?.nama || "siswa"} berhasil tersimpan untuk ${fmtDate(tanggal)}.`);
      try { await refresh({scoresFor:entry.studentId}); } catch { setMsg("Penilaian sudah tersimpan, tetapi tampilan gagal diperbarui. Muat ulang halaman; tidak perlu menyimpan ulang."); }
      setCatatan("");

    } catch (e) {
      setMsg("Gagal menyimpan: " + e.message);
    }
    setSaving(false);
  }

  const templateStudents = kelasFilter === "all" ? scopeStudents : filteredStudents;
  async function downloadAssessmentTemplate() {
    if (!templateStudents.length) { setTemplateMsg("Belum ada siswa pada kelas yang dipilih."); return; }
    setTemplateBusy(true); setTemplateMsg("");
    try {
      const XLSX = await loadXlsx();
    const data = templateStudents.map((student) => ({
      NIS: student.nis || "", "Nama Siswa": student.nama, Kelas: className(db, student.kelasId),
      Tanggal: tanggal, Surat: "", "Ayat Mulai": "", "Ayat Akhir": "", Nilai: "",
      Catatan: "", Penguji: user.nama,
    }));
    const sheet = XLSX.utils.json_to_sheet(data);
    sheet["!cols"] = [{wch:18},{wch:30},{wch:18},{wch:14},{wch:16},{wch:14},{wch:14},{wch:10},{wch:35},{wch:24}];
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Template Penilaian");
    const guide = XLSX.utils.aoa_to_sheet([
      ["Petunjuk Template Penilaian SAQUIN"],
      ["Kelas", className(db, templateStudents[0]?.kelasId)],
      ["Wajib diisi", "Tanggal, Surat, Ayat Mulai, Ayat Akhir, Nilai"],
      ["Format tanggal", "YYYY-MM-DD (contoh: 2026-10-12)"],
      ["Surat", "Boleh nomor surat (1–114) atau nama surat"],
      ["Nilai", "A+, A, B+, B, atau C"],
      ["Baris kosong", "Baris siswa yang belum diisi boleh dibiarkan; akan dilewati saat impor"],
    ]);
    guide["!cols"] = [{wch:22},{wch:78}];
    XLSX.utils.book_append_sheet(book, guide, "Petunjuk");
    XLSX.writeFile(book, `Template_Penilaian_${safeExportName(className(db, templateStudents[0]?.kelasId))}.xlsx`);
    setTemplateMsg("Template berhasil diunduh. Isi kolom Surat, ayat, Nilai, dan Tanggal sebelum diunggah kembali.");
    } catch (error) {
      setTemplateMsg("Template gagal dibuat: " + error.message);
    } finally {
      setTemplateBusy(false);
    }
  }
  function parseTemplateDate(value, XLSX) {
    if (typeof value === "number") {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2,"0")}-${String(parsed.d).padStart(2,"0")}`;
    }
    const text = String(value || "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const match = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    return match ? `${match[3]}-${String(match[2]).padStart(2,"0")}-${String(match[1]).padStart(2,"0")}` : "";
  }
  function resolveTemplateSurah(value) {
    const raw = String(value ?? "").trim();
    if (!raw) return null;
    const numeric = Number(raw.match(/^\d+/)?.[0] || raw);
    if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 114) return db.surahs.find((s) => surahNumber(s) === numeric) || null;
    const normalized = raw.replace(/^\d+\s*[.\-:]?\s*/, "").toLowerCase().replace(/[^a-z0-9]/g, "");
    return db.surahs.find((s) => String(s.nama).toLowerCase().replace(/[^a-z0-9]/g, "") === normalized) || null;
  }
  async function handleAssessmentTemplate(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (kelasFilter === "all" && availableClasses.length > 1) {
      setTemplateMsg("Pilih satu kelas terlebih dahulu agar impor tidak tertukar."); return;
    }
    setTemplateBusy(true); setTemplateMsg("");
    try {
      const XLSX = await loadXlsx();
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      const byNis = new Map(templateStudents.map((s) => [String(s.nis || "").trim(), s]));
      const byName = new Map(templateStudents.map((s) => [String(s.nama || "").trim().toLowerCase(), s]));
      const errors = [], entries = [], seen = new Set();
      rawRows.forEach((row, index) => {
        const line = index + 2;
        const nis = String(row.NIS ?? row.nis ?? "").trim();
        const name = String(row["Nama Siswa"] ?? row.Nama ?? row.nama ?? "").trim();
        const student = byNis.get(nis) || byName.get(name.toLowerCase());
        const dateValue = row.Tanggal ?? row.tanggal;
        const surahValue = row.Surat ?? row["Nama Surat"] ?? row.surah;
        const startValue = row["Ayat Mulai"] ?? row.ayatMulai;
        const endValue = row["Ayat Akhir"] ?? row.ayatAkhir;
        const gradeValue = row.Nilai ?? row["Nilai Huruf"] ?? row.nilai;
        const noteValue = row.Catatan ?? row.catatan ?? "";
        if (!nis && !name && !dateValue && !surahValue && !startValue && !endValue && !gradeValue && !noteValue) return;
        if (!surahValue && !startValue && !endValue && !gradeValue && !noteValue) return;
        const date = parseTemplateDate(dateValue, XLSX);
        const surah = resolveTemplateSurah(surahValue);
        const start = Number(startValue);
        const end = Number(endValue);
        const grade = String(gradeValue ?? "").trim().toUpperCase();
        if (!student) errors.push(`Baris ${line}: siswa dengan NIS/nama tersebut tidak ada di kelas.`);
        else if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.push(`Baris ${line}: tanggal harus berformat YYYY-MM-DD.`);
        else if (!surah) errors.push(`Baris ${line}: surat tidak dikenali.`);
        else if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start || end > Number(surah.ayat)) errors.push(`Baris ${line}: rentang ayat tidak valid untuk ${surah.nama}.`);
        else if (!["A+","A","B+","B","C"].includes(grade)) errors.push(`Baris ${line}: nilai harus A+, A, B+, B, atau C.`);
        else {
          const key = `${student.id}|${date}|${surah.id}|${start}|${end}`;
          if (seen.has(key)) errors.push(`Baris ${line}: data penilaian duplikat.`);
          else { seen.add(key); entries.push({ studentId:student.id, tanggal:date, surahId:surah.id, ayatMulai:start, ayatAkhir:end, nilaiHuruf:grade, catatan:String(noteValue).trim(), penguji:String(row.Penguji ?? row.penguji ?? user.nama).trim() || user.nama, inputBy:user.id }); }
        }
      });
      if (errors.length) throw new Error(errors.slice(0, 8).join(" ") + (errors.length > 8 ? ` Dan ${errors.length - 8} kesalahan lainnya.` : ""));
      if (!entries.length) throw new Error("Tidak ada baris penilaian yang dapat diimpor.");
      const result = await bulkInsertScores(entries);
      await refresh({scoresForMany: [...new Set(entries.map((entry) => entry.studentId))]});
      setTemplateMsg(`${result.savedCount} penilaian dari template berhasil disimpan.`);
    } catch (error) { setTemplateMsg("Impor gagal: " + error.message); }
    finally { setTemplateBusy(false); }
  }

  const history = studentScores(db, studentId).slice(0, 6);
  const NILAI_OPTIONS = ["A+", "A", "B+", "B", "C"];
  const nilaiColor = { "A+": "var(--teal)", "A": "var(--teal)", "B+": "#7A5E32", "B": "#7A5E32", "C": "var(--red)" };

  return (
    <div>
      <SectionTitle sub="Catat hasil simakan/setoran hafalan siswa">{isMentor ? "Input Penilaian" : "Penilaian Tahfidz"}</SectionTitle>
      <div className="grid-2" style={{ gap: 16 }}>
        <div className="t-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#8A8064" }}>1. Tanggal</label>
              <input type="date" className="t-input" max={isoDaysAgo(0)} value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
            </div>

            {availableClasses.length > 1 && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#8A8064" }}>2. Kelas</label>
                <select className="t-select" value={kelasFilter} onChange={(e) => handleKelasFilter(e.target.value)}>
                  {availableClasses.map((c) => {
                    const count = scopeStudents.filter((s) => s.kelasId === c.id).length;
                    return <option key={c.id} value={c.id}>{c.nama} ({count} siswa)</option>;
                  })}
                </select>
              </div>
            )}

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#8A8064" }}>3. Nama Siswa</label>
              <select className="t-select" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                {filteredStudents.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#8A8064" }}>4. Juz</label>
              <select className="t-select" value={juzFilter} onChange={(e) => handleJuzFilter(e.target.value)}>
                {availableJuz.map((j) => <option key={j} value={j}>Juz {j}</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#8A8064" }}>5. Nama Surat</label>
              <select className="t-select" value={surahId} onChange={(e) => { setSurahId(e.target.value); setAyatMulai(1); setAyatAkhir(1); }}>
                {surahsInJuz.map((s) => <option key={s.id} value={s.id}>{surahNumber(s) ? `${surahNumber(s)}. ` : ""}{s.nama} ({s.ayat} ayat)</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#8A8064" }}>6. Ayat Mulai &ndash; Ayat Akhir</label>
              <div style={{ display: "flex", gap: 10 }}>
                <input type="number" min={1} max={surah?.ayat || 1} className="t-input" value={ayatMulai} onChange={(e) => setAyatMulai(e.target.value)} placeholder="Awal" />
                <input type="number" min={1} max={surah?.ayat || 1} className="t-input" value={ayatAkhir} onChange={(e) => setAyatAkhir(e.target.value)} placeholder="Akhir" />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#8A8064" }}>7. Nilai</label>
              <div style={{ display: "flex", gap: 6 }}>
                {NILAI_OPTIONS.map((g) => (
                  <button
                    key={g} type="button" onClick={() => setNilaiHuruf(g)}
                    className="t-btn" style={{
                      flex: 1, justifyContent: "center", fontWeight: 700,
                      background: nilaiHuruf === g ? nilaiColor[g] : "var(--panel-soft)",
                      color: nilaiHuruf === g ? "white" : "var(--ink)",
                    }}
                  >{g}</button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#8A8064" }}>8. Catatan (bila diperlukan)</label>
              <textarea className="t-input" style={{ minHeight: 60, resize: "vertical", fontFamily: "inherit" }} value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Opsional" />
            </div>

            {msg && <div className={`save-feedback ${msg.includes("tersimpan") ? "success" : "error"}`} role={msg.includes("tersimpan") ? "status" : "alert"}>{msg}</div>}
            <button className="t-btn t-btn-primary" style={{ justifyContent: "center" }} onClick={submit} disabled={saving || !studentId || !filteredStudents.some((s) => s.id === studentId)}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} {saving ? "Menyimpan..." : "Simpan Penilaian"}
            </button>
          </div>
        </div>
        <div className="t-card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Riwayat Terbaru &mdash; {scopeStudents.find((s) => s.id === studentId)?.nama}</div>
          {history.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {history.map((h) => (
                <div key={h.id} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--line)", paddingBottom: 8, fontSize: 13, gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{surahName(db, h.surahId)} ({h.ayatMulai}-{h.ayatAkhir})</div>
                    <div style={{ fontSize: 11.5, color: "#8A8064" }}>{fmtDate(h.tanggal)} · {h.penguji}</div>
                    {h.catatan && <div style={{ fontSize: 11.5, color: "#8A8064", fontStyle: "italic", marginTop: 2 }}>&ldquo;{h.catatan}&rdquo;</div>}
                  </div>
                  <div className="font-mono" style={{ fontWeight: 700, color: nilaiColor[h.nilaiHuruf] || "var(--teal)", flexShrink: 0 }}>{h.nilaiHuruf || h.nilai}</div>
                  <DeleteScoreButton score={h} user={user} db={db} refresh={refresh} />
                </div>
              ))}
            </div>
          ) : <Empty text="Belum ada riwayat penilaian." />}
        </div>
      </div>
      <div className="t-card" style={{ padding: 20, marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 14, marginBottom: 6 }}><Upload size={16} color="var(--teal)" /> Template Penilaian per Kelas</div>
        <p style={{ margin: "0 0 12px", fontSize: 12, color: "#64786e" }}>Unduh template berisi daftar siswa kelas yang dipilih, isi data penilaian, lalu unggah kembali. NIS atau nama siswa akan dicocokkan otomatis.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="t-btn t-btn-ghost" onClick={downloadAssessmentTemplate} disabled={!templateStudents.length}><Download size={14} /> Unduh Template Excel</button>
          <label className="t-btn t-btn-primary" style={{ cursor: templateBusy ? "not-allowed" : "pointer" }}>
            {templateBusy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} {templateBusy ? "Mengimpor..." : "Upload Penilaian"}
            <input type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={handleAssessmentTemplate} disabled={templateBusy} />
          </label>
        </div>
        {templateMsg && <p role="status" style={{ margin: "12px 0 0", fontSize: 12, color: templateMsg.startsWith("Impor gagal") ? "var(--red)" : "var(--teal)" }}>{templateMsg}</p>}
      </div>
    </div>
  );
}


/* ============================== REKAP ============================== */
function RekapView({ db, user, refresh }) {
  let students = [];
  let title = "Rekap Tahfidz";
  let sub = "";
  if (user.role === "admin") { students = db.students; sub = "Seluruh siswa"; }
  if (user.role === "pengajar") {
    const classes = teacherClasses(db, user.refId);
    students = teacherStudents(db, user.refId);
    sub = classListLabel(classes);
  }
  if (user.role === "mentor") {
    students = mentorStudents(db, user.refId);
    sub = "Siswa binaan Anda";
  }
  if (user.role === "siswa") {
    students = db.students.filter((s) => s.id === user.refId);
    sub = "Riwayat pribadi";
  }
  const [classFilter, setClassFilter] = useState("all");
  const [filter, setFilter] = useState("all");
  const availableClasses = db.classes.filter(c => user.role === "admin" ||
    (user.role === "pengajar" ? c.teacherId === user.refId : students.some(s => s.kelasId === c.id)))
    .sort((a,b) => a.nama.localeCompare(b.nama,"id",{numeric:true}));
  const validClass = availableClasses.some(c => c.id === classFilter) ? classFilter : "all";
  const filteredStudents = students.filter(s => validClass === "all" || s.kelasId === validClass)
    .sort((a,b) => a.nama.localeCompare(b.nama,"id"));
  const validStudent = filteredStudents.some(s => s.id === filter) ? filter : "all";
  const [period, setPeriod] = useState(currentMonthKey());
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const requestedPeriodRef = useRef("");
  useEffect(() => {
    if (!period || requestedPeriodRef.current === period) return;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 11);
    const cutoffKey = cutoff.toISOString().slice(0, 7);
    if (period >= cutoffKey) return;
    requestedPeriodRef.current = period;
    refresh({ activityMonth: period }).catch((error) => setExportError(`Riwayat ${monthLabel(period)} belum dapat dimuat: ${error.message}`));
  }, [period]);
  const rows = (validStudent === "all" ? filteredStudents : filteredStudents.filter((s) => s.id === validStudent))
    .flatMap((s) => studentScores(db, s.id).map((sc) => ({ ...sc, _nama: s.nama })))
    .filter((r) => !period || monthKey(r.tanggal) === period)
    .sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1));
  const attendanceRows = (validStudent === "all" ? filteredStudents : filteredStudents.filter((s) => s.id === validStudent))
    .flatMap((s) => studentAttendance(db, s.id).map((att) => ({ ...att, _nama: s.nama, _kelas: className(db, s.kelasId) })))
    .filter((r) => !period || monthKey(r.tanggal) === period)
    .sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1));

  function exportRows() {
    return rows.map((r) => ({Siswa:r._nama, Kelas:className(db, db.students.find((s) => s.id === r.studentId)?.kelasId),
      Tanggal:r.tanggal, Surat:surahName(db,r.surahId), Ayat:`${r.ayatMulai}-${r.ayatAkhir}`,
      Nilai:r.nilaiHuruf || r.nilai, Penguji:r.penguji || "-", Catatan:r.catatan || ""}));
  }
  function exportAttendanceRows() {
    return attendanceRows.map((r) => ({Siswa:r._nama, Kelas:r._kelas, Tanggal:r.tanggal, Status:STATUS_META[r.status]?.label || r.status, Catatan:r.note || ""}));
  }
  async function exportRecap(format) {
    setExporting(true); setExportError("");
    try {
      const data = exportRows();
      if (format === "xlsx") {
        const XLSX = await loadXlsx();
        const sheet = XLSX.utils.json_to_sheet(data);
        sheet["!cols"] = [{wch:32},{wch:14},{wch:14},{wch:22},{wch:12},{wch:8},{wch:28},{wch:45}];
        const attendanceSheet = XLSX.utils.json_to_sheet(exportAttendanceRows());
        attendanceSheet["!cols"] = [{wch:32},{wch:18},{wch:14},{wch:14},{wch:40}];
        const summarySheet = XLSX.utils.json_to_sheet([
          { Keterangan: "Kelas", Nilai: validClass === "all" ? "Semua kelas" : className(db, validClass) },
          { Keterangan: "Periode", Nilai: period ? monthLabel(period) : "Semua periode" },
          { Keterangan: "Jumlah penilaian", Nilai: data.length },
          { Keterangan: "Jumlah catatan kehadiran", Nilai: attendanceRows.length },
          { Keterangan: "Hadir", Nilai: attendanceRows.filter((r) => r.status === "HADIR").length },
          { Keterangan: "Sakit", Nilai: attendanceRows.filter((r) => r.status === "SAKIT").length },
          { Keterangan: "Izin", Nilai: attendanceRows.filter((r) => r.status === "IZIN").length },
          { Keterangan: "Alpha", Nilai: attendanceRows.filter((r) => r.status === "ALPHA").length },
        ]);
        const book = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(book, summarySheet, "Ringkasan");
        XLSX.utils.book_append_sheet(book, sheet, "Rekap Penilaian");
        XLSX.utils.book_append_sheet(book, attendanceSheet, "Rekap Kehadiran");
        XLSX.writeFile(book, `Rekap_Kelas_${safeExportName(validClass === "all" ? "semua_kelas" : className(db, validClass))}_${period || "semua_periode"}.xlsx`);
      } else {
        const { downloadRecapPdf } = await import("./pdfExports.js");
        await downloadRecapPdf(data, period ? monthLabel(period) : "Semua periode");
      }
    } catch (error) { setExportError(error.message); }
    finally { setExporting(false); }
  }
  return (
    <div>
       <SectionTitle sub={sub}>Rekap Kelas Bulanan</SectionTitle>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
         <label>Bulan rekap<input className="t-input" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} /></label>
        <button className="t-btn t-btn-ghost" onClick={() => setPeriod("")}>Semua periode</button>
         <button className="t-btn t-btn-primary" disabled={exporting || (!rows.length && !attendanceRows.length)} onClick={() => exportRecap("xlsx")}><Download size={14} /> Unduh Excel (2 Rekap)</button>
         <button className="t-btn t-btn-ghost" disabled={exporting || !rows.length} onClick={() => exportRecap("pdf")}><Download size={14} /> Unduh PDF Penilaian</button>
      </div>
      {exportError && <p role="alert" style={{color:"var(--red)"}}>{exportError}</p>}
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}}>
        <label style={{display:"grid",gap:6,fontSize:12}}>Kelas rekap
          <select className="t-select" style={{width:240,maxWidth:"100%"}} value={validClass} onChange={e => {setClassFilter(e.target.value);setFilter("all");setExportError("");}}>
            <option value="all">Semua kelas</option>
            {availableClasses.map(c => <option key={c.id} value={c.id}>{c.nama}</option>)}
          </select>
        </label>
        <label style={{display:"grid",gap:6,fontSize:12}}>Nama siswa rekap
          <select className="t-select" style={{width:280,maxWidth:"100%"}} value={validStudent} disabled={!filteredStudents.length} onChange={e => {setFilter(e.target.value);setExportError("");}}>
            <option value="all">{filteredStudents.length ? `Semua siswa (${filteredStudents.length})` : "Belum ada siswa"}</option>
            {filteredStudents.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
          </select>
        </label>
      </div>
       <p role="status" style={{fontSize:12,color:"#64786e"}}>{rows.length} penilaian dan {attendanceRows.length} catatan kehadiran sesuai pilihan kelas, siswa, dan periode. Excel berisi ringkasan, penilaian, dan kehadiran.</p>
       <div className="t-card-soft" style={{padding:14,marginBottom:16}}>
         <strong>Ringkasan kehadiran {period ? `· ${monthLabel(period)}` : ""}</strong>
         <span style={{marginLeft:12}}>Hadir {attendanceRows.filter((r) => r.status === "HADIR").length}</span>
         <span style={{marginLeft:12}}>Sakit {attendanceRows.filter((r) => r.status === "SAKIT").length}</span>
         <span style={{marginLeft:12}}>Izin {attendanceRows.filter((r) => r.status === "IZIN").length}</span>
         <span style={{marginLeft:12}}>Alpha {attendanceRows.filter((r) => r.status === "ALPHA").length}</span>
       </div>
      <div className="t-card" style={{ padding: 8, overflowX:"auto" }}>
        <table className="t-table">
          <thead>
            <tr>
              {validStudent === "all" && <th>Siswa</th>}
              <th>Kelas</th><th>Tanggal</th><th>Surat</th><th>Ayat</th><th>Nilai</th><th>Penguji</th>{user.role !== "siswa" && <th>Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((r) => (
              <tr key={r.id}>
                {validStudent === "all" && <td style={{ fontWeight: 600 }}>{r._nama}</td>}
                <td>{className(db, db.students.find(s => s.id === r.studentId)?.kelasId)}</td><td>{fmtDate(r.tanggal)}</td>
                <td>{surahName(db, r.surahId)}</td>
                <td>{r.ayatMulai}-{r.ayatAkhir}</td>
                <td className="font-mono" style={{ fontWeight: 700 }}>{r.nilaiHuruf || r.nilai}</td>
                <td>{r.penguji}</td>{user.role !== "siswa" && <td><DeleteScoreButton score={r} user={user} db={db} refresh={refresh} /></td>}
              </tr>
            )) : (
              <tr><td colSpan={8}><Empty text="Belum ada data setoran." /></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PresensiSiswa({ db, user }) {
  const student = db.students.find((s) => s.id === user.refId);
  if (!student) return <Empty text="Akun ini tidak termasuk peserta Tahfidz atau data siswa belum terhubung." />;
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

function ReportSheet({ db, student, mk, reportDate }) {
  const stats = reportStats(db, student.id, mk);
  const teacher = db.teachers.find((t) => t.id === classTeacherId(db, student.kelasId));
  const teacherSignature = teacher ? db.profiles.find((p) => p.role === "pengajar" && p.refId === teacher.id)?.signatureUrl : null;
  const adminSignature = resolvePicSignature(db.profiles);
  const stempelUrl = db.schoolSettings?.stempelUrl;
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
          <div><b>Pengajar</b> : {teacher?.nama || "-"}</div>
          <div><b>Jenis Kelamin</b> : {student.jenisKelamin === "L" ? "Laki-laki" : student.jenisKelamin === "P" ? "Perempuan" : "-"}</div>
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
                <td className="font-mono" style={{ fontWeight: 700 }}>{s.nilaiHuruf || s.nilai}</td>
                <td>{s.penguji}</td>
              </tr>
            )) : <tr><td colSpan={5}><Empty text="Tidak ada setoran pada periode ini." /></td></tr>}
          </tbody>
        </table>

        <div className="report-sig" style={{ marginTop: 24, breakInside: "avoid", alignItems: "start" }}>
          <div>
            <div style={{height:22}} aria-hidden="true" />
            <div style={{height:22}}>Mengetahui,</div>
            <div>Pengajar Tahfidz</div>
            {teacherSignature ? (
              <img src={teacherSignature} alt="Tanda tangan pengajar" style={{ height: 44, margin: "8px auto 0", display: "block", objectFit: "contain" }} />
            ) : <div style={{ height: 44, marginTop: 8 }} />}
            <div className="line">{teacher?.nama || "-"}</div>
          </div>
          <div style={{ position: "relative" }}>
            <div style={{minHeight:22,whiteSpace:"nowrap",fontSize:12}}>Malang, {longDateID(reportDate)}</div>
            <div style={{height:22}} aria-hidden="true" />
            <div>PIC Tahfidz</div>
            <div style={{ position: "relative", height: 44, marginTop: 8 }}>
              {adminSignature && <img src={adminSignature} alt="Tanda tangan PIC Tahfidz" style={{ height: 44, margin: "0 auto", display: "block", objectFit: "contain" }} />}
              {stempelUrl && <img src={stempelUrl} alt="Stempel sekolah" style={{ height: 64, position: "absolute", left: "50%", top: "50%", transform: "translate(-70%,-50%) rotate(-8deg)", opacity: 0.9, objectFit: "contain" }} />}
            </div>
            <div className="line">{PIC_TAHFIDZ}</div>
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
    const classes = teacherClasses(db, user.refId);
    students = teacherStudents(db, user.refId); sub = classListLabel(classes);
  }
  if (user.role === "mentor") { students = mentorStudents(db, user.refId); sub = "Siswa binaan Anda"; }

  const [mk, setMk] = useState(currentMonthKey());
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("all");
  const availableClasses = db.classes.filter(c =>
    user.role === "admin" || (user.role === "pengajar" && c.teacherId === user.refId) ||
    (user.role === "mentor" && students.some(s => s.kelasId === c.id))
  ).sort((a,b) => a.nama.localeCompare(b.nama,"id",{numeric:true}));
  const validClassId = availableClasses.some(c => c.id === classId) ? classId : "";
  const classStudents = students.filter(s => validClassId && s.kelasId === validClassId)
    .sort((a,b) => a.nama.localeCompare(b.nama,"id"));
  const validStudentId = studentId === "all" || classStudents.some(s => s.id === studentId) ? studentId : "all";
  const [reportDate, setReportDate] = useState(defaultReportDate(mk));
  const [dateLoading, setDateLoading] = useState(true);
  const [dateSaving, setDateSaving] = useState(false);
  const [dateDirty, setDateDirty] = useState(false);
  const [dateError, setDateError] = useState("");
  const [dateMsg, setDateMsg] = useState("");
  useEffect(() => {
    let cancelled = false;
    setDateLoading(true); setDateError(""); setDateMsg(""); setDateDirty(false);
    fetchReportMonthSettings(mk).then((data) => {
      if (!cancelled) setReportDate(data?.report_date || defaultReportDate(mk));
    }).catch((error) => { if (!cancelled) setDateError("Tanggal laporan gagal dimuat: " + error.message); })
      .finally(() => { if (!cancelled) setDateLoading(false); });
    return () => { cancelled = true; };
  }, [mk]);
  async function saveDate() {
    setDateSaving(true); setDateError(""); setDateMsg("");
    try {
      await saveReportMonthSettings(mk, reportDate);
      setDateDirty(false); setDateMsg("Tanggal bulan ini tersimpan untuk seluruh laporan siswa.");
    } catch (error) { setDateError(error.message); }
    finally { setDateSaving(false); }
  }
  function handleDownload() { if (!dateLoading && !dateError && !dateDirty) window.print(); }

  const selected = validStudentId === "all" ? classStudents : classStudents.filter((s) => s.id === validStudentId);

  return (
    <div>
      <SectionTitle sub={sub}>Report Bulanan</SectionTitle>
      <div className="no-print" style={{ display: "flex", gap: 10, alignItems: "end", marginBottom: 20, flexWrap: "wrap" }}>
        <label style={{display:"grid",gap:6,fontSize:12}}>1. Pilih kelas
          <select className="t-select" style={{width:240,maxWidth:"100%"}} value={validClassId} onChange={e => {setClassId(e.target.value);setStudentId("all");}}>
            <option value="">Pilih kelas terlebih dahulu</option>
            {availableClasses.map(c => <option key={c.id} value={c.id}>{c.nama}</option>)}
          </select>
        </label>
        <label style={{display:"grid",gap:6,fontSize:12}}>2. Pilih nama siswa
          <select className="t-select" style={{width:280,maxWidth:"100%"}} value={validStudentId} disabled={!validClassId || !classStudents.length} onChange={e => setStudentId(e.target.value)}>
            <option value="all">{!validClassId ? "Pilih kelas dahulu" : !classStudents.length ? "Belum ada siswa" : `Semua siswa di kelas ini (${classStudents.length})`}</option>
            {classStudents.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
          </select>
        </label>
        <input aria-label="Bulan laporan" type="month" className="t-input" style={{ width: 180 }} value={mk} disabled={dateSaving} onChange={(e) => { if (e.target.value) setMk(e.target.value); }} />
        <button className="t-btn t-btn-gold" onClick={handleDownload} disabled={dateLoading || dateSaving || !!dateError || dateDirty || !selected.length}>
          <FileText size={15} /> Unduh PDF
        </button>
        <span style={{ fontSize: 11.5, color: "#8A8064" }}>Pada dialog cetak, pilih tujuan &ldquo;Save as PDF&rdquo;.</span>
      </div>

      <div className="no-print t-card-soft" style={{padding:14,marginBottom:16}}>
        {user.role === "admin" ? <div style={{display:"flex",gap:10,alignItems:"end",flexWrap:"wrap"}}>
          <label>Tanggal pengesahan — {monthLabel(mk)}<input className="t-input" type="date" value={reportDate} disabled={dateLoading || dateSaving} onChange={(e) => {setReportDate(e.target.value);setDateDirty(true);setDateMsg("");}} /></label>
          <button className="t-btn t-btn-primary" disabled={dateLoading || dateSaving || !reportDate} onClick={saveDate}>{dateSaving ? "Menyimpan..." : "Simpan tanggal bulan ini"}</button>
        </div> : <span>Tanggal pengesahan: {dateLoading ? "Memuat..." : dateError ? "Tidak tersedia" : longDateID(reportDate)}. Diatur oleh admin.</span>}
        {dateDirty && <p>Simpan tanggal sebelum mencetak laporan.</p>}
        {dateError && <p role="alert" style={{color:"var(--red)"}}>{dateError}</p>}
        {dateMsg && <p role="status">{dateMsg}</p>}
      </div>
      {!dateLoading && !dateError && selected.length ? (
        <div className="print-area">
          {selected.map((s) => <ReportSheet key={s.id} db={db} student={s} mk={mk} reportDate={reportDate || defaultReportDate(mk)} />)}
        </div>
      ) : <Empty text={dateLoading ? "Memuat tanggal laporan..." : dateError ? "Laporan belum dapat ditampilkan. Periksa pesan tanggal laporan di atas." : !validClassId ? "Pilih kelas terlebih dahulu untuk menampilkan laporan." : "Tidak ada siswa pada kelas ini."} />}
    </div>
  );
}

/* ============================== ADMIN: MASTER DATA ============================== */
function MasterData({ db, refresh }) {
  const [tab, setTab] = useState("siswa");
  const [form, setForm] = useState({ nama: "", nis: "", kelasId: db.classes[0]?.id, jenisKelamin: "L" });
  const [newClass, setNewClass] = useState({ nama: "", teacherId: "" });
  const [preview, setPreview] = useState([]);
  const [importError, setImportError] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkKelasId, setBulkKelasId] = useState(db.classes[0]?.id);
  const [rowBusyId, setRowBusyId] = useState(null);

  async function addStudent() {
    if (!form.nama.trim() || !form.nis.trim()) return;
    setBusy(true);
    try {
      await insertStudent({ nis: form.nis, nama: form.nama, kelasId: form.kelasId, jenisKelamin: form.jenisKelamin });
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
    if (!newClass.nama.trim()) return;
    setBusy(true);
    try {
      await insertClass(newClass.nama, newClass.teacherId || null);
      await refresh();
      setNewClass({ nama: "", teacherId: "" });
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
  async function handleAssignTeacher(kelasId, teacherId) {
    setRowBusyId(kelasId);
    try {
      await updateClassTeacher(kelasId, teacherId || null);
      await refresh();
    } catch (e) {
      alert("Gagal menugaskan pengajar: " + e.message);
    }
    setRowBusyId(null);
  }
  async function handleChangeClass(studentId, kelasId) {
    setRowBusyId(studentId);
    try {
      await updateStudentClass(studentId, kelasId);
      await refresh();
    } catch (e) {
      alert("Gagal memindahkan kelas: " + e.message);
    }
    setRowBusyId(null);
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }
  function toggleSelectAll() {
    setSelectedIds((prev) => prev.length === db.students.length ? [] : db.students.map((s) => s.id));
  }
  async function bulkMove() {
    if (!selectedIds.length) return;
    setBusy(true);
    try {
      await bulkUpdateStudentClass(selectedIds, bulkKelasId);
      await refresh();
      setSelectedIds([]);
    } catch (e) {
      alert("Gagal memindahkan siswa terpilih: " + e.message);
    }
    setBusy(false);
  }
  async function bulkDelete() {
    if (!selectedIds.length) return;
    if (!confirm(`Hapus ${selectedIds.length} siswa terpilih beserta seluruh riwayat presensi & nilainya? Tindakan ini tidak bisa dibatalkan.`)) return;
    setBusy(true);
    try {
      await bulkDeleteStudents(selectedIds);
      await refresh();
      setSelectedIds([]);
    } catch (e) {
      alert("Gagal menghapus siswa terpilih: " + e.message);
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

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImportError(""); setImportMsg("");
    try {
      const XLSX = await loadXlsx();
      const data = new Uint8Array(await file.arrayBuffer());
      const wb = XLSX.read(data, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      const mapped = json
        .map((row) => ({
          nama: String(getField(row, ["nama", "namasiswa", "name"])).trim(),
          nis: String(getField(row, ["nis", "nomorinduksiswa", "nomorindukswa", "nomorindukssiswa"])).trim(),
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
    e.target.value = "";
  }

  async function commitImport() {
    setBusy(true);
    setImportError(""); setImportMsg("");
    try {
      const seen = new Set();
      for (const row of preview) {
        const nis = String(row.nis || "").trim();
        if (!nis) throw new Error(`NIS wajib diisi untuk ${row.nama}. Lengkapi file lalu impor ulang.`);
        if (seen.has(nis)) throw new Error(`NIS ${nis} muncul lebih dari sekali dalam file. Sisakan satu baris yang benar lalu impor ulang.`);
        seen.add(nis);
      }
      let classes = db.classes;
      const rows = [];
      for (let i = 0; i < preview.length; i++) {
        const row = preview[i];
        const existing = db.students.find(s => String(s.nis).trim() === String(row.nis).trim());
        let kelasObj = null;
        if (row.kelas) {
          kelasObj = await findOrCreateClassByName(row.kelas, classes);
          if (!classes.some((c) => c.id === kelasObj.id)) classes = [...classes, kelasObj];
        }
        rows.push({
          nis: String(row.nis).trim(),
          nama: row.nama,
          jenisKelamin: row.jenisKelamin || existing?.jenisKelamin || "",
          kelasId: kelasObj ? kelasObj.id : (existing?.kelasId || null),
        });
      }
      await bulkUpsertStudents(rows);
      await refresh();
      setImportMsg(`${rows.length} data peserta berhasil diproses. NIS yang sudah ada diperbarui, NIS baru ditambahkan. Riwayat presensi, penilaian, dan agama tetap dipertahankan.`);
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
      <SectionTitle sub="Kelola data induk: siswa dan kelas. Setiap kelas ditugaskan ke satu pengajar.">Master Data</SectionTitle>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["siswa", "kelas"].map((t) => (
          <button key={t} className="t-btn" style={{ background: tab === t ? "var(--ink)" : "var(--panel-soft)", color: tab === t ? "white" : "var(--ink)" }} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "siswa" && (
        <div className="master-grid">
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
                <button className="t-btn t-btn-primary" style={{ justifyContent: "center" }} onClick={addStudent} disabled={busy}><Plus size={14} /> Tambah</button>
              </div>
            </div>

            <div className="t-card" style={{ padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Import dari File</div>
              <div style={{ fontSize: 11.5, color: "#8A8064", marginBottom: 10 }}>
                Format .xlsx, .xls, atau .csv dengan kolom Nama, NIS (wajib untuk impor), Kelas, dan Jenis Kelamin.
              </div>
              <button className="t-btn t-btn-ghost" style={{ width: "100%", justifyContent: "center", marginBottom: 8 }} onClick={downloadTemplate}>
                <FileText size={14} /> Unduh Template
              </button>
              <input type="file" accept=".xlsx,.xls,.csv" className="t-input" style={{ padding: 6 }} onChange={handleFile} />
              {importError && <div style={{ fontSize: 12, color: "var(--red)", marginTop: 8, fontWeight: 600 }}>{importError}</div>}
              {importMsg && <div style={{ fontSize: 12, color: "var(--teal)", marginTop: 8, fontWeight: 600 }}>{importMsg}</div>}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
            {preview.length > 0 && (
              <div className="t-card-soft" style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>Pratinjau Import &mdash; {preview.length} siswa terdeteksi</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="t-btn t-btn-ghost" onClick={() => setPreview([])}>Batalkan</button>
                    <button className="t-btn t-btn-primary" onClick={commitImport} disabled={busy}><CheckCircle2 size={14} /> {busy ? "Mengimpor..." : `Import ${preview.length} Siswa`}</button>
                  </div>
                </div>
                <div style={{ maxHeight: 260, overflow: "auto" }} className="t-scrollbar">
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

            {selectedIds.length > 0 && (
              <div className="t-card" style={{ padding: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", borderColor: "var(--gold)" }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{selectedIds.length} siswa dipilih</span>
                <select className="t-select" style={{ width: 220 }} value={bulkKelasId} onChange={(e) => setBulkKelasId(e.target.value)}>
                  {db.classes.map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}
                </select>
                <button className="t-btn t-btn-gold" onClick={bulkMove} disabled={busy}>
                  {busy ? "Memindahkan..." : "Pindahkan ke Kelas Ini"}
                </button>
                <button className="t-btn t-btn-danger" onClick={bulkDelete} disabled={busy}>
                  <Trash2 size={13} /> {busy ? "Menghapus..." : "Hapus Terpilih"}
                </button>
                <button className="t-btn t-btn-ghost" onClick={() => setSelectedIds([])}>Batal Pilih</button>
              </div>
            )}

            <div className="t-card" style={{ padding: 8 }}>
              <div style={{ overflowX: "auto" }} className="t-scrollbar">
              <table className="t-table" style={{ minWidth: 560 }}>
                <thead>
                  <tr>
                    <th style={{ width: 28 }}>
                      <input type="checkbox" checked={selectedIds.length === db.students.length && db.students.length > 0} onChange={toggleSelectAll} />
                    </th>
                    <th>NIS</th><th>Nama</th><th>L/P</th><th>Agama / Tahfidz</th><th>Kelas</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {db.students.map((s) => (
                    <tr key={s.id}>
                      <td><input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => toggleSelect(s.id)} /></td>
                      <td className="font-mono">{s.nis}</td>
                      <td style={{ fontWeight: 600 }}>{s.nama}</td>
                      <td>{s.jenisKelamin || "-"}</td><td><StudentReligionEditor student={s} refresh={refresh} /></td>
                      <td>
                        <select
                          className="t-select" style={{ fontSize: 12, padding: "5px 8px" }}
                          value={s.kelasId || ""} disabled={rowBusyId === s.id}
                          onChange={(e) => handleChangeClass(s.id, e.target.value)}
                        >
                          {db.classes.map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}
                        </select>
                      </td>
                      <td><button className="t-btn t-btn-danger" style={{ padding: "5px 8px" }} onClick={() => removeStudent(s.id)}><Trash2 size={13} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "kelas" && (
        <div className="master-grid">
          <div className="t-card" style={{ padding: 16, height: "fit-content" }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Tambah Kelas</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input className="t-input" placeholder="Nama kelas (mis. X RPL 2)" value={newClass.nama} onChange={(e) => setNewClass({ ...newClass, nama: e.target.value })} />
              <select className="t-select" value={newClass.teacherId} onChange={(e) => setNewClass({ ...newClass, teacherId: e.target.value })}>
                <option value="">Belum ditugaskan</option>
                {db.teachers.map((t) => <option key={t.id} value={t.id}>{t.nama}</option>)}
              </select>
              <button className="t-btn t-btn-primary" style={{ justifyContent: "center" }} onClick={addClass} disabled={busy}><Plus size={14} /> Tambah</button>
            </div>
          </div>
          <div className="t-card" style={{ padding: 8, overflowX: "auto" }}>
            <div style={{ overflowX: "auto" }} className="t-scrollbar">
            <table className="t-table" style={{ minWidth: 480 }}>
              <thead><tr><th>Nama Kelas</th><th>Pengajar</th><th>Jumlah Siswa</th><th></th></tr></thead>
              <tbody>
                {db.classes.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.nama}</td>
                    <td>
                      <select
                        className="t-select" style={{ fontSize: 12, padding: "5px 8px" }}
                        value={c.teacherId || ""} disabled={rowBusyId === c.id}
                        onChange={(e) => handleAssignTeacher(c.id, e.target.value)}
                      >
                        <option value="">Belum ditugaskan</option>
                        {db.teachers.map((t) => <option key={t.id} value={t.id}>{t.nama}</option>)}
                      </select>
                    </td>
                    <td>{db.students.filter((s) => s.kelasId === c.id).length}</td>
                    <td><button className="t-btn t-btn-danger" style={{ padding: "5px 8px" }} onClick={() => removeClass(c.id)}><Trash2 size={13} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================== ADMIN: MANAJEMEN USER ============================== */

/* ============================== ADMIN: MANAJEMEN USER ============================== */
function ManajemenUser({ db, refresh, user }) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nama: "", email: "", password: "", role: "pengajar" });
  const [creating, setCreating] = useState(false);
  const [formMsg, setFormMsg] = useState("");

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

  async function handleCreate(e) {
    e.preventDefault();
    setFormMsg("");
    if (!form.nama.trim() || !form.email.trim() || !form.password) {
      setFormMsg("Nama, email, dan password wajib diisi.");
      return;
    }
    if (form.password.length < 6) {
      setFormMsg("Password minimal 6 karakter.");
      return;
    }
    setCreating(true);
    try {
      await createUserAccount({ nama: form.nama.trim(), email: form.email.trim(), password: form.password, role: form.role });
      await refresh();
      setForm({ nama: "", email: "", password: "", role: "pengajar" });
      setFormMsg("");
      setShowForm(false);
    } catch (e) {
      setFormMsg(e.message);
    }
    setCreating(false);
  }

  const visibleProfiles = db.profiles.filter(p =>
    (p.nama || "").toLocaleLowerCase("id").includes(search.trim().toLocaleLowerCase("id")) &&
    (!roleFilter || p.role === roleFilter)
  );
  return (
    <div className="user-management">
      <SectionTitle sub="Kelola akses akun pengguna, atau buat akun baru untuk pengajar/mentor/admin.">Manajemen User</SectionTitle>

      <div style={{ marginBottom: 16 }}>
        <button className="t-btn t-btn-primary" onClick={() => setShowForm((v) => !v)}>
          <Plus size={15} /> {showForm ? "Tutup Form" : "Tambah User Baru"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="t-card" style={{ padding: 20, marginBottom: 20, maxWidth: 440 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#8A8064" }}>Nama Lengkap</label>
              <input className="t-input" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="Ustadz/Ustadzah ..." required />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#8A8064" }}>Email</label>
              <input type="email" className="t-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="nama@mitrarsq.app" required />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#8A8064" }}>Password Awal</label>
              <input type="text" className="t-input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Minimal 6 karakter" required />
              <div style={{ fontSize: 11, color: "#8A8064", marginTop: 4 }}>Sampaikan password ini ke yang bersangkutan secara langsung. Mereka bisa menggantinya sendiri lewat menu "Ganti Password" setelah login.</div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#8A8064" }}>Role</label>
              <select className="t-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="pengajar">Pengajar Tahfidz</option>
                <option value="mentor">Mentor</option>
                <option value="admin">Admin</option>
              </select>
              {(form.role === "pengajar" || form.role === "mentor") && (
                <div style={{ fontSize: 11, color: "#8A8064", marginTop: 4 }}>
                  Data {form.role === "pengajar" ? "pengajar" : "mentor"} baru akan otomatis dibuat dengan nama di atas. Untuk pengajar, tugaskan kelas lewat Master Data. Untuk mentor, atur penugasan siswa melalui pengelolaan mentor.
                </div>
              )}
            </div>
            {formMsg && <div style={{ fontSize: 12.5, color: "var(--red)", fontWeight: 600 }}>{formMsg}</div>}
            <button type="submit" className="t-btn t-btn-primary" style={{ justifyContent: "center" }} disabled={creating}>
              {creating ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} {creating ? "Membuat akun..." : "Buat Akun"}
            </button>
          </div>
        </form>
      )}

      <div className="t-card um-panel">
        <div className="um-toolbar">
          <label className="um-search">Cari pengguna
            <input className="t-input" type="search" placeholder="Ketik nama pengguna..." value={search} onChange={e => setSearch(e.target.value)} />
          </label>
          <label className="um-filter">Filter role
            <select className="t-select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
              <option value="">Semua role</option>
              {Object.entries(ROLE_LABEL).map(([value,label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <span className="um-count" role="status">{visibleProfiles.length} dari {db.profiles.length} pengguna</span>
        </div>
        <table className="t-table um-table">
          <thead><tr><th>Pengguna</th><th>Role & akses</th><th>Status</th><th>Kelola akun</th></tr></thead>
          <tbody>
            {visibleProfiles.map(p => (
              <tr key={p.id}>
                <td data-label="Pengguna">
                  <div className="um-person">
                    <span className="um-avatar" aria-hidden="true">{(p.nama || "?").trim().split(/\s+/).slice(0,2).map(n => n[0]).join("").toUpperCase()}</span>
                    <div><strong>{p.nama}</strong>{p.id === user?.id && <small>Akun Anda</small>}</div>
                  </div>
                </td>
                <td data-label="Role & akses">
                  <span className={`um-role um-role-${p.role}`}>{ROLE_LABEL[p.role] || p.role}</span>
                  <RoleChangeButton profile={p} db={db} user={user} refresh={refresh} />
                </td>
                <td data-label="Status">
                  <span className={`um-status ${p.status === "aktif" ? "is-active" : "is-inactive"}`}>
                    {p.status === "aktif" ? "Aktif" : "Nonaktif"}
                  </span>
                  {p.role !== "admin" && <button type="button" className="um-status-action" onClick={() => toggle(p)} disabled={busyId === p.id}>
                    {busyId === p.id ? "Menyimpan..." : p.status === "aktif" ? "Nonaktifkan" : "Aktifkan"}
                  </button>}
                </td>
                <td data-label="Kelola akun"><AdminUserActions profile={p} db={db} /></td>
              </tr>
            ))}
            {!visibleProfiles.length && <tr><td colSpan={4} className="um-empty">Tidak ada pengguna yang cocok. Coba nama atau filter lain.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================== ADMIN: MONITORING ============================== */
function Monitoring({ db }) {
  const mk = currentMonthKey();
  const rows = db.classes.map((c) => {
    const members = db.students.filter((s) => s.kelasId === c.id);
    const ids = members.map((m) => m.id);
    const att = db.attendance.filter((a) => monthKey(a.tanggal) === mk && ids.includes(a.studentId));
    const sc = db.scores.filter((s) => monthKey(s.tanggal) === mk && ids.includes(s.studentId));
    return {
      nama: c.nama,
      pengajar: teacherName(db, c.teacherId),
      jumlahSiswa: members.length,
      kehadiran: attendancePct(att),
      setoran: sc.length,
      rataNilai: avg(sc.map((s) => s.nilai)) || 0,
    };
  });
  return (
    <div>
      <SectionTitle sub="Perbandingan performa antar kelas bulan ini">Monitoring</SectionTitle>
      <div className="t-card" style={{ padding: 18, marginBottom: 16 }}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={rows}>
            <CartesianGrid stroke="#e4e4e7" vertical={false} />
            <XAxis dataKey="nama" tick={{ fontSize: 11 }} stroke="#71717a" interval={0} angle={-15} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 12 }} stroke="#71717a" />
            <Tooltip />
            <Bar dataKey="setoran" fill="#2F6F63" radius={[6, 6, 0, 0]} name="Jumlah Setoran" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="t-card" style={{ padding: 8, overflowX: "auto" }}>
        <div style={{ overflowX: "auto" }} className="t-scrollbar">
        <table className="t-table" style={{ minWidth: 560 }}>
          <thead><tr><th>Kelas</th><th>Pengajar</th><th>Siswa</th><th>Kehadiran</th><th>Setoran</th><th>Rata-rata Nilai</th></tr></thead>
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
    </div>
  );
}

/* ============================== APP ROOT ============================== */
export default function TahfidzApp() {
  const [db, setDb] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [activityWarning, setActivityWarning] = useState("");
  const [view, setView] = useState("dashboard");
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const sessionHandledRef = useRef("");

  async function syncActivity(cacheKey) {
    try {
      const activity = await fetchActivityData();
      setDb((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...activity };
        if (cacheKey) {
          try { sessionStorage.setItem(`saqu-db-cache:${cacheKey}`, JSON.stringify({ savedAt: Date.now(), data: next })); } catch { /* cache is optional */ }
        }
        return next;
      });
      setActivityWarning("");
      return activity;
    } catch (e) {
      console.warn("Sinkronisasi presensi dan penilaian gagal:", e);
      setActivityWarning("Riwayat presensi dan penilaian belum termuat. Jalankan indeks Supabase pada panduan deploy, lalu coba lagi.");
      throw e;
    }
  }

  async function refresh(options) {
    if (options?.attendanceFor) {
      const {studentIds, date} = options.attendanceFor;
      const attendance = await fetchAttendanceForDate(studentIds, date);
      const ids = new Set(studentIds || []);
      setDb((prev) => prev ? { ...prev, attendance: [...prev.attendance.filter((row) => !(ids.has(row.studentId) && row.tanggal === date)), ...attendance] } : prev);
      return;
    }
    if (options?.activityMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(options.activityMonth)) {
      const fromDate = `${options.activityMonth}-01`;
      const nextMonth = new Date(`${fromDate}T12:00:00Z`);
      nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
      const toDate = new Date(nextMonth.getTime() - 86400000).toISOString().slice(0, 10);
      const activity = await fetchActivityData({ fromDate, toDate });
      setDb((prev) => {
        if (!prev) return prev;
        const merge = (oldRows, newRows) => {
          const byId = new Map(oldRows.map((row) => [row.id, row]));
          newRows.forEach((row) => byId.set(row.id, row));
          return [...byId.values()];
        };
        return { ...prev, attendance: merge(prev.attendance, activity.attendance), scores: merge(prev.scores, activity.scores) };
      });
      setActivityWarning("");
      return activity;
    }
    if (options?.scoresForMany?.length) {
      const studentIds = [...new Set(options.scoresForMany.filter(Boolean))];
      const scores = await fetchScoresForStudents(studentIds);
      setDb((prev) => prev ? { ...prev, scores: [...prev.scores.filter((s) => !studentIds.includes(s.studentId)), ...scores] } : prev);
      return;
    }
    if (options?.scoresFor) {
      const scores = await fetchStudentScores(options.scoresFor);
      setDb((prev) => prev ? { ...prev, scores: [...prev.scores.filter((s) => s.studentId !== options.scoresFor), ...scores] } : prev);
      return;
    }
    try {
      const data = await fetchAllData({ includeActivity: !options?.initial });
      setDb(data);
      if (options?.cacheKey) {
        try { sessionStorage.setItem(`saqu-db-cache:${options.cacheKey}`, JSON.stringify({ savedAt: Date.now(), data })); } catch { /* cache is optional */ }
      }
      if (options?.initial) syncActivity(options.cacheKey).catch(() => {});
      return data;
    } catch (e) {
      console.error("Gagal memuat data:", e);
      throw e;
    }
  }

  async function handleSession(session) {
    const sessionKey = session?.user?.id || "signed-out";
    if (sessionHandledRef.current === sessionKey) return;
    sessionHandledRef.current = sessionKey;
    if (!session) {
      setProfile(null);
      setDb(null);
      setActivityWarning("");
      setLoading(false);
      return;
    }
    let prof;
    let error;
    try {
      ({ data: prof, error } = await withClientTimeout(
        supabase.from("profiles").select("*").eq("id", session.user.id).single(),
        "Memuat profil pengguna",
      ));
    } catch (profileError) {
      console.error("Gagal memuat profil pengguna:", profileError);
      setAuthError("Tidak dapat menghubungkan ke database: " + profileError.message);
      setProfile(null);
      setDb(null);
      setLoading(false);
      return;
    }

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
    setActivityWarning("");
    setProfile({ id: prof.id, nama: prof.nama, role: prof.role, refId: prof.ref_id, status: prof.status });
    let cached = null;
    try {
      const raw = sessionStorage.getItem(`saqu-db-cache:${prof.id}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.data && Date.now() - Number(parsed.savedAt || 0) < 15 * 60 * 1000) cached = parsed.data;
      }
    } catch { /* ignore unavailable/corrupt cache */ }
    if (cached) {
      setDb(cached);
      setLoading(false);
      // Tampilkan cache segera, lalu sinkronkan data terbaru tanpa memblokir layar.
      syncActivity(prof.id).catch(e => console.warn("Sinkronisasi data berjalan di latar belakang:", e));
      return;
    }
    try { await refresh({cacheKey: prof.id, initial: true}); }
    catch (e) { setAuthError("Data aplikasi gagal dimuat: " + e.message); setProfile(null); setDb(null); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    withClientTimeout(supabase.auth.getSession(), "Memeriksa sesi login")
      .then(({ data: { session } }) => handleSession(session))
      .catch((error) => {
        console.error("Gagal memeriksa sesi login:", error);
        setAuthError("Tidak dapat menghubungkan ke database: " + error.message);
        setLoading(false);
      });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
        setLoading(false);
        return;
      }
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
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setView("dashboard");
    setMobileNavOpen(false);
  }
  async function handleRecoveryDone() {
    setRecoveryMode(false);
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    sessionHandledRef.current = "";
    await handleSession(session);
  }

  if (recoveryMode) {
    return <ResetPasswordScreen onDone={handleRecoveryDone} />;
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
  const activityDb = tahfidzData(db);

  let content = null;
  if (view === "dashboard") {
    if (user.role === "admin") content = <DashboardAdmin db={activityDb} />;
    if (user.role === "pengajar") content = <DashboardPengajar db={activityDb} user={user} />;
    if (user.role === "mentor") content = <DashboardMentor db={activityDb} user={user} />;
    if (user.role === "siswa") content = <DashboardSiswa db={activityDb} user={user} />;
  } else if (view === "teacher-attendance" && user.role === "admin") {
    content = <TeacherAttendanceAdmin db={db} />;
  } else if (view === "presensi") {
    content = user.role === "pengajar" ? <PresensiHarian db={activityDb} refresh={refresh} user={user} /> : <PresensiSiswa db={activityDb} user={user} />;
  } else if (view === "penilaian") {
    content = <PenilaianTahfidz db={activityDb} refresh={refresh} user={user} />;
  } else if (view === "rekap") {
    content = <RekapView db={activityDb} user={user} refresh={refresh} />;
  } else if (view === "master") {
    content = <MasterData db={db} refresh={refresh} />;
  } else if (view === "userman") {
    content = <ManajemenUser db={db} refresh={refresh} user={user} />;
  } else if (view === "monitoring") {
    content = <Monitoring db={activityDb} />;
  } else if (view === "report") {
    content = <ReportBulanan db={activityDb} user={user} />;
  } else if (view === "profil") {
    content = <ProfilSaya db={db} refresh={refresh} user={user} />;
  } else if (view === "password") {
    content = <GantiPassword />;
  }

  return (
    <div className="tahfidz-root" style={{ display: "flex", flexDirection: "column" }}>
      <GlobalStyle />
      <AppHeader user={user} roleLabel={ROLE_LABEL[user.role]} viewLabel={NAV_BY_ROLE[user.role]?.find((item)=>item.id===view)?.label || "Dashboard"}
        photoUrl={user.role === "pengajar" ? db.teachers.find((t)=>t.id===user.refId)?.fotoUrl : null}
        onMenu={() => setMobileNavOpen(true)} onLogout={handleLogout} />
      <div style={{ display: "flex", flex: 1 }}>
        <Sidebar user={user} view={view} setView={setView} mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
        <div className="app-content" style={{ flex: 1, padding: 28, maxWidth: 1180, minWidth: 0 }}>
          {activityWarning && (
            <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", marginBottom: 16, padding: "10px 14px", borderRadius: 10, background: "#FFF4D6", color: "#7A5E32", fontSize: 13, fontWeight: 600 }}>
              <span>{activityWarning}</span>
              <button className="t-btn t-btn-ghost" type="button" onClick={() => syncActivity(user.id).catch(() => {})}>Coba lagi</button>
            </div>
          )}
          {content}
        </div>
      </div>
    </div>
  );
}


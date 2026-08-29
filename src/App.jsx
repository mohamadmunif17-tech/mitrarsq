import { useState, useEffect } from "react";
import {
  LayoutDashboard, ClipboardCheck, BookOpen, Users, Settings, BarChart3,
  FileText, LogOut, CheckCircle2, XCircle, MinusCircle, CircleDot,
  GraduationCap, UserCog, Shield, ChevronRight, Plus, Trash2,
  Loader2, BookMarked, TrendingUp, CalendarCheck, Star, Download, Printer
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar,
} from "recharts";
import * as XLSX from "xlsx";

const DB_KEY = "tahfidz_smk_telkom_db_v2";

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

function buildSeed() {
  const surahs = [
    { id: "sur1", nama: "An-Nas", ayat: 6 },
    { id: "sur2", nama: "Al-Falaq", ayat: 5 },
    { id: "sur3", nama: "Al-Ikhlas", ayat: 4 },
    { id: "sur4", nama: "Al-Lahab", ayat: 5 },
    { id: "sur5", nama: "An-Nasr", ayat: 3 },
    { id: "sur6", nama: "Al-Kafirun", ayat: 6 },
    { id: "sur7", nama: "Al-Kautsar", ayat: 3 },
    { id: "sur8", nama: "Al-Ma'un", ayat: 7 },
    { id: "sur9", nama: "Quraisy", ayat: 4 },
    { id: "sur10", nama: "Al-Fil", ayat: 5 },
    { id: "sur11", nama: "Al-Humazah", ayat: 9 },
    { id: "sur12", nama: "Al-'Asr", ayat: 3 },
    { id: "sur13", nama: "At-Takatsur", ayat: 8 },
    { id: "sur14", nama: "Al-Qari'ah", ayat: 11 },
    { id: "sur15", nama: "Az-Zalzalah", ayat: 8 },
    { id: "sur16", nama: "Al-Bayyinah", ayat: 8 },
    { id: "sur17", nama: "Al-Qadr", ayat: 5 },
    { id: "sur18", nama: "At-Tin", ayat: 8 },
  ];

  const classes = [
    { id: "kls1", nama: "X RPL 1" },
    { id: "kls2", nama: "X TKJ 2" },
    { id: "kls3", nama: "XI RPL 1" },
    { id: "kls4", nama: "XI TKJ 1" },
    { id: "kls5", nama: "XII TKJ 1" },
  ];

  const teachers = [
    { id: "t1", nama: "Ust. Ahmad Fauzi", userId: "u_ahmad" },
    { id: "t2", nama: "Ust. Budi Santoso", userId: "u_budi" },
  ];
  const mentors = [
    { id: "m1", nama: "Kak Dewi Lestari", userId: "u_dewi" },
    { id: "m2", nama: "Kak Rizky Pratama", userId: "u_rizky" },
  ];
  const groups = [
    { id: "grp1", nama: "Kelompok A", teacherId: "t1" },
    { id: "grp2", nama: "Kelompok B", teacherId: "t2" },
  ];

  const students = [
    { id: "s1", nis: "2201001", nama: "Ahmad Zaki Firmansyah", kelasId: "kls1", groupId: "grp1", jenisKelamin: "L" },
    { id: "s2", nis: "2201002", nama: "Nabila Putri Ramadhani", kelasId: "kls1", groupId: "grp1", jenisKelamin: "P" },
    { id: "s3", nis: "2201003", nama: "Fajar Nugroho", kelasId: "kls2", groupId: "grp1", jenisKelamin: "L" },
    { id: "s4", nis: "2201004", nama: "Salsabila Rahma", kelasId: "kls2", groupId: "grp1", jenisKelamin: "P" },
    { id: "s5", nis: "2201005", nama: "Rian Hidayatullah", kelasId: "kls3", groupId: "grp2", jenisKelamin: "L" },
    { id: "s6", nis: "2201006", nama: "Siti Aisyah Nuraini", kelasId: "kls3", groupId: "grp2", jenisKelamin: "P" },
    { id: "s7", nis: "2201007", nama: "Bayu Setiawan", kelasId: "kls4", groupId: "grp2", jenisKelamin: "L" },
    { id: "s8", nis: "2201008", nama: "Putri Ayu Wulandari", kelasId: "kls4", groupId: "grp2", jenisKelamin: "P" },
    { id: "s9", nis: "2201009", nama: "Muhammad Iqbal", kelasId: "kls5", groupId: "grp1", jenisKelamin: "L" },
    { id: "s10", nis: "2201010", nama: "Dinda Kirana", kelasId: "kls5", groupId: "grp2", jenisKelamin: "P" },
    { id: "s11", nis: "2201011", nama: "Fikri Ramadhan", kelasId: "kls1", groupId: "grp1", jenisKelamin: "L" },
    { id: "s12", nis: "2201012", nama: "Anisa Fitriani", kelasId: "kls3", groupId: "grp2", jenisKelamin: "P" },
  ];

  const mentorAssignments = [
    ...["s1", "s2", "s3", "s4", "s11"].map((sid) => ({ id: "ma_" + sid, mentorId: "m1", studentId: sid })),
    ...["s5", "s6", "s7", "s8", "s9", "s10", "s12"].map((sid) => ({ id: "ma_" + sid, mentorId: "m2", studentId: sid })),
  ];

  const users = [
    { id: "u_admin", nama: "Kepala Program Keagamaan", role: "admin", status: "aktif" },
    { id: "u_ahmad", nama: "Ust. Ahmad Fauzi", role: "pengajar", refId: "t1", status: "aktif" },
    { id: "u_budi", nama: "Ust. Budi Santoso", role: "pengajar", refId: "t2", status: "aktif" },
    { id: "u_dewi", nama: "Kak Dewi Lestari", role: "mentor", refId: "m1", status: "aktif" },
    { id: "u_rizky", nama: "Kak Rizky Pratama", role: "mentor", refId: "m2", status: "aktif" },
    ...students.map((s) => ({ id: "u_" + s.id, nama: s.nama, role: "siswa", refId: s.id, status: "aktif" })),
  ];

  // Seed ~14 days of attendance + scores so dashboards look real
  const attendance = [];
  const scores = [];
  const statusCycle = ["HADIR", "HADIR", "HADIR", "SAKIT", "HADIR", "IZIN", "HADIR", "HADIR", "ALPHA", "HADIR"];
  students.forEach((st, sIdx) => {
    for (let d = 13; d >= 0; d--) {
      const status = statusCycle[(sIdx + d) % statusCycle.length];
      attendance.push({
        id: `att_${st.id}_${d}`,
        studentId: st.id,
        tanggal: isoDaysAgo(d),
        status,
        note: "",
        inputBy: st.groupId === "grp1" ? "u_ahmad" : "u_budi",
      });
      // roughly every 2-3 days, a setoran, if not ALPHA
      if (status !== "ALPHA" && d % 3 === sIdx % 3) {
        const surah = surahs[(sIdx + d) % surahs.length];
        const ayatMulai = 1;
        const ayatAkhir = Math.min(surah.ayat, 1 + ((sIdx + d) % surah.ayat));
        const nilai = 72 + ((sIdx * 7 + d * 3) % 24); // 72-95
        const isMentorInput = d % 4 === 0;
        const mentorAssign = mentorAssignments.find((ma) => ma.studentId === st.id);
        scores.push({
          id: `sc_${st.id}_${d}`,
          studentId: st.id,
          tanggal: isoDaysAgo(d),
          surahId: surah.id,
          ayatMulai,
          ayatAkhir,
          nilai,
          penguji: isMentorInput
            ? mentors.find((m) => m.id === mentorAssign?.mentorId)?.nama || "Mentor"
            : teachers.find((t) => t.id === groups.find((g) => g.id === st.groupId)?.teacherId)?.nama || "Pengajar",
          inputBy: isMentorInput ? mentorAssign?.mentorId : (st.groupId === "grp1" ? "u_ahmad" : "u_budi"),
        });
      }
    }
  });

  return { surahs, classes, teachers, mentors, groups, students, mentorAssignments, users, attendance, scores };
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
function LoginScreen({ db, onLogin }) {
  const roleGroups = [
    { role: "admin", label: "Admin", icon: Shield },
    { role: "pengajar", label: "Pengajar Tahfidz", icon: GraduationCap },
    { role: "mentor", label: "Mentor", icon: UserCog },
    { role: "siswa", label: "Siswa", icon: BookOpen },
  ];
  const [active, setActive] = useState("admin");
  const accounts = db.users.filter((u) => u.role === active);

  return (
    <div className="tahfidz-root" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <GlobalStyle />
      <div style={{ width: "100%", maxWidth: 620 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--teal-soft)", color: "var(--teal)", padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
            <BookMarked size={14} /> PROTOTIPE &middot; DEMO
          </div>
          <h1 className="font-display" style={{ fontSize: 34, fontWeight: 700, margin: 0 }}>Monitoring Tahfidz</h1>
          <p style={{ color: "#8A8064", marginTop: 6, fontSize: 14 }}>SMK Telkom Malang &mdash; pilih peran untuk mencoba tampilan masing-masing pengguna</p>
        </div>

        <div className="t-card" style={{ padding: 8, display: "flex", gap: 6, marginBottom: 16 }}>
          {roleGroups.map((r) => (
            <button
              key={r.role}
              onClick={() => setActive(r.role)}
              className="t-btn"
              style={{
                flex: 1, justifyContent: "center",
                background: active === r.role ? "var(--ink)" : "transparent",
                color: active === r.role ? "white" : "var(--ink)",
              }}
            >
              <r.icon size={15} /> {r.label}
            </button>
          ))}
        </div>

        <div className="t-card" style={{ padding: 10 }}>
          {accounts.map((u) => (
            <button
              key={u.id}
              onClick={() => onLogin(u)}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "13px 14px", border: "none", background: "transparent", borderRadius: 10,
                cursor: "pointer", textAlign: "left",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--panel-soft)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{u.nama}</div>
                <div style={{ fontSize: 12, color: "#8A8064" }}>
                  {u.role === "siswa" ? `NIS ${db.students.find((s) => s.id === u.refId)?.nis}` : "Akun demo"}
                </div>
              </div>
              <ChevronRight size={16} color="#8A8064" />
            </button>
          ))}
        </div>
        <p style={{ textAlign: "center", fontSize: 11.5, color: "#B4AA8C", marginTop: 16 }}>
          Data pada prototipe ini bersifat contoh dan tersimpan bersama untuk keperluan uji coba, bukan data siswa sungguhan.
        </p>
      </div>
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
        <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <BookMarked size={16} color="white" />
        </div>
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

  return (
    <div>
      <SectionTitle sub="Ringkasan aktivitas tahfidz seluruh sekolah bulan ini">Dashboard Admin</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        <StatCard icon={Users} label="Total Siswa" value={db.students.length} sub={`${db.groups.length} kelompok tahfidz`} />
        <StatCard icon={GraduationCap} label="Pengajar & Mentor" value={db.teachers.length + db.mentors.length} sub={`${db.teachers.length} pengajar, ${db.mentors.length} mentor`} accent="gold" />
        <StatCard icon={CalendarCheck} label="Kehadiran Bulan Ini" value={`${attendancePct(monthAtt)}%`} sub={`${monthAtt.length} catatan presensi`} />
        <StatCard icon={BookOpen} label="Setoran Bulan Ini" value={monthScores.length} sub={`Rata-rata nilai ${avg(monthScores.map((s) => s.nilai))}`} accent="gold" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 14 }}>
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

  return (
    <div>
      <SectionTitle sub={`${group.nama} · ${members.length} siswa binaan`}>Dashboard Pengajar</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
        <StatCard icon={Users} label="Siswa Diampu" value={members.length} sub={group.nama} />
        <StatCard icon={CalendarCheck} label="Presensi Hari Ini" value={`${todayAtt.filter((a) => a.status === "HADIR").length}/${members.length}`} sub="Hadir hari ini" accent="gold" />
        <StatCard icon={BookOpen} label="Setoran Bulan Ini" value={monthScores.length} sub={`Rata-rata nilai ${avg(monthScores.map((s) => s.nilai))}`} />
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

  return (
    <div>
      <SectionTitle sub={`${students.length} siswa menjadi tanggung jawab Anda`}>Dashboard Mentor</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
        <StatCard icon={Users} label="Siswa Binaan" value={students.length} />
        <StatCard icon={BookOpen} label="Penilaian Bulan Ini" value={monthScores.length} accent="gold" />
        <StatCard icon={TrendingUp} label="Rata-rata Nilai" value={avg(monthScores.map((s) => s.nilai)) || "-"} />
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
function PresensiHarian({ db, persist, user }) {
  const teacher = db.teachers.find((t) => t.id === user.refId);
  const group = db.groups.find((g) => g.teacherId === teacher.id);
  const members = groupMembers(db, group.id);
  const [tanggal, setTanggal] = useState(isoDaysAgo(0));
  const [draft, setDraft] = useState({});
  const [saved, setSaved] = useState(false);

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
    const map = {};
    members.forEach((m) => { map[m.id] = draft[m.id] || "HADIR"; });
    setDraft(map);
    setSaved(false);
  }
  function simpan() {
    const withoutDate = db.attendance.filter((a) => !(a.tanggal === tanggal && members.some((m) => m.id === a.studentId)));
    const newRecords = members.filter((m) => draft[m.id]).map((m) => ({
      id: `att_${m.id}_${tanggal}`,
      studentId: m.id,
      tanggal,
      status: draft[m.id],
      note: "",
      inputBy: user.id,
    }));
    persist({ ...db, attendance: [...withoutDate, ...newRecords] });
    setSaved(true);
  }

  return (
    <div>
      <SectionTitle sub={`${group.nama} · tandai kehadiran lalu simpan`}>Presensi Harian</SectionTitle>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <input type="date" className="t-input" style={{ width: 180 }} value={tanggal} max={isoDaysAgo(0)} onChange={(e) => setTanggal(e.target.value)} />
        <div style={{ display: "flex", gap: 8 }}>
          <button className="t-btn t-btn-ghost" onClick={hadirSemua}>Tandai Hadir Semua</button>
          <button className="t-btn t-btn-primary" onClick={simpan}><CheckCircle2 size={15} /> Simpan Presensi</button>
        </div>
      </div>
      {saved && <div className="t-card-soft" style={{ padding: "8px 14px", marginBottom: 14, fontSize: 13, color: "var(--teal)", fontWeight: 600 }}>Presensi tersimpan.</div>}
      <div className="t-card" style={{ padding: 8 }}>
        <table className="t-table">
          <thead><tr><th>Siswa</th><th>Kelas</th><th style={{ width: 320 }}>Status</th></tr></thead>
          <tbody>
            {members.map((m) => (
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
function PenilaianTahfidz({ db, persist, user }) {
  const isMentor = user.role === "mentor";
  const scopeStudents = isMentor
    ? mentorStudents(db, db.mentors.find((m) => m.id === user.refId).id)
    : groupMembers(db, db.groups.find((g) => g.teacherId === user.refId).id);

  const [studentId, setStudentId] = useState(scopeStudents[0]?.id || "");
  const [surahId, setSurahId] = useState(db.surahs[0].id);
  const [ayatMulai, setAyatMulai] = useState(1);
  const [ayatAkhir, setAyatAkhir] = useState(1);
  const [nilai, setNilai] = useState(80);
  const [tanggal, setTanggal] = useState(isoDaysAgo(0));
  const [msg, setMsg] = useState("");

  const surah = db.surahs.find((s) => s.id === surahId);

  function submit() {
    if (!studentId) return;
    if (ayatAkhir < ayatMulai) { setMsg("Ayat akhir tidak boleh lebih kecil dari ayat mulai."); return; }
    if (ayatAkhir > surah.ayat) { setMsg(`Surat ${surah.nama} hanya memiliki ${surah.ayat} ayat.`); return; }
    const entry = {
      id: "sc_" + Date.now(),
      studentId, tanggal, surahId, ayatMulai: Number(ayatMulai), ayatAkhir: Number(ayatAkhir), nilai: Number(nilai),
      penguji: user.nama, inputBy: user.id,
    };
    persist({ ...db, scores: [entry, ...db.scores] });
    setMsg("Penilaian tersimpan.");
    setTimeout(() => setMsg(""), 2500);
  }

  const history = studentScores(db, studentId).slice(0, 6);

  return (
    <div>
      <SectionTitle sub="Catat hasil simakan/setoran hafalan siswa">{isMentor ? "Input Penilaian" : "Penilaian Tahfidz"}</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="t-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#8A8064" }}>Siswa</label>
              <select className="t-select" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                {scopeStudents.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
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
            <button className="t-btn t-btn-primary" style={{ justifyContent: "center" }} onClick={submit}>
              <CheckCircle2 size={15} /> Simpan Penilaian
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
function MasterData({ db, persist }) {
  const [tab, setTab] = useState("siswa");
  const [form, setForm] = useState({ nama: "", nis: "", kelasId: db.classes[0]?.id, groupId: db.groups[0]?.id, jenisKelamin: "L" });
  const [newClass, setNewClass] = useState("");
  const [newGroup, setNewGroup] = useState({ nama: "", teacherId: db.teachers[0]?.id });
  const [preview, setPreview] = useState([]);
  const [importGroupId, setImportGroupId] = useState(db.groups[0]?.id);
  const [importError, setImportError] = useState("");
  const [importMsg, setImportMsg] = useState("");

  function addStudent() {
    if (!form.nama.trim() || !form.nis.trim()) return;
    const s = { id: "s_" + Date.now(), nis: form.nis, nama: form.nama, kelasId: form.kelasId, groupId: form.groupId, jenisKelamin: form.jenisKelamin };
    const u = { id: "u_" + s.id, nama: s.nama, role: "siswa", refId: s.id, status: "aktif" };
    persist({ ...db, students: [...db.students, s], users: [...db.users, u] });
    setForm({ ...form, nama: "", nis: "" });
  }
  function removeStudent(id) {
    persist({
      ...db,
      students: db.students.filter((s) => s.id !== id),
      users: db.users.filter((u) => u.refId !== id || u.role !== "siswa"),
      attendance: db.attendance.filter((a) => a.studentId !== id),
      scores: db.scores.filter((s) => s.studentId !== id),
      mentorAssignments: db.mentorAssignments.filter((m) => m.studentId !== id),
    });
  }
  function addClass() {
    if (!newClass.trim()) return;
    persist({ ...db, classes: [...db.classes, { id: "kls_" + Date.now(), nama: newClass }] });
    setNewClass("");
  }
  function removeClass(id) {
    persist({ ...db, classes: db.classes.filter((c) => c.id !== id) });
  }
  function addGroup() {
    if (!newGroup.nama.trim()) return;
    persist({ ...db, groups: [...db.groups, { id: "grp_" + Date.now(), nama: newGroup.nama, teacherId: newGroup.teacherId }] });
    setNewGroup({ ...newGroup, nama: "" });
  }
  function removeGroup(id) {
    persist({ ...db, groups: db.groups.filter((g) => g.id !== id) });
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

  function commitImport() {
    const newClasses = [...db.classes];
    const newStudents = [];
    const newUsers = [];
    preview.forEach((row, i) => {
      let kelasObj = row.kelas ? newClasses.find((c) => c.nama.toLowerCase() === row.kelas.toLowerCase()) : null;
      if (!kelasObj && row.kelas) {
        kelasObj = { id: `kls_imp_${Date.now()}_${i}`, nama: row.kelas };
        newClasses.push(kelasObj);
      }
      const id = `s_imp_${Date.now()}_${i}`;
      const nis = row.nis || `IMP${String(Date.now()).slice(-6)}${i}`;
      const student = {
        id, nis, nama: row.nama,
        kelasId: kelasObj ? kelasObj.id : (db.classes[0]?.id || ""),
        groupId: importGroupId || db.groups[0]?.id,
        jenisKelamin: row.jenisKelamin || "",
      };
      newStudents.push(student);
      newUsers.push({ id: "u_" + id, nama: student.nama, role: "siswa", refId: id, status: "aktif" });
    });
    persist({ ...db, classes: newClasses, students: [...db.students, ...newStudents], users: [...db.users, ...newUsers] });
    setImportMsg(`${newStudents.length} siswa berhasil diimpor.`);
    setPreview([]);
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
                <button className="t-btn t-btn-primary" style={{ justifyContent: "center" }} onClick={addStudent}><Plus size={14} /> Tambah</button>
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
                    <button className="t-btn t-btn-primary" onClick={commitImport}><CheckCircle2 size={14} /> Import {preview.length} Siswa</button>
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
              <button className="t-btn t-btn-primary" style={{ justifyContent: "center" }} onClick={addClass}><Plus size={14} /> Tambah</button>
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
              <button className="t-btn t-btn-primary" style={{ justifyContent: "center" }} onClick={addGroup}><Plus size={14} /> Tambah</button>
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
function ManajemenUser({ db, persist }) {
  function toggle(id) {
    persist({ ...db, users: db.users.map((u) => u.id === id ? { ...u, status: u.status === "aktif" ? "nonaktif" : "aktif" } : u) });
  }
  const roleColor = { admin: "var(--red)", pengajar: "var(--teal)", mentor: "var(--blue)", siswa: "#8A8064" };
  return (
    <div>
      <SectionTitle sub="Aktifkan atau nonaktifkan akses akun pengguna">Manajemen User</SectionTitle>
      <div className="t-card" style={{ padding: 8 }}>
        <table className="t-table">
          <thead><tr><th>Nama</th><th>Role</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {db.users.map((u) => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600 }}>{u.nama}</td>
                <td><span className="t-tag" style={{ background: roleColor[u.role] + "1A", color: roleColor[u.role] }}>{ROLE_LABEL[u.role]}</span></td>
                <td>
                  <span className="t-tag" style={{ background: u.status === "aktif" ? "var(--teal-soft)" : "var(--red-soft)", color: u.status === "aktif" ? "var(--teal)" : "var(--red)" }}>
                    {u.status === "aktif" ? "Aktif" : "Nonaktif"}
                  </span>
                </td>
                <td>
                  {u.role !== "admin" && (
                    <button className="t-btn t-btn-ghost" style={{ padding: "5px 10px" }} onClick={() => toggle(u.id)}>
                      {u.status === "aktif" ? "Nonaktifkan" : "Aktifkan"}
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
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [view, setView] = useState("dashboard");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (raw) {
        setDb(JSON.parse(raw));
      } else {
        const seed = buildSeed();
        setDb(seed);
        localStorage.setItem(DB_KEY, JSON.stringify(seed));
      }
    } catch (e) {
      setDb(buildSeed());
    }
    setLoading(false);
  }, []);

  function persist(newDb) {
    setDb(newDb);
    try { localStorage.setItem(DB_KEY, JSON.stringify(newDb)); } catch (e) { /* ignore */ }
  }

  function handleLogin(u) {
    setUser(u);
    setView("dashboard");
  }
  function handleLogout() {
    setUser(null);
  }

  if (loading || !db) {
    return (
      <div className="tahfidz-root" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <GlobalStyle />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, color: "#8A8064" }}>
          <Loader2 className="animate-spin" size={26} />
          <div style={{ fontSize: 13 }}>Menyiapkan data...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen db={db} onLogin={handleLogin} />;
  }

  let content = null;
  if (view === "dashboard") {
    if (user.role === "admin") content = <DashboardAdmin db={db} />;
    if (user.role === "pengajar") content = <DashboardPengajar db={db} user={user} />;
    if (user.role === "mentor") content = <DashboardMentor db={db} user={user} />;
    if (user.role === "siswa") content = <DashboardSiswa db={db} user={user} />;
  } else if (view === "presensi") {
    content = user.role === "pengajar" ? <PresensiHarian db={db} persist={persist} user={user} /> : <PresensiSiswa db={db} user={user} />;
  } else if (view === "penilaian") {
    content = <PenilaianTahfidz db={db} persist={persist} user={user} />;
  } else if (view === "rekap") {
    content = <RekapView db={db} user={user} />;
  } else if (view === "master") {
    content = <MasterData db={db} persist={persist} />;
  } else if (view === "userman") {
    content = <ManajemenUser db={db} persist={persist} />;
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

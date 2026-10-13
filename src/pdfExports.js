import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { PIC_TAHFIDZ, longDateID, safeFilename, saveBlob } from "./reportTools.js";

// Teks tetap dapat dipilih; baris panjang dan tabel berpindah halaman otomatis.
async function writer(title, subtitle) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.12, 0.22, 0.20), muted = rgb(0.38, 0.42, 0.40);
  let page, y;
  const clean = (value) => Array.from(String(value ?? "-").replace(/[\r\n\t]+/g, " ")).map((ch) => {
    try { font.encodeText(ch); return ch; } catch { return "?"; }
  }).join("");
  function text(value, x, at, size = 10, heavy = false) {
    page.drawText(clean(value), { x, y: at, size, font: heavy ? bold : font, color: ink });
  }
  function newPage() {
    page = pdf.addPage([595.28, 841.89]); y = 793;
    text("SMK TELKOM MALANG", 42, y, 11, true);
    y -= 25; text(title, 42, y, 18, true);
    y -= 19; text(subtitle, 42, y, 9);
    y -= 15; page.drawLine({start:{x:42,y},end:{x:553,y},thickness:1,color:ink}); y -= 24;
  }
  function ensure(height) { if (y - height < 52) newPage(); }
  function wrap(value, width, size = 10) {
    const lines = []; let line = "";
    for (const word of clean(value).split(" ")) {
      if (font.widthOfTextAtSize(`${line} ${word}`.trim(), size) <= width) { line = `${line} ${word}`.trim(); continue; }
      if (line) lines.push(line); line = "";
      for (const char of word) {
        if (font.widthOfTextAtSize(line + char, size) > width && line) { lines.push(line); line = ""; }
        line += char;
      }
    }
    lines.push(line || "-"); return lines;
  }
  function section(value) { ensure(42); y -= 9; text(value, 42, y, 12, true); y -= 20; }
  function field(label, value) {
    const lines = wrap(value || "-", 365);
    lines.forEach((line, index) => { ensure(16); if (!index) text(label, 42, y, 10, true); text(line, 183, y); y -= 15; });
    y -= 4;
  }
  function table(headers, widths, rows) {
    const row = (values, heavy = false) => {
      const cells = values.map((v, i) => wrap(v, widths[i] - 12, 8.5));
      const count = Math.max(...cells.map((c) => c.length));
      // Pindahkan seluruh baris bila masih dapat muat dalam satu halaman.
      // Baris yang lebih tinggi dari halaman tetap berlanjut dengan identitas.
      if (!heavy && count * 12 + 15 <= 680 && y - (count * 12 + 15) < 68) { newPage(); header(); }
      let continuationStart = null;
      for (let n = 0; n < count; n++) {
        if (y < 68) { newPage(); if (!heavy) { header(); continuationStart = n; } }
        let x = 42;
        cells.forEach((c, i) => {
          const value = i === 0 && continuationStart !== null ? c[n - continuationStart] : c[n];
          if (value) text(value, x + 5, y, 8.5, heavy);
          x += widths[i];
        }); y -= 12;
      }
      y -= 7; page.drawLine({start:{x:42,y:y+4},end:{x:553,y:y+4},thickness:0.35,color:rgb(0.82,0.85,0.83)});
      y -= 8;
    };
    const header = () => row(headers, true);
    ensure(48); header();
    if (!rows.length) row(["Belum ada data", ...headers.slice(1).map(() => "")]);
    rows.forEach((values) => row(values)); y -= 10;
  }
  newPage();
  return {
    pdf, text, wrap, field, section, table, ensure,
    get page() { return page; }, get y() { return y; }, set y(value) { y = value; },
    async finish() {
      const pages = pdf.getPages();
      pages.forEach((p, i) => p.drawText(`${i + 1} / ${pages.length}`, { x: 510, y: 30, font, size: 8, color: muted }));
      return pdf.save();
    },
  };
}

export async function buildTeacherPdf(teacher, db, photoJpeg = null) {
  const w = await writer("PROFIL PENGAJAR TAHFIDZ", `PIC Tahfidz: ${PIC_TAHFIDZ}`);
  const top = w.y;
  const names = w.wrap(teacher.nama, 380, 15);
  names.forEach((line, i) => w.text(line, 42, top - i * 19, 15, true));
  // Ukuran fisik pasfoto 3 x 4 cm.
  if (photoJpeg) {
    const image = await w.pdf.embedJpg(photoJpeg);
    w.page.drawImage(image, {x:468.24,y:top-113.39,width:85.04,height:113.39});
  } else {
    w.page.drawRectangle({x:468.24,y:top-113.39,width:85.04,height:113.39,borderWidth:0.5,borderColor:rgb(0.7,0.7,0.7)});
    w.text("Belum ada foto", 478, top-56, 8);
  }
  w.y = top - Math.max(135, names.length * 19 + 15);
  w.section("Data pribadi dan kontak");
  const fields = [
    ["Nama lengkap", teacher.nama], ["Nama panggilan", teacher.namaPanggilan], ["NIK", teacher.nik],
    ["Tempat lahir", teacher.tempatLahir], ["Tanggal lahir", teacher.tanggalLahir], ["Agama", teacher.agama],
    ["Status pernikahan", teacher.statusPernikahan], ["No. HP", teacher.noHp],
    ["Alamat", teacher.alamat], ["Kota", teacher.kota], ["Provinsi", teacher.provinsi],
    ["Pendidikan terakhir", teacher.pendidikanTerakhir],
    ["Kelas diampu", db.classes.filter((c) => c.teacherId === teacher.id).map((c) => c.nama).join(", ")],
  ];
  fields.forEach(([label, value]) => w.field(label, value));
  w.section("Riwayat pendidikan");
  w.table(["Jenjang", "Institusi", "Jurusan", "Tahun"], [65,220,170,56], (db.riwayatPendidikan || []).filter((r) => r.teacherId === teacher.id).map((r) => [r.jenjang,r.institusi,r.jurusan,r.tahunLulus]));
  w.section("Sertifikasi dan pelatihan");
  w.table(["Sertifikasi", "Penyelenggara", "Tahun"], [250,205,56], db.certifications.filter((c) => c.teacherId === teacher.id).map((c) => [c.nama,c.penyelenggara,c.tahun]));
  return w.finish();
}

export async function downloadTeacherPdf(teacher, db, photoJpeg) {
  saveBlob(await buildTeacherPdf(teacher, db, photoJpeg), `Profil_${safeFilename(teacher.nama)}.pdf`, "application/pdf");
}

export async function buildRecapPdf(rows, label) {
  const w = await writer("REKAP TAHFIDZ", label);
  w.field("Jumlah setoran", String(rows.length));
  w.table(["Siswa / Kelas", "Tanggal", "Surat / Ayat", "Nilai", "Penguji"], [145,65,135,40,126], rows.map((r) => [
    `${r.Siswa} / ${r.Kelas}`, r.Tanggal, `${r.Surat} / ${r.Ayat}`, r.Nilai, r.Penguji,
  ]));
  return w.finish();
}

export async function downloadRecapPdf(rows, label) {
  saveBlob(await buildRecapPdf(rows, label), `Rekap_Tahfidz_${safeFilename(label)}.pdf`, "application/pdf");
}

export async function buildStudentRecapPdf(rows, { periodLabel, classLabel, approvalDate }) {
  const w = await writer("REKAP KELAS PER SISWA", "SAQUIN — Sahabat Quran Indonesia");
  w.field("Kelas", classLabel);
  w.field("Bulan", periodLabel);
  w.field("Tanggal pengesahan", approvalDate ? longDateID(approvalDate) : "-");
  w.table(["No / Nama siswa", "Rekap kehadiran", "Rekap setoran"], [155, 105, 251], rows.map((row, index) => [
    `${index + 1}. ${row.nama}\nNIS: ${row.nis} / ${row.kelas}`,
    `Hadir: ${row.counts.HADIR}; Sakit: ${row.counts.SAKIT}; Izin: ${row.counts.IZIN}; Alpha: ${row.counts.ALPHA}`,
    `${row.setoranCount} setoran; ${row.totalAyat} ayat; rata-rata nilai: ${row.averageScore ?? "-"}. ${row.setoranSummary}`,
  ]));
  w.ensure(110);
  w.y -= 12;
  w.text(approvalDate ? `Malang, ${longDateID(approvalDate)}` : "Malang, -", 340, w.y, 10);
  w.y -= 18;
  w.text("PIC Tahfidz", 340, w.y, 10);
  w.y -= 55;
  w.text(PIC_TAHFIDZ, 340, w.y, 10, true);
  return w.finish();
}

export async function downloadStudentRecapPdf(rows, options) {
  saveBlob(await buildStudentRecapPdf(rows, options), `Rekap_Kelas_${safeFilename(options.classLabel)}_${safeFilename(options.periodLabel)}.pdf`, "application/pdf");
}

export async function buildJournalPdf(rows, { periodLabel, classLabel, teacherLabel }) {
  const w = await writer("JURNAL MENGAJAR", "SAQUIN — Sahabat Quran Indonesia");
  w.field("Bulan", periodLabel);
  w.field("Kelas", classLabel);
  w.field("Pengajar", teacherLabel);
  w.field("Jumlah jurnal", String(rows.length));
  w.table(["No / Tanggal", "Kelas / Pengajar", "Materi / Kegiatan", "Hasil / Catatan"], [65, 110, 190, 146], rows.map((row) => [
    `${row.No}. ${row.Tanggal}`,
    `${row.Kelas} / ${row.Pengajar}`,
    `Materi: ${row.Materi}. Kegiatan: ${row["Kegiatan pembelajaran"]}`,
    `Hasil: ${row["Hasil/evaluasi"] || "-"}. Catatan: ${row["Catatan/tindak lanjut"] || "-"}`,
  ]));
  return w.finish();
}

export async function downloadJournalPdf(rows, options) {
  saveBlob(await buildJournalPdf(rows, options), `Jurnal_Mengajar_${safeFilename(options.classLabel)}_${safeFilename(options.periodLabel)}.pdf`, "application/pdf");
}

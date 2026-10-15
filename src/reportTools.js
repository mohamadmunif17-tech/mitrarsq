export const PIC_TAHFIDZ = "Mohamad Munif, M.Pd.";

export function defaultReportDate(month) {
  const [year, mon] = month.split("-").map(Number);
  const last = new Date(year, mon, 0).getDate();
  return `${month}-${String(last).padStart(2, "0")}`;
}

export function longDateID(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export function canDeleteScore(user, score, db) {
  if (user.status !== "aktif") return false;
  if (db.academicYear && db.academicYear.status !== "active") return false;
  if (user.role === "admin") return true;
  if (score.inputBy !== user.id) return false;
  if (user.role === "mentor") return db.mentorAssignments.some((a) => a.mentorId === user.refId && a.studentId === score.studentId);
  if (user.role !== "pengajar") return false;
  return db.classes.some((c) => c.id === score.classId && c.teacherId === user.refId);
}

export function saveBlob(bytes, filename, type) {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function safeFilename(name) {
  return String(name || "dokumen").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 90);
}

// Pasfoto dipotong di tengah dengan rasio 3:4, tanpa meregangkan gambar.
export async function photo3x4(url) {
  if (!url) return null;
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { img.src = ""; reject(new Error("Foto terlalu lama dimuat. Coba lagi.")); }, 15000);
    img.onload = () => { clearTimeout(timer); resolve(); };
    img.onerror = () => { clearTimeout(timer); reject(new Error("Foto tidak dapat dimuat. Periksa akses foto sebelum mengunduh PDF.")); };
    img.src = url;
  });
  const canvas = document.createElement("canvas");
  canvas.width = 450; canvas.height = 600;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "white"; ctx.fillRect(0, 0, 450, 600);
  const scale = Math.max(450 / img.naturalWidth, 600 / img.naturalHeight);
  ctx.drawImage(img, (450 - img.naturalWidth * scale) / 2, (600 - img.naturalHeight * scale) / 2, img.naturalWidth * scale, img.naturalHeight * scale);
  return canvas.toDataURL("image/jpeg", 0.92);
}

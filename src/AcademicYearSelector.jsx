import React from "react";
import "./academicYear.css";

const statusLabel = { draft: "Persiapan", active: "Aktif", archived: "Arsip" };
export default function AcademicYearSelector({ years = [], value, onChange, disabled = false }) {
  const ordered = [...years].sort((a, b) => String(b.startsOn).localeCompare(String(a.startsOn)));
  return <label className="ay-selector"><span>Tahun pelajaran</span>
    <select value={value || ""} disabled={disabled || !ordered.length} onChange={(event) => onChange?.(event.target.value)}>
      {!value && <option value="">Pilih tahun pelajaran</option>}
      {ordered.map((year) => <option key={year.id} value={year.id}>{year.nama} · {statusLabel[year.status] || year.status}</option>)}
    </select>
  </label>;
}

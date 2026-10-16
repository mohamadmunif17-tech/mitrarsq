import React from "react";
import { CalendarDays, Loader2 } from "lucide-react";
import "./academicYear.css";

const statusLabel = { draft: "Persiapan", active: "Aktif", archived: "Arsip" };
export default function AcademicYearSelector({ years = [], value, onChange, disabled = false, compact = false, loading = false }) {
  const ordered = [...years].sort((a, b) => String(b.startsOn).localeCompare(String(a.startsOn)));
  const selected = years.find((year) => year.id === value);
  return <label className={`ay-selector${compact ? " ay-selector-compact" : ""}`}>
    <span className={compact ? "ay-selector-caption" : undefined}>
      {compact && <CalendarDays size={12} aria-hidden="true" />}
      Tahun pelajaran
      {compact && selected && <small className={`ay-selector-state ay-selector-state-${selected.status}`}>{statusLabel[selected.status] || selected.status}</small>}
      {compact && loading && <span className="ay-selector-loading" role="status"><Loader2 size={12} className="animate-spin" aria-hidden="true" /><span className="ay-sr-only">Memuat ringkasan tahun pelajaran</span></span>}
    </span>
    <select value={value || ""} disabled={disabled || !ordered.length} onChange={(event) => onChange?.(event.target.value)}>
      {!value && <option value="">Pilih tahun pelajaran</option>}
      {ordered.map((year) => <option key={year.id} value={year.id}>{year.nama}{!compact && ` · ${statusLabel[year.status] || year.status}`}</option>)}
    </select>
  </label>;
}

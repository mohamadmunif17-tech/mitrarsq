import React from "react";
import { CalendarDays, Check, Loader2 } from "lucide-react";
import "./academicYear.css";

const statusLabel = { draft: "Persiapan", active: "Aktif", archived: "Arsip" };
export default function AcademicYearSelector({ years = [], value, onChange, disabled = false, compact = false, loading = false }) {
  const ordered = [...years].sort((a, b) => String(b.startsOn).localeCompare(String(a.startsOn)));
  const selected = years.find((year) => year.id === value);
  const picker = <select value={value || ""} disabled={disabled || !ordered.length} onChange={(event) => onChange?.(event.target.value)}>
      {!value && <option value="">Pilih tahun pelajaran</option>}
      {ordered.map((year) => <option key={year.id} value={year.id}>{year.nama}{!compact && ` · ${statusLabel[year.status] || year.status}`}</option>)}
    </select>;
  if (!compact) return <label className="ay-selector"><span>Tahun pelajaran</span>{picker}</label>;
  return <div className="ay-header-year">
    <label className="ay-selector ay-selector-compact">
      <span className="ay-selector-caption"><CalendarDays size={13} aria-hidden="true" />Tahun pelajaran</span>
      {picker}
    </label>
    {selected && <span className={`ay-selector-state ay-selector-state-${selected.status}`} title={`Status tahun pelajaran: ${statusLabel[selected.status] || selected.status}`}>
      {selected.status === "active" && <Check size={12} aria-hidden="true" />}{statusLabel[selected.status] || selected.status}
    </span>}
    {loading && <span className="ay-selector-loading" role="status"><Loader2 size={12} className="animate-spin" aria-hidden="true" /><span className="ay-sr-only">Memuat ringkasan tahun pelajaran</span></span>}
  </div>;
}

// Snapshot bulan mengganti data dalam rentangnya, termasuk catatan yang sudah
// dihapus. Snapshot startup mempertahankan bulan yang baru dimuat terpisah.
export function replaceActivityRange(previous, incoming, { fromDate, toDate = null, preserveMonths = [] }) {
  const protectedMonths = new Set(preserveMonths);
  const inRange = (row) => (!fromDate || row.tanggal >= fromDate) && (!toDate || row.tanggal <= toDate);
  const protectedRow = (row) => protectedMonths.has(String(row.tanggal).slice(0, 7));
  const accepted = incoming.filter((row) => inRange(row) && !protectedRow(row));
  const incomingIds = new Set(accepted.map((row) => row.id));
  return [
    ...previous.filter((row) => (!inRange(row) || protectedRow(row)) && !incomingIds.has(row.id)),
    ...accepted,
  ];
}

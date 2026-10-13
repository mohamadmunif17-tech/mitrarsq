// Use the named PIC or the school's designated program-head account, never an arbitrary admin.
export function resolvePicSignature(profiles = []) {
  const admins = profiles.filter(p => p.role === "admin" && p.status === "aktif" && p.signatureUrl);
  const normalize = value => String(value || "").trim().toLocaleLowerCase("id").replace(/\s+/g," ");
  const named = admins.filter(p => /^mohamad munif(?:\b|,)/.test(normalize(p.nama)));
  if (named.length === 1) return named[0].signatureUrl;
  if (named.length > 1) return null;
  const programHead = admins.filter(p => normalize(p.nama) === "kepala program keagamaan");
  return programHead.length === 1 ? programHead[0].signatureUrl : null;
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

export async function handleRequest(req: Request) {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return reply({ error: "Gunakan POST." }, 405);
  const token = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return reply({ error: "Silakan login kembali." }, 401);
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return reply({ error: "Konfigurasi server belum lengkap." }, 500);
    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    // JWT diverifikasi oleh Auth; role dibaca dari database, bukan body/metadata pengguna.
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return reply({ error: "Sesi tidak valid." }, 401);
    const { data: caller, error: callerError } = await admin.from("profiles").select("role,status").eq("id", user.id).single();
    if (callerError || caller?.role !== "admin" || caller?.status !== "aktif") {
      return reply({ error: "Hanya admin aktif yang boleh mereset password." }, 403);
    }
    let body;
    try { body = await req.json(); } catch { return reply({ error: "Data permintaan tidak valid." }, 400); }
    const { userId, newPassword } = body || {};
    if (typeof userId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      return reply({ error: "ID akun tidak valid." }, 400);
    }
    if (typeof newPassword !== "string" || newPassword.length < 12 || newPassword.length > 128) {
      return reply({ error: "Password harus 12–128 karakter." }, 400);
    }
    const { data: target, error: targetError } = await admin.from("profiles").select("id").eq("id", userId).single();
    if (targetError || !target) return reply({ error: "Profil akun tidak ditemukan." }, 404);
    const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
    if (error) return reply({ error: error.message }, 400);
    // Jangan mencatat atau mengembalikan password.
    return reply({ success: true });
  } catch {
    return reply({ error: "Reset password gagal. Coba kembali atau periksa konfigurasi fungsi." }, 500);
  }
}

Deno.serve(handleRequest);

// Edge Function: create-user
// Dipanggil oleh Admin dari halaman Manajemen User untuk membuat akun baru
// (Pengajar/Mentor/Admin) secara aman. Kunci rahasia (service role) hanya
// hidup di sini, tidak pernah dikirim ke browser.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Tidak ada sesi login." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    // Klien atas nama pemanggil, untuk memverifikasi siapa dia
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !user) return jsonResponse({ error: "Sesi tidak valid, silakan login ulang." }, 401);

    // Klien admin (service role) — hanya dipakai di server ini
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerProfile, error: profErr } = await adminClient
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .single();

    if (profErr || !callerProfile || callerProfile.role !== "admin" || callerProfile.status !== "aktif") {
      return jsonResponse({ error: "Hanya Admin aktif yang boleh membuat akun baru." }, 403);
    }

    const body = await req.json();
    const { email, password, nama, role } = body;

    if (!email || !password || !nama || !role) {
      return jsonResponse({ error: "Nama, email, password, dan role wajib diisi." }, 400);
    }
    if (!["admin", "pengajar", "mentor"].includes(role)) {
      return jsonResponse({ error: "Role tidak valid." }, 400);
    }
    if (String(password).length < 6) {
      return jsonResponse({ error: "Password minimal 6 karakter." }, 400);
    }

    // Buat akun login
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createErr) return jsonResponse({ error: createErr.message }, 400);

    // Buat data profil pengajar/mentor terkait, jika perlu
    let refId = null;
    if (role === "pengajar") {
      const { data: t, error: tErr } = await adminClient.from("teachers").insert({ nama }).select().single();
      if (tErr) {
        await adminClient.auth.admin.deleteUser(created.user.id);
        return jsonResponse({ error: "Gagal membuat data pengajar: " + tErr.message }, 400);
      }
      refId = t.id;
    } else if (role === "mentor") {
      const { data: m, error: mErr } = await adminClient.from("mentors").insert({ nama }).select().single();
      if (mErr) {
        await adminClient.auth.admin.deleteUser(created.user.id);
        return jsonResponse({ error: "Gagal membuat data mentor: " + mErr.message }, 400);
      }
      refId = m.id;
    }

    // Hubungkan akun ke profil/peran
    const { error: insertErr } = await adminClient.from("profiles").insert({
      id: created.user.id,
      nama,
      role,
      ref_id: refId,
      status: "aktif",
    });
    if (insertErr) {
      await adminClient.auth.admin.deleteUser(created.user.id);
      return jsonResponse({ error: "Gagal menyimpan profil: " + insertErr.message }, 400);
    }

    return jsonResponse({ success: true, userId: created.user.id });
  } catch (e) {
    return jsonResponse({ error: e.message }, 500);
  }
});

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY belum diatur. " +
    "Tambahkan file .env (lihat .env.example) atau atur Environment Variables di Vercel."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const SUPABASE_URL = supabaseUrl;

import { createClient } from "@supabase/supabase-js";

// Vite only exposes env vars prefixed VITE_ to browser code — see .env.example for the full
// list and server/db.js's future Supabase equivalent for the non-prefixed server-side copies.
// The anon/publishable key is safe to ship to the browser: it has no special privileges by
// itself, access is enforced server-side by the RLS policies in supabase/schema.sql.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — set them in .env (see .env.example)."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

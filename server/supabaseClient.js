import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing SUPABASE_URL / SUPABASE_ANON_KEY in .env — see .env.example.");
}

// One client per request, carrying that request's own caller in the Authorization header.
// PostgREST forwards this straight through to Postgres, so every RLS policy and every
// SECURITY DEFINER function's auth.uid() (see supabase/functions.sql) sees exactly that user —
// never a shared/admin identity. No service_role key is used anywhere in the running app.
export function supabaseForToken(accessToken) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Rejects any request without a valid Supabase login before it reaches a route handler — no
// endpoint under /api is reachable while logged out (RLS would block the data anyway, but this
// gives a clean 401 instead of routes half-working against an empty/error result).
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: "not authenticated" });

  const supabase = supabaseForToken(token);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return res.status(401).json({ error: "not authenticated" });

  req.supabase = supabase;
  req.userId = data.user.id;
  next();
}

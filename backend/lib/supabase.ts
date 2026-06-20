// ============================================================
// SchemeSathi — Supabase Client (lib/supabase.ts)
// Singleton clients for public (anon) and admin (service role)
// usage. Safe for both server components and API routes.
// ============================================================

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ---- Environment validation --------------------------------

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.SUPABASE_URL;

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_ANON_KEY;

const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "[SchemeSathi] Missing Supabase URL. Set NEXT_PUBLIC_SUPABASE_URL in .env"
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    "[SchemeSathi] Missing Supabase Anon Key. Set NEXT_PUBLIC_SUPABASE_ANON_KEY in .env"
  );
}

// ---- Singleton — Public (anon) client ----------------------

let _supabase: SupabaseClient | null = null;

/**
 * Public anon client.
 * Respects Row Level Security. Safe for server and API routes.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _supabase;
}

// ---- Singleton — Admin (service role) client ---------------

let _supabaseAdmin: SupabaseClient | null = null;

/**
 * Admin service-role client.
 * ⚠️ Bypasses RLS — use ONLY in server-side API routes.
 * Never expose this key to the browser.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseServiceRoleKey) {
    throw new Error(
      "[SchemeSathi] Missing SUPABASE_SERVICE_ROLE_KEY. Required for admin writes."
    );
  }
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(supabaseUrl!, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _supabaseAdmin;
}

/** Default export — public anon client */
const supabase = getSupabaseClient();
export default supabase;

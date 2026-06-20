// ============================================================
// SchemeSathi — Supabase Client (Singleton)
// Reusable across server components, API routes, and SSR.
// ============================================================

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ---- Environment validation --------------------------------

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Missing Supabase URL. Set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL in .env"
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    "Missing Supabase Anon Key. Set NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY in .env"
  );
}

// ---- Singleton instances ------------------------------------

/**
 * Public (anon) Supabase client.
 * Safe for use in both client and server contexts.
 * Respects Row Level Security policies.
 */
let _supabase: SupabaseClient | null = null;

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

/**
 * Service-role Supabase client.
 * ⚠️  Bypasses RLS — use ONLY in server-side API routes & cron jobs.
 * Never expose this client or its key to the browser.
 */
let _supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseServiceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Required for admin operations."
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

// ---- Convenience default export -----------------------------

/** Default export — public anon client */
const supabase = getSupabaseClient();
export default supabase;

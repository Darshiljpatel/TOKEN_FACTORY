// ============================================================
// SchemeSathi — Scheme Cache Service
// (services/schemeCacheService.ts)
//
// Provides all Supabase data operations for SchemeSathi:
//   - saveDiscoveredScheme()
//   - saveMultipleSchemes()
//   - getCachedSchemes()
//   - searchCache()
//   - logSearch()
//   - saveReport()
// ============================================================

import { getSupabaseClient, getSupabaseAdmin } from "../lib/supabase";
import type { GovernmentScheme, UserProfile } from "../types";

// ============================================================
// Input types
// ============================================================

/** Scheme insert payload — id and fetched_at are auto-generated */
export type SchemeInsert = Omit<GovernmentScheme, "id" | "fetched_at">;

export interface SaveReportInput {
  profile: UserProfile;
  scheme_count: number;
  total_benefits: number;
}

export interface LogSearchInput {
  profile: UserProfile;
  search_query: string;
}

// ============================================================
// Unified result wrappers
// ============================================================

export interface ServiceResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export interface ServiceListResult<T> {
  success: boolean;
  data: T[];
  count: number;
  error: string | null;
}

// ============================================================
// Pagination options
// ============================================================

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

// ============================================================
// 1. saveDiscoveredScheme()
// Upserts a single scheme. Conflicts on scheme_name are
// treated as updates (re-fetched data wins).
// ============================================================

export async function saveDiscoveredScheme(
  scheme: SchemeInsert
): Promise<ServiceResult<GovernmentScheme>> {
  try {
    const db = getSupabaseAdmin();

    // 1. Check if scheme already exists by scheme_name
    const { data: existing, error: findError } = await db
      .from("scheme_cache")
      .select("id")
      .eq("scheme_name", scheme.scheme_name)
      .maybeSingle();

    if (findError) {
      return { success: false, data: null, error: findError.message };
    }

    let result;
    if (existing) {
      // 2. Update existing scheme
      result = await db
        .from("scheme_cache")
        .update({ ...scheme, fetched_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select()
        .single();
    } else {
      // 3. Insert new scheme
      result = await db
        .from("scheme_cache")
        .insert({ ...scheme, fetched_at: new Date().toISOString() })
        .select()
        .single();
    }

    if (result.error) {
      return { success: false, data: null, error: result.error.message };
    }

    return { success: true, data: result.data as GovernmentScheme, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error in saveDiscoveredScheme";
    return { success: false, data: null, error: message };
  }
}

// ============================================================
// 2. saveMultipleSchemes()
// Batch upserts an array of schemes.
// • Deduplicates within the input batch by scheme_name.
// • Chunks into groups of 500 to stay within Supabase limits.
// ============================================================

export async function saveMultipleSchemes(
  schemes: SchemeInsert[]
): Promise<ServiceListResult<GovernmentScheme>> {
  if (schemes.length === 0) {
    return { success: true, data: [], count: 0, error: null };
  }

  try {
    // Deduplicate by lowercased scheme_name; last entry wins
    const uniqueMap = new Map<string, SchemeInsert>();
    for (const scheme of schemes) {
      uniqueMap.set(scheme.scheme_name.toLowerCase().trim(), scheme);
    }

    const deduped = Array.from(uniqueMap.values());
    const saved: GovernmentScheme[] = [];
    let lastError: string | null = null;

    for (const scheme of deduped) {
      const res = await saveDiscoveredScheme(scheme);
      if (res.success && res.data) {
        saved.push(res.data);
      } else {
        lastError = res.error;
        console.error(
          `[saveMultipleSchemes] Error saving "${scheme.scheme_name}":`,
          res.error
        );
      }
    }

    return {
      success: lastError === null || saved.length > 0,
      data: saved,
      count: saved.length,
      error: lastError,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error in saveMultipleSchemes";
    return { success: false, data: [], count: 0, error: message };
  }
}

// ============================================================
// 3. getCachedSchemes()
// Returns paginated list of all cached schemes, newest first.
// Optional filters: category, state, ministry.
// ============================================================

export interface GetCachedSchemesOptions extends PaginationOptions {
  category?: string;
  state?: string;
  ministry?: string;
}

export async function getCachedSchemes(
  options: GetCachedSchemesOptions = {}
): Promise<ServiceListResult<GovernmentScheme>> {
  try {
    const db = getSupabaseClient();
    const limit = options.limit ?? 100;
    const offset = options.offset ?? 0;

    let query = db
      .from("scheme_cache")
      .select("*", { count: "exact" })
      .order("fetched_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (options.category) {
      query = query.ilike("category", options.category);
    }
    if (options.state) {
      query = query.or(
        `states.cs.{"${options.state}"},states.cs.{"All India"}`
      );
    }
    if (options.ministry) {
      query = query.ilike("ministry", `%${options.ministry}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      return { success: false, data: [], count: 0, error: error.message };
    }

    return {
      success: true,
      data: (data ?? []) as GovernmentScheme[],
      count: count ?? data?.length ?? 0,
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error in getCachedSchemes";
    return { success: false, data: [], count: 0, error: message };
  }
}

// ============================================================
// 4. searchCache()
// Full-text ilike search across scheme_name, description,
// eligibility, and benefits fields.
// ============================================================

export interface SearchCacheOptions extends PaginationOptions {
  state?: string;
}

export async function searchCache(
  query: string,
  options: SearchCacheOptions = {}
): Promise<ServiceListResult<GovernmentScheme>> {
  if (!query || query.trim().length === 0) {
    return getCachedSchemes({ limit: options.limit, offset: options.offset });
  }

  try {
    const db = getSupabaseClient();
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;
    const term = `%${query.trim()}%`;

    let q = db
      .from("scheme_cache")
      .select("*", { count: "exact" })
      .or(
        [
          `scheme_name.ilike.${term}`,
          `description.ilike.${term}`,
          `eligibility.ilike.${term}`,
          `benefits.ilike.${term}`,
          `ministry.ilike.${term}`,
        ].join(",")
      )
      .order("benefit_value", { ascending: false })
      .range(offset, offset + limit - 1);

    if (options.state) {
      q = q.or(
        `states.cs.{"${options.state}"},states.cs.{"All India"}`
      );
    }

    const { data, error, count } = await q;

    if (error) {
      return { success: false, data: [], count: 0, error: error.message };
    }

    return {
      success: true,
      data: (data ?? []) as GovernmentScheme[],
      count: count ?? data?.length ?? 0,
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error in searchCache";
    return { success: false, data: [], count: 0, error: message };
  }
}

// ============================================================
// 5. logSearch()
// Records a user's search query and profile in search_logs.
// Fire-and-forget — non-blocking; errors are logged, not thrown.
// ============================================================

export async function logSearch(
  input: LogSearchInput
): Promise<ServiceResult<null>> {
  try {
    const db = getSupabaseClient();

    const { error } = await db.from("search_logs").insert({
      profile: input.profile,
      search_query: input.search_query.trim(),
    });

    if (error) {
      console.warn("[logSearch] Failed to log search:", error.message);
      return { success: false, data: null, error: error.message };
    }

    return { success: true, data: null, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error in logSearch";
    console.warn("[logSearch]", message);
    return { success: false, data: null, error: message };
  }
}

// ============================================================
// 6. saveReport()
// Persists a generated eligibility report to generated_reports.
// Returns the saved report row including its generated id.
// ============================================================

export interface SavedReport {
  id: string;
  profile: UserProfile;
  scheme_count: number;
  total_benefits: number;
  created_at: string;
}

export async function saveReport(
  input: SaveReportInput
): Promise<ServiceResult<SavedReport>> {
  try {
    const db = getSupabaseClient();

    const { data, error } = await db
      .from("generated_reports")
      .insert({
        profile: input.profile,
        scheme_count: input.scheme_count,
        total_benefits: input.total_benefits,
      })
      .select()
      .single();

    if (error) {
      return { success: false, data: null, error: error.message };
    }

    return { success: true, data: data as SavedReport, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error in saveReport";
    return { success: false, data: null, error: message };
  }
}

// ============================================================
// Convenience: getReportById() and listReports()
// ============================================================

export async function getReportById(
  id: string
): Promise<ServiceResult<SavedReport>> {
  try {
    const db = getSupabaseClient();

    const { data, error } = await db
      .from("generated_reports")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return {
        success: false,
        data: null,
        error: error.code === "PGRST116" ? `Report not found: ${id}` : error.message,
      };
    }

    return { success: true, data: data as SavedReport, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error in getReportById";
    return { success: false, data: null, error: message };
  }
}

export async function listReports(
  options: PaginationOptions = {}
): Promise<ServiceListResult<SavedReport>> {
  try {
    const db = getSupabaseClient();
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;

    const { data, error, count } = await db
      .from("generated_reports")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return { success: false, data: [], count: 0, error: error.message };
    }

    return {
      success: true,
      data: (data ?? []) as SavedReport[],
      count: count ?? data?.length ?? 0,
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error in listReports";
    return { success: false, data: [], count: 0, error: message };
  }
}

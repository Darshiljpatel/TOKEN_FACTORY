// ============================================================
// SchemeSathi — Scheme Cache Service
// CRUD operations on the scheme_cache table via Supabase.
// Handles duplicates using upsert on scheme_name.
// ============================================================

import { getSupabaseClient, getSupabaseAdmin } from "../lib/supabaseClient";
import type { GovernmentScheme } from "../types";

// ---- Types --------------------------------------------------

/** Fields required when saving a scheme (id and fetched_at are auto-generated) */
export type SchemeInsert = Omit<GovernmentScheme, "id" | "fetched_at">;

export interface CacheResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export interface CacheListResult<T> {
  success: boolean;
  data: T[];
  count: number;
  error: string | null;
}

// ============================================================
// Service
// ============================================================

export class SchemeCacheService {
  // ----------------------------------------------------------
  // saveScheme()
  // Upserts a single scheme. If a scheme with the same name
  // already exists, it updates all fields and refreshes
  // fetched_at.
  // ----------------------------------------------------------

  static async saveScheme(scheme: SchemeInsert): Promise<CacheResult<GovernmentScheme>> {
    try {
      const supabase = getSupabaseAdmin();

      const { data, error } = await supabase
        .from("scheme_cache")
        .upsert(
          {
            ...scheme,
            fetched_at: new Date().toISOString(),
          },
          { onConflict: "scheme_name" }
        )
        .select()
        .single();

      if (error) {
        return { success: false, data: null, error: error.message };
      }

      return { success: true, data: data as GovernmentScheme, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error in saveScheme";
      return { success: false, data: null, error: message };
    }
  }

  // ----------------------------------------------------------
  // saveMultipleSchemes()
  // Upserts multiple schemes in a single batch operation.
  // Duplicates (by scheme_name) are updated, new entries
  // are inserted.
  // ----------------------------------------------------------

  static async saveMultipleSchemes(
    schemes: SchemeInsert[]
  ): Promise<CacheListResult<GovernmentScheme>> {
    if (schemes.length === 0) {
      return { success: true, data: [], count: 0, error: null };
    }

    try {
      const supabase = getSupabaseAdmin();
      const now = new Date().toISOString();

      // Deduplicate by scheme_name within the batch itself
      const uniqueMap = new Map<string, SchemeInsert>();
      for (const scheme of schemes) {
        const key = scheme.scheme_name.toLowerCase().trim();
        // Last-write wins for duplicates within the same batch
        uniqueMap.set(key, scheme);
      }

      const deduped = Array.from(uniqueMap.values()).map((s) => ({
        ...s,
        fetched_at: now,
      }));

      // Supabase has a soft limit per request; chunk into batches of 500
      const BATCH_SIZE = 500;
      const allResults: GovernmentScheme[] = [];
      let lastError: string | null = null;

      for (let i = 0; i < deduped.length; i += BATCH_SIZE) {
        const batch = deduped.slice(i, i + BATCH_SIZE);

        const { data, error } = await supabase
          .from("scheme_cache")
          .upsert(batch, { onConflict: "scheme_name" })
          .select();

        if (error) {
          lastError = error.message;
          console.error(
            `Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`,
            error.message
          );
          continue; // Continue with remaining batches
        }

        if (data) {
          allResults.push(...(data as GovernmentScheme[]));
        }
      }

      return {
        success: lastError === null,
        data: allResults,
        count: allResults.length,
        error: lastError,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error in saveMultipleSchemes";
      return { success: false, data: [], count: 0, error: message };
    }
  }

  // ----------------------------------------------------------
  // getSchemeByName()
  // Case-insensitive exact match on scheme_name.
  // ----------------------------------------------------------

  static async getSchemeByName(
    name: string
  ): Promise<CacheResult<GovernmentScheme>> {
    try {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from("scheme_cache")
        .select("*")
        .ilike("scheme_name", name.trim())
        .single();

      if (error) {
        return {
          success: false,
          data: null,
          error: error.code === "PGRST116"
            ? `No scheme found with name: "${name}"`
            : error.message,
        };
      }

      return { success: true, data: data as GovernmentScheme, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error in getSchemeByName";
      return { success: false, data: null, error: message };
    }
  }

  // ----------------------------------------------------------
  // getAllSchemes()
  // Returns all cached schemes with optional pagination.
  // Ordered by fetched_at descending (newest first).
  // ----------------------------------------------------------

  static async getAllSchemes(options?: {
    limit?: number;
    offset?: number;
  }): Promise<CacheListResult<GovernmentScheme>> {
    try {
      const supabase = getSupabaseClient();
      const limit = options?.limit ?? 100;
      const offset = options?.offset ?? 0;

      const { data, error, count } = await supabase
        .from("scheme_cache")
        .select("*", { count: "exact" })
        .order("fetched_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        return { success: false, data: [], count: 0, error: error.message };
      }

      return {
        success: true,
        data: (data ?? []) as GovernmentScheme[],
        count: count ?? (data?.length ?? 0),
        error: null,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error in getAllSchemes";
      return { success: false, data: [], count: 0, error: message };
    }
  }

  // ----------------------------------------------------------
  // getSchemesByCategory()
  // Returns schemes filtered by category.
  // Supports optional state filtering.
  // ----------------------------------------------------------

  static async getSchemesByCategory(
    category: string,
    options?: {
      state?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<CacheListResult<GovernmentScheme>> {
    try {
      const supabase = getSupabaseClient();
      const limit = options?.limit ?? 100;
      const offset = options?.offset ?? 0;

      let query = supabase
        .from("scheme_cache")
        .select("*", { count: "exact" })
        .ilike("category", category.trim())
        .order("benefit_value", { ascending: false })
        .range(offset, offset + limit - 1);

      // Optionally filter by state
      if (options?.state) {
        query = query.or(
          `states.cs.{"${options.state}"},states.cs.{"All India"}`
        );
      }

      const { data, error, count } = await query;

      if (error) {
        return { success: false, data: [], count: 0, error: error.message };
      }

      return {
        success: true,
        data: (data ?? []) as GovernmentScheme[],
        count: count ?? (data?.length ?? 0),
        error: null,
      };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unknown error in getSchemesByCategory";
      return { success: false, data: [], count: 0, error: message };
    }
  }

  // ----------------------------------------------------------
  // searchSchemes()
  // Full-text search across scheme_name, description,
  // and eligibility fields.
  // ----------------------------------------------------------

  static async searchSchemes(
    query: string,
    options?: {
      limit?: number;
    }
  ): Promise<CacheListResult<GovernmentScheme>> {
    try {
      const supabase = getSupabaseClient();
      const limit = options?.limit ?? 50;
      const searchTerm = `%${query.trim()}%`;

      const { data, error } = await supabase
        .from("scheme_cache")
        .select("*")
        .or(
          `scheme_name.ilike.${searchTerm},description.ilike.${searchTerm},eligibility.ilike.${searchTerm}`
        )
        .order("benefit_value", { ascending: false })
        .limit(limit);

      if (error) {
        return { success: false, data: [], count: 0, error: error.message };
      }

      return {
        success: true,
        data: (data ?? []) as GovernmentScheme[],
        count: data?.length ?? 0,
        error: null,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error in searchSchemes";
      return { success: false, data: [], count: 0, error: message };
    }
  }

  // ----------------------------------------------------------
  // deleteScheme()
  // Removes a scheme by ID.
  // ----------------------------------------------------------

  static async deleteScheme(id: string): Promise<CacheResult<null>> {
    try {
      const supabase = getSupabaseAdmin();

      const { error } = await supabase
        .from("scheme_cache")
        .delete()
        .eq("id", id);

      if (error) {
        return { success: false, data: null, error: error.message };
      }

      return { success: true, data: null, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error in deleteScheme";
      return { success: false, data: null, error: message };
    }
  }
}

export default SchemeCacheService;

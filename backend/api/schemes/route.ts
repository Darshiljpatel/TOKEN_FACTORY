// ============================================================
// API Route: GET /api/schemes
// Fetches all cached government schemes from Supabase.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/backend/lib/supabaseClient";
import type { GovernmentScheme } from "@/backend/types";

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(req.url);

    // Optional filters
    const category = searchParams.get("category");
    const state = searchParams.get("state");
    const ministry = searchParams.get("ministry");

    let query = supabase
      .from("scheme_cache")
      .select("*")
      .order("fetched_at", { ascending: false });

    if (category) {
      query = query.eq("category", category);
    }

    if (state) {
      query = query.contains("states", [state]);
    }

    if (ministry) {
      query = query.eq("ministry", ministry);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: (data as GovernmentScheme[]).length,
      schemes: data as GovernmentScheme[],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

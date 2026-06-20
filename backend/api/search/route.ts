// ============================================================
// API Route: POST /api/search
// Logs user search queries and returns matching schemes.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/backend/lib/supabaseClient";
import type { UserProfile, GovernmentScheme } from "@/backend/types";

interface SearchRequestBody {
  profile: UserProfile;
  query: string;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body: SearchRequestBody = await req.json();

    if (!body.profile || !body.query) {
      return NextResponse.json(
        { success: false, error: "Missing 'profile' or 'query' in request body" },
        { status: 400 }
      );
    }

    // 1. Log the search
    const { error: logError } = await supabase.from("search_logs").insert({
      profile: body.profile,
      search_query: body.query,
    });

    if (logError) {
      console.error("Failed to log search:", logError.message);
    }

    // 2. Search schemes by state, category, and text match
    let query = supabase
      .from("scheme_cache")
      .select("*")
      .order("benefit_value", { ascending: false });

    // Filter by user's state
    if (body.profile.state) {
      query = query.or(
        `states.cs.{"${body.profile.state}"},states.cs.{"All India"}`
      );
    }

    // Text search across scheme_name and description
    if (body.query) {
      query = query.or(
        `scheme_name.ilike.%${body.query}%,description.ilike.%${body.query}%`
      );
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

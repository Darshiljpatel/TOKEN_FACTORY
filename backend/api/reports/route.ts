// ============================================================
// API Route: POST /api/reports
// Generates and stores an eligibility report for a user.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/backend/lib/supabaseClient";
import type { UserProfile, GovernmentScheme, GeneratedReport } from "@/backend/types";

interface ReportRequestBody {
  profile: UserProfile;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body: ReportRequestBody = await req.json();

    if (!body.profile) {
      return NextResponse.json(
        { success: false, error: "Missing 'profile' in request body" },
        { status: 400 }
      );
    }

    // 1. Fetch schemes matching user's state
    const { data: schemes, error: fetchError } = await supabase
      .from("scheme_cache")
      .select("*")
      .or(
        `states.cs.{"${body.profile.state}"},states.cs.{"All India"}`
      );

    if (fetchError) {
      return NextResponse.json(
        { success: false, error: fetchError.message },
        { status: 500 }
      );
    }

    const matchedSchemes = schemes as GovernmentScheme[];

    // 2. Calculate total benefits
    const totalBenefits = matchedSchemes.reduce(
      (sum, scheme) => sum + (scheme.benefit_value || 0),
      0
    );

    // 3. Store the generated report
    const { data: report, error: insertError } = await supabase
      .from("generated_reports")
      .insert({
        profile: body.profile,
        scheme_count: matchedSchemes.length,
        total_benefits: totalBenefits,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      report: report as GeneratedReport,
      schemes: matchedSchemes,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// ============================================================
// GET /api/reports?id=<report_id>
// Fetches a previously generated report.
// ============================================================

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      // Return all reports (latest first)
      const { data, error } = await supabase
        .from("generated_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        count: (data as GeneratedReport[]).length,
        reports: data as GeneratedReport[],
      });
    }

    // Fetch a single report by ID
    const { data, error } = await supabase
      .from("generated_reports")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      report: data as GeneratedReport,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

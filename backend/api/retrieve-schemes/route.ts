// ============================================================
// SchemeSathi — Retrieve Schemes API Route
// POST /api/retrieve-schemes
//
// Input:  { profile: UserProfile, options?: RetrievalOptions }
// Output: RetrievalResult + metadata
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  retrieveRelevantSchemes,
  type RetrievalOptions,
} from "@/backend/services/schemeRetrievalService";

// ============================================================
// Request validation schema (Zod)
// ============================================================

const ProfileSchema = z.object({
  age:           z.number({ required_error: "age is required" })
                  .int()
                  .min(0, "age must be ≥ 0")
                  .max(150, "age must be ≤ 150"),

  gender:        z.enum(["Male", "Female", "Transgender", "Other"], {
                   required_error: "gender is required",
                 }),

  state:         z.string({ required_error: "state is required" })
                  .min(2, "state must be at least 2 characters"),

  occupation:    z.enum(
                   [
                     "Student", "Farmer", "Self-Employed", "Salaried",
                     "Business Owner", "Daily Wage Worker", "Unemployed",
                     "Homemaker", "Retired",
                   ],
                   { required_error: "occupation is required" }
                 ),

  income:        z.number({ required_error: "income is required" })
                  .nonnegative("income must be ≥ 0"),

  category:      z.enum(["General", "OBC", "SC", "ST", "EWS", "Minority"], {
                   required_error: "category is required",
                 }),

  education:     z.enum(
                   [
                     "No Formal Education", "Below 10th", "10th Pass",
                     "12th Pass", "Diploma", "Graduate", "Post Graduate",
                     "Doctorate",
                   ],
                   { required_error: "education is required" }
                 ),

  business_type: z.enum(
                   ["Micro", "Small", "Medium", "Large", "Startup", "None"],
                   { required_error: "business_type is required" }
                 ),

  turnover:      z.number().nonnegative().default(0),

  land_holding:  z.number().nonnegative().default(0),
});

const OptionsSchema = z.object({
  limit:           z.number().int().min(1).max(100).default(20),
  minScore:        z.number().min(0).max(100).default(10),
  forceDiscovery:  z.boolean().default(false),
}).optional();

const RequestSchema = z.object({
  profile: ProfileSchema,
  options: OptionsSchema,
});

// ============================================================
// Error response helper
// ============================================================

function errorResponse(
  message: string,
  status: number,
  details?: Record<string, unknown>
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(details ? { details } : {}),
    },
    { status }
  );
}

// ============================================================
// POST handler
// ============================================================

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  // ---- 1. Parse request body -------------------------------
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON in request body", 400);
  }

  // ---- 2. Validate with Zod --------------------------------
  const parsed = RequestSchema.safeParse(body);

  if (!parsed.success) {
    const fieldErrors = parsed.error.issues.map((issue) => ({
      field:   issue.path.join("."),
      message: issue.message,
    }));

    return errorResponse("Profile validation failed", 422, {
      fieldErrors,
    });
  }

  const { profile, options } = parsed.data;
  const retrivalOptions: RetrievalOptions = {
    limit:          options?.limit          ?? 20,
    minScore:       options?.minScore       ?? 10,
    forceDiscovery: options?.forceDiscovery ?? false,
  };

  // ---- 3. Retrieve & rank schemes --------------------------
  try {
    const result = await retrieveRelevantSchemes(profile, retrivalOptions);

    return NextResponse.json(
      {
        success: true,

        // Schemes with relevance scores and score breakdown
        schemes: result.schemes.map((s) => ({
          id:              s.scheme.id,
          scheme_name:     s.scheme.scheme_name,
          category:        s.scheme.category,
          description:     s.scheme.description,
          eligibility:     s.scheme.eligibility,
          benefits:        s.scheme.benefits,
          benefit_value:   s.scheme.benefit_value,
          source_url:      s.scheme.source_url,
          states:          s.scheme.states,
          tags:            s.scheme.tags,
          ministry:        s.scheme.ministry,
          fetched_at:      s.scheme.fetched_at,
          relevanceScore:  s.relevanceScore,
          scoreBreakdown:  s.scoreBreakdown,
        })),

        // Summary metadata
        meta: {
          totalFound:          result.totalFound,
          averageScore:        result.averageScore,
          fromCache:           result.fromCache,
          fromDiscovery:       result.fromDiscovery,
          discoveryTriggered:  result.discoveryTriggered,
          durationMs:          Date.now() - startTime,
        },

        // Echo back validated profile
        profile,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal server error";

    console.error("[POST /api/retrieve-schemes]", message);

    return errorResponse("Failed to retrieve schemes", 500, {
      message,
    });
  }
}

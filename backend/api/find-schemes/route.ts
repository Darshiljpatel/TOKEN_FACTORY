// ============================================================
// SchemeSathi — Main Orchestrator API Route
// POST /api/find-schemes
//
// Full pipeline:
//   User text → Profile extraction → Search query generation
//   → Scheme retrieval → Eligibility check → Benefits analysis
//   → Final JSON response
// ============================================================

import { NextRequest, NextResponse } from "next/server";

// Services
import { ProfileExtractionService } from "@/backend/services/ProfileExtractionService";
import { SearchQueryGenerationService } from "@/backend/services/SearchQueryGenerationService";
import { SchemeRetrievalService } from "@/backend/services/SchemeRetrievalService";
import { EligibilityCheckerService } from "@/backend/services/EligibilityCheckerService";
import { BenefitsAnalysisService } from "@/backend/services/BenefitsAnalysisService";
import { SchemeCacheService } from "@/backend/services/SchemeCacheService";

// Types
import type { UserProfile, GovernmentScheme } from "@/backend/types";
import type { EligibilityVerdict } from "@/backend/services/EligibilityCheckerService";
import type { BenefitsAnalysis } from "@/backend/services/BenefitsAnalysisService";
import type { ScoredScheme } from "@/backend/services/SchemeRetrievalService";

// Supabase (for logging)
import { getSupabaseClient } from "@/backend/lib/supabaseClient";

// ============================================================
// Request / Response types
// ============================================================

interface FindSchemesRequest {
  text: string;
  options?: {
    maxSchemes?: number;
    minRelevanceScore?: number;
    skipBenefitsAnalysis?: boolean;
    useRulesOnly?: boolean;         // Skip AI calls, use rule-based only
  };
}

interface PipelineStep {
  step: string;
  status: "completed" | "failed" | "skipped";
  durationMs: number;
  details?: string;
}

interface FindSchemesResponse {
  success: boolean;

  // User profile extracted from text
  profile: UserProfile;
  profileConfidence: number;
  missingProfileFields: string[];

  // Search queries generated
  searchQueries: string[];

  // Retrieved & scored schemes
  retrievedSchemes: Array<{
    scheme: GovernmentScheme;
    relevanceScore: number;
  }>;

  // Eligibility verdicts
  eligibility: {
    results: EligibilityVerdict[];
    summary: {
      eligible: number;
      possiblyEligible: number;
      notEligible: number;
      totalSchemes: number;
      averageConfidence: number;
    };
  };

  // Benefits analysis
  benefits: BenefitsAnalysis;

  // Pipeline metadata
  pipeline: PipelineStep[];
  totalDurationMs: number;
}

// ============================================================
// Pipeline helpers
// ============================================================

function timer(): () => number {
  const start = Date.now();
  return () => Date.now() - start;
}

// ============================================================
// POST handler
// ============================================================

export async function POST(req: NextRequest) {
  const pipelineStart = Date.now();
  const steps: PipelineStep[] = [];

  try {
    // ---- Parse request body ---------------------------------
    const body: FindSchemesRequest = await req.json();

    if (!body.text || body.text.trim().length < 10) {
      return NextResponse.json(
        {
          success: false,
          error: "Please provide a text description of at least 10 characters describing yourself.",
        },
        { status: 400 }
      );
    }

    const userText = body.text.trim();
    const maxSchemes = body.options?.maxSchemes ?? 20;
    const minScore = body.options?.minRelevanceScore ?? 10;
    const skipBenefits = body.options?.skipBenefitsAnalysis ?? false;
    const rulesOnly = body.options?.useRulesOnly ?? false;

    // ========================================================
    // STEP 1: Profile Extraction
    // ========================================================
    const step1Timer = timer();
    let profile: UserProfile;
    let profileConfidence: number;
    let missingProfileFields: string[];

    const extractionResult = await ProfileExtractionService.extractWithDefaults(userText);

    if (!extractionResult.success) {
      steps.push({
        step: "Profile Extraction",
        status: "failed",
        durationMs: step1Timer(),
        details: extractionResult.error,
      });

      return NextResponse.json(
        {
          success: false,
          error: `Could not extract profile from text: ${extractionResult.error}`,
          pipeline: steps,
        },
        { status: 422 }
      );
    }

    profile = extractionResult.profile;
    profileConfidence = extractionResult.confidence;
    missingProfileFields = extractionResult.missingFields;

    steps.push({
      step: "Profile Extraction",
      status: "completed",
      durationMs: step1Timer(),
      details: `Confidence: ${profileConfidence}%, Missing: ${missingProfileFields.length} fields`,
    });

    // ========================================================
    // STEP 2: Search Query Generation
    // ========================================================
    const step2Timer = timer();
    let searchQueries: string[] = [];

    if (rulesOnly) {
      const fallback = SearchQueryGenerationService.generateFallbackQueries(profile);
      searchQueries = fallback.success ? fallback.queries : [];
      steps.push({
        step: "Search Query Generation",
        status: "completed",
        durationMs: step2Timer(),
        details: `${searchQueries.length} rule-based queries generated`,
      });
    } else {
      const queryResult = await SearchQueryGenerationService.generateCombinedQueries(profile);
      searchQueries = queryResult.success ? queryResult.queries : [];
      steps.push({
        step: "Search Query Generation",
        status: queryResult.success ? "completed" : "failed",
        durationMs: step2Timer(),
        details: `${searchQueries.length} queries generated (AI + rules)`,
      });
    }

    // ========================================================
    // STEP 3: Scheme Retrieval & Ranking
    // ========================================================
    const step3Timer = timer();
    let scoredSchemes: ScoredScheme[] = [];
    let fullSchemes: GovernmentScheme[] = [];

    const retrievalResult = await SchemeRetrievalService.getRelevantSchemes(profile, {
      limit: maxSchemes,
      minScore: minScore,
    });

    scoredSchemes = retrievalResult.schemes;
    fullSchemes = scoredSchemes.map((s) => s.scheme);

    // If cache is empty, also try direct text search from queries
    if (fullSchemes.length === 0 && searchQueries.length > 0) {
      const topQuery = searchQueries[0];
      const searchResult = await SchemeCacheService.searchSchemes(topQuery, {
        limit: maxSchemes,
      });

      if (searchResult.success && searchResult.data.length > 0) {
        fullSchemes = searchResult.data;
        scoredSchemes = fullSchemes.map((scheme) =>
          SchemeRetrievalService.scoreScheme(scheme, profile)
        );
        scoredSchemes.sort((a, b) => b.relevanceScore - a.relevanceScore);
      }
    }

    steps.push({
      step: "Scheme Retrieval",
      status: fullSchemes.length > 0 ? "completed" : "completed",
      durationMs: step3Timer(),
      details: `${fullSchemes.length} schemes retrieved, avg relevance: ${retrievalResult.averageRelevanceScore}%`,
    });

    // ========================================================
    // STEP 4: Eligibility Check
    // ========================================================
    const step4Timer = timer();
    let eligibilityResults: EligibilityVerdict[] = [];
    let eligibilitySummary = {
      eligible: 0,
      possiblyEligible: 0,
      notEligible: 0,
      totalSchemes: 0,
      averageConfidence: 0,
    };

    if (fullSchemes.length > 0) {
      const eligResult = rulesOnly
        ? EligibilityCheckerService.checkWithRules(profile, fullSchemes)
        : await EligibilityCheckerService.checkMultiple(profile, fullSchemes);

      if (eligResult.success) {
        eligibilityResults = eligResult.results;
        eligibilitySummary = eligResult.summary;
      }

      steps.push({
        step: "Eligibility Check",
        status: eligResult.success ? "completed" : "failed",
        durationMs: step4Timer(),
        details: `Eligible: ${eligibilitySummary.eligible}, Possibly: ${eligibilitySummary.possiblyEligible}, Not: ${eligibilitySummary.notEligible}`,
      });
    } else {
      steps.push({
        step: "Eligibility Check",
        status: "skipped",
        durationMs: step4Timer(),
        details: "No schemes to evaluate",
      });
    }

    // ========================================================
    // STEP 5: Benefits Analysis
    // ========================================================
    const step5Timer = timer();
    let benefitsAnalysis: BenefitsAnalysis = {
      total_potential_benefit: 0,
      missed_benefits: 0,
      top_opportunities: [],
      priority_actions: [],
      breakdown: {
        loans: 0,
        subsidies: 0,
        scholarships: 0,
        insurance: 0,
        direct_benefits: 0,
        pensions: 0,
        other: 0,
      },
    };

    if (!skipBenefits && eligibilityResults.length > 0) {
      const analysisResult = rulesOnly
        ? BenefitsAnalysisService.analyzeWithRules(eligibilityResults, fullSchemes)
        : await BenefitsAnalysisService.analyze(profile, eligibilityResults, fullSchemes);

      if (analysisResult.success) {
        benefitsAnalysis = analysisResult.analysis;
      }

      steps.push({
        step: "Benefits Analysis",
        status: analysisResult.success ? "completed" : "failed",
        durationMs: step5Timer(),
        details: `Total: ₹${benefitsAnalysis.total_potential_benefit.toLocaleString("en-IN")}, Missed: ₹${benefitsAnalysis.missed_benefits.toLocaleString("en-IN")}`,
      });
    } else {
      steps.push({
        step: "Benefits Analysis",
        status: skipBenefits ? "skipped" : "skipped",
        durationMs: step5Timer(),
        details: skipBenefits ? "Skipped by user" : "No eligibility results",
      });
    }

    // ========================================================
    // STEP 6: Log search & save report
    // ========================================================
    const step6Timer = timer();

    try {
      const supabase = getSupabaseClient();

      // Log the search
      await supabase.from("search_logs").insert({
        profile: profile,
        search_query: userText,
      });

      // Save generated report
      await supabase.from("generated_reports").insert({
        profile: profile,
        scheme_count: eligibilitySummary.eligible + eligibilitySummary.possiblyEligible,
        total_benefits: benefitsAnalysis.total_potential_benefit,
      });

      steps.push({
        step: "Logging & Report",
        status: "completed",
        durationMs: step6Timer(),
      });
    } catch (logErr) {
      steps.push({
        step: "Logging & Report",
        status: "failed",
        durationMs: step6Timer(),
        details: logErr instanceof Error ? logErr.message : "Logging failed",
      });
      // Non-blocking — don't fail the request
    }

    // ========================================================
    // Build final response
    // ========================================================
    const totalDuration = Date.now() - pipelineStart;

    const response: FindSchemesResponse = {
      success: true,
      profile,
      profileConfidence,
      missingProfileFields,
      searchQueries,
      retrievedSchemes: scoredSchemes.map((s) => ({
        scheme: s.scheme,
        relevanceScore: s.relevanceScore,
      })),
      eligibility: {
        results: eligibilityResults,
        summary: eligibilitySummary,
      },
      benefits: benefitsAnalysis,
      pipeline: steps,
      totalDurationMs: totalDuration,
    };

    return NextResponse.json(response, { status: 200 });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";

    return NextResponse.json(
      {
        success: false,
        error: message,
        pipeline: steps,
        totalDurationMs: Date.now() - pipelineStart,
      },
      { status: 500 }
    );
  }
}

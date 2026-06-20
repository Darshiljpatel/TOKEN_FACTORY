// ============================================================
// SchemeSathi — Scheme Retrieval Service
// Searches, scores, and ranks cached schemes against a
// UserProfile for maximum relevance.
// ============================================================

import { getSupabaseClient } from "../lib/supabaseClient";
import type {
  UserProfile,
  GovernmentScheme,
  OccupationType,
  SocialCategory,
} from "../types";

// ============================================================
// Result types
// ============================================================

export interface ScoredScheme {
  scheme: GovernmentScheme;
  relevanceScore: number;   // 0–100
  matchBreakdown: MatchBreakdown;
}

export interface MatchBreakdown {
  occupationScore: number;  // 0–30
  categoryScore: number;    // 0–20
  stateScore: number;       // 0–25
  tagsScore: number;        // 0–15
  incomeScore: number;      // 0–10
}

export interface RetrievalResult {
  schemes: ScoredScheme[];
  averageRelevanceScore: number;
  totalMatched: number;
}

// ============================================================
// Occupation → keyword mapping
// ============================================================

const OCCUPATION_KEYWORDS: Record<OccupationType, string[]> = {
  Student: [
    "scholarship", "student", "education", "college", "school",
    "fellowship", "tuition", "academic", "merit", "study",
  ],
  Farmer: [
    "farmer", "kisan", "agriculture", "crop", "irrigation",
    "farming", "agri", "soil", "fertilizer", "harvest",
    "livestock", "dairy", "fishery", "horticulture",
  ],
  "Self-Employed": [
    "self-employed", "freelance", "self-employment", "independent",
    "professional", "consultant",
  ],
  Salaried: [
    "salaried", "employee", "EPF", "PF", "pension",
    "provident fund", "gratuity",
  ],
  "Business Owner": [
    "business", "MSME", "enterprise", "startup", "entrepreneur",
    "manufacturing", "Mudra", "Udyam", "SME", "industry",
    "commercial", "trade",
  ],
  "Daily Wage Worker": [
    "labour", "labor", "worker", "wage", "unorganised",
    "unorganized", "construction", "MGNREGA", "daily wage",
  ],
  Unemployed: [
    "unemployment", "skill", "training", "vocational",
    "placement", "PMKVY", "rozgar", "employment",
  ],
  Homemaker: [
    "women", "mahila", "homemaker", "housewife",
    "self-help group", "SHG", "nari",
  ],
  Retired: [
    "senior citizen", "pension", "retired", "elderly",
    "old age", "varishtha", "geriatric",
  ],
};

// ============================================================
// Category → keyword mapping
// ============================================================

const CATEGORY_KEYWORDS: Record<SocialCategory, string[]> = {
  General: [],
  OBC: ["OBC", "backward class", "backward classes", "other backward"],
  SC: ["SC", "scheduled caste", "dalit"],
  ST: ["ST", "scheduled tribe", "tribal", "adivasi"],
  EWS: ["EWS", "economically weaker", "economically weaker section"],
  Minority: ["minority", "minorities", "muslim", "christian", "sikh", "buddhist", "jain", "parsi"],
};

// ============================================================
// Income bracket → tags
// ============================================================

function getIncomeKeywords(income: number): string[] {
  if (income <= 100000) {
    return ["BPL", "below poverty", "Antyodaya", "poorest", "free"];
  }
  if (income <= 250000) {
    return ["low income", "EWS", "economically weaker", "subsidised", "subsidy"];
  }
  if (income <= 500000) {
    return ["middle class", "affordable", "LIG"];
  }
  if (income <= 1000000) {
    return ["MIG", "middle income"];
  }
  return [];
}

// ============================================================
// Scoring functions
// ============================================================

/**
 * Scores how well a scheme matches the user's occupation (0–30).
 */
function scoreOccupation(
  scheme: GovernmentScheme,
  occupation: OccupationType
): number {
  const keywords = OCCUPATION_KEYWORDS[occupation];
  if (!keywords || keywords.length === 0) return 0;

  const searchText = [
    scheme.scheme_name,
    scheme.description,
    scheme.eligibility,
    scheme.benefits,
    scheme.category,
    ...(scheme.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  let hits = 0;
  for (const keyword of keywords) {
    if (searchText.includes(keyword.toLowerCase())) {
      hits++;
    }
  }

  // Normalize: cap at 5 hits for full score
  const ratio = Math.min(hits / 5, 1);
  return Math.round(ratio * 30);
}

/**
 * Scores how well a scheme matches the user's social category (0–20).
 */
function scoreSocialCategory(
  scheme: GovernmentScheme,
  category: SocialCategory
): number {
  if (category === "General") return 10; // Neutral — eligible for most

  const keywords = CATEGORY_KEYWORDS[category];
  if (!keywords || keywords.length === 0) return 0;

  const searchText = [
    scheme.scheme_name,
    scheme.description,
    scheme.eligibility,
    ...(scheme.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  let hits = 0;
  for (const keyword of keywords) {
    if (searchText.includes(keyword.toLowerCase())) {
      hits++;
    }
  }

  if (hits >= 2) return 20;
  if (hits === 1) return 14;
  return 5; // No explicit exclusion → partial score
}

/**
 * Scores state match (0–25).
 * "All India" schemes always get a partial score.
 */
function scoreState(
  scheme: GovernmentScheme,
  userState: string
): number {
  const states = (scheme.states ?? []).map((s) => s.toLowerCase());

  if (states.length === 0) return 10; // No state data → neutral

  const userStateLower = userState.toLowerCase();

  if (states.includes(userStateLower)) return 25;       // Exact match
  if (states.includes("all india")) return 20;           // National scheme
  return 0;                                              // Different state
}

/**
 * Scores tag relevance (0–15).
 * Matches scheme tags against occupation keywords + income keywords.
 */
function scoreTags(
  scheme: GovernmentScheme,
  profile: UserProfile
): number {
  const schemeTags = (scheme.tags ?? []).map((t) => t.toLowerCase());
  if (schemeTags.length === 0) return 5; // No tags → neutral

  const profileKeywords = [
    ...OCCUPATION_KEYWORDS[profile.occupation],
    ...getIncomeKeywords(profile.income),
    profile.gender.toLowerCase(),
    profile.education.toLowerCase(),
    profile.business_type.toLowerCase(),
  ].map((k) => k.toLowerCase());

  let hits = 0;
  for (const tag of schemeTags) {
    for (const keyword of profileKeywords) {
      if (tag.includes(keyword) || keyword.includes(tag)) {
        hits++;
        break; // Count each tag once
      }
    }
  }

  const ratio = Math.min(hits / Math.max(schemeTags.length, 1), 1);
  return Math.round(ratio * 15);
}

/**
 * Scores income compatibility (0–10).
 * Higher score if the scheme targets the user's income bracket.
 */
function scoreIncome(
  scheme: GovernmentScheme,
  income: number
): number {
  const searchText = [
    scheme.eligibility,
    scheme.description,
    scheme.benefits,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const incomeKeywords = getIncomeKeywords(income);
  if (incomeKeywords.length === 0) return 5; // No specific bracket

  let hits = 0;
  for (const keyword of incomeKeywords) {
    if (searchText.includes(keyword.toLowerCase())) {
      hits++;
    }
  }

  if (hits >= 2) return 10;
  if (hits === 1) return 7;
  return 3; // No income info → minor score
}

/**
 * Computes the total relevance score for a scheme (0–100).
 */
function computeScore(
  scheme: GovernmentScheme,
  profile: UserProfile
): ScoredScheme {
  const breakdown: MatchBreakdown = {
    occupationScore: scoreOccupation(scheme, profile.occupation),
    categoryScore: scoreSocialCategory(scheme, profile.category),
    stateScore: scoreState(scheme, profile.state),
    tagsScore: scoreTags(scheme, profile),
    incomeScore: scoreIncome(scheme, profile.income),
  };

  const total =
    breakdown.occupationScore +
    breakdown.categoryScore +
    breakdown.stateScore +
    breakdown.tagsScore +
    breakdown.incomeScore;

  return {
    scheme,
    relevanceScore: Math.min(total, 100),
    matchBreakdown: breakdown,
  };
}

// ============================================================
// Main Service
// ============================================================

export class SchemeRetrievalService {
  /**
   * Retrieves and ranks all cached schemes against a user profile.
   *
   * @param profile - The user's profile
   * @param options - Optional limit and minimum score threshold
   * @returns Sorted array of scored schemes + average relevance
   */
  static async getRelevantSchemes(
    profile: UserProfile,
    options?: {
      limit?: number;
      minScore?: number;
    }
  ): Promise<RetrievalResult> {
    const limit = options?.limit ?? 20;
    const minScore = options?.minScore ?? 15;

    const supabase = getSupabaseClient();

    // 1. Fetch schemes matching user's state or All India
    const { data: stateSchemes, error: stateError } = await supabase
      .from("scheme_cache")
      .select("*")
      .or(
        `states.cs.{"${profile.state}"},states.cs.{"All India"}`
      );

    // 2. Also fetch schemes with no state restriction (empty array)
    const { data: genericSchemes, error: genericError } = await supabase
      .from("scheme_cache")
      .select("*")
      .eq("states", "{}");

    if (stateError) {
      console.error("State scheme fetch error:", stateError.message);
    }
    if (genericError) {
      console.error("Generic scheme fetch error:", genericError.message);
    }

    // 3. Merge and deduplicate by id
    const allSchemes = new Map<string, GovernmentScheme>();

    for (const scheme of [...(stateSchemes ?? []), ...(genericSchemes ?? [])]) {
      const typed = scheme as GovernmentScheme;
      allSchemes.set(typed.id, typed);
    }

    // 4. Score every scheme
    const scored: ScoredScheme[] = Array.from(allSchemes.values())
      .map((scheme) => computeScore(scheme, profile))
      .filter((s) => s.relevanceScore >= minScore)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);

    // 5. Compute average
    const avgScore =
      scored.length > 0
        ? Math.round(
            scored.reduce((sum, s) => sum + s.relevanceScore, 0) / scored.length
          )
        : 0;

    return {
      schemes: scored,
      averageRelevanceScore: avgScore,
      totalMatched: scored.length,
    };
  }

  /**
   * Quick lookup: returns the top N schemes without full scoring.
   * Useful for preview / autocomplete scenarios.
   */
  static async getTopSchemes(
    profile: UserProfile,
    count: number = 5
  ): Promise<ScoredScheme[]> {
    const result = await SchemeRetrievalService.getRelevantSchemes(profile, {
      limit: count,
      minScore: 10,
    });
    return result.schemes;
  }

  /**
   * Scores a single scheme against a profile.
   * Useful when you already have the scheme object.
   */
  static scoreScheme(
    scheme: GovernmentScheme,
    profile: UserProfile
  ): ScoredScheme {
    return computeScore(scheme, profile);
  }
}

export default SchemeRetrievalService;

// ============================================================
// SchemeSathi — Scheme Retrieval Layer
// services/schemeRetrievalService.ts
//
// Responsibilities:
//   1. Search Supabase cache for relevant schemes
//   2. Rank schemes by profile relevance score
//   3. Trigger discovery if < 5 relevant results found
//   4. Save newly discovered schemes back to cache
//   5. Return combined, ranked results
// ============================================================

import { getSupabaseClient } from "../lib/supabase";
import { SchemeDiscoveryService } from "./SchemeDiscoveryService";
import {
  saveMultipleSchemes,
  type SchemeInsert,
} from "./schemeCacheService";
import type { UserProfile, GovernmentScheme, OccupationType, SocialCategory } from "../types";

// ============================================================
// Constants
// ============================================================

const MIN_RELEVANT_SCHEMES = 5;
const DEFAULT_RETRIEVAL_LIMIT = 30;
const DEFAULT_MIN_SCORE = 10;

// ============================================================
// Result types
// ============================================================

export interface RankedScheme {
  scheme: GovernmentScheme;
  relevanceScore: number;       // 0–100
  scoreBreakdown: ScoreBreakdown;
}

export interface ScoreBreakdown {
  occupationScore: number;      // 0–30
  stateScore: number;           // 0–25
  categoryScore: number;        // 0–20
  tagsScore: number;            // 0–15
  incomeScore: number;          // 0–10
}

export interface RetrievalResult {
  schemes: RankedScheme[];
  totalFound: number;
  averageScore: number;
  fromCache: number;            // how many came from Supabase cache
  fromDiscovery: number;        // how many came from fresh discovery
  discoveryTriggered: boolean;
}

export interface RetrievalOptions {
  limit?: number;
  minScore?: number;
  forceDiscovery?: boolean;     // bypass cache and always discover
}

// ============================================================
// Scoring keyword maps
// ============================================================

const OCCUPATION_KEYWORDS: Record<OccupationType, string[]> = {
  Student:            ["scholarship", "student", "education", "college", "school", "fellowship", "academic", "tuition"],
  Farmer:             ["farmer", "kisan", "agriculture", "crop", "irrigation", "agri", "soil", "harvest", "livestock", "dairy", "fishery"],
  "Self-Employed":    ["self-employed", "freelance", "independent", "consultant", "self-employment"],
  Salaried:           ["salaried", "employee", "epf", "provident fund", "gratuity", "pension"],
  "Business Owner":   ["business", "msme", "enterprise", "startup", "entrepreneur", "mudra", "udyam", "industry", "manufacturing"],
  "Daily Wage Worker":["labour", "labor", "worker", "wage", "unorganised", "mgnrega", "construction"],
  Unemployed:         ["unemployment", "skill", "training", "vocational", "pmkvy", "rozgar", "placement"],
  Homemaker:          ["women", "mahila", "homemaker", "housewife", "self-help", "shg", "nari"],
  Retired:            ["senior citizen", "pension", "retired", "elderly", "old age", "varishtha"],
};

const CATEGORY_KEYWORDS: Record<SocialCategory, string[]> = {
  General:  [],
  OBC:      ["obc", "backward class", "other backward"],
  SC:       ["sc", "scheduled caste", "dalit"],
  ST:       ["st", "scheduled tribe", "tribal", "adivasi"],
  EWS:      ["ews", "economically weaker"],
  Minority: ["minority", "minorities", "muslim", "christian", "sikh", "buddhist", "jain"],
};

function getIncomeKeywords(income: number): string[] {
  if (income <= 100_000)  return ["bpl", "below poverty", "antyodaya", "free"];
  if (income <= 250_000)  return ["low income", "ews", "subsidised", "subsidy"];
  if (income <= 500_000)  return ["middle class", "affordable", "lig"];
  if (income <= 1_000_000) return ["mig", "middle income"];
  return [];
}

// ============================================================
// Scoring functions
// ============================================================

function scoreOccupation(scheme: GovernmentScheme, occupation: OccupationType): number {
  const keywords = OCCUPATION_KEYWORDS[occupation] ?? [];
  const haystack = [
    scheme.scheme_name,
    scheme.description,
    scheme.eligibility,
    scheme.benefits,
    scheme.category,
    ...(scheme.tags ?? []),
  ].filter(Boolean).join(" ").toLowerCase();

  let hits = 0;
  for (const kw of keywords) {
    if (haystack.includes(kw)) hits++;
  }
  return Math.round(Math.min(hits / 5, 1) * 30);
}

function scoreState(scheme: GovernmentScheme, userState: string): number {
  const states = (scheme.states ?? []).map((s) => s.toLowerCase());
  if (states.length === 0) return 10;
  if (states.includes(userState.toLowerCase())) return 25;
  if (states.includes("all india")) return 20;
  return 0;
}

function scoreCategory(scheme: GovernmentScheme, category: SocialCategory): number {
  if (category === "General") return 10;
  const keywords = CATEGORY_KEYWORDS[category] ?? [];
  const haystack = [
    scheme.scheme_name,
    scheme.description,
    scheme.eligibility,
    ...(scheme.tags ?? []),
  ].filter(Boolean).join(" ").toLowerCase();

  let hits = 0;
  for (const kw of keywords) {
    if (haystack.includes(kw)) hits++;
  }
  if (hits >= 2) return 20;
  if (hits === 1) return 14;
  return 5;
}

function scoreTags(scheme: GovernmentScheme, profile: UserProfile): number {
  const schemeTags = (scheme.tags ?? []).map((t) => t.toLowerCase());
  if (schemeTags.length === 0) return 5;

  const profileKeywords = [
    ...OCCUPATION_KEYWORDS[profile.occupation],
    ...getIncomeKeywords(profile.income),
    profile.gender.toLowerCase(),
    profile.education.toLowerCase(),
    profile.business_type.toLowerCase(),
  ].map((k) => k.toLowerCase());

  let hits = 0;
  for (const tag of schemeTags) {
    if (profileKeywords.some((kw) => tag.includes(kw) || kw.includes(tag))) {
      hits++;
    }
  }
  return Math.round(Math.min(hits / Math.max(schemeTags.length, 1), 1) * 15);
}

function scoreIncome(scheme: GovernmentScheme, income: number): number {
  const haystack = [scheme.eligibility, scheme.description, scheme.benefits]
    .filter(Boolean).join(" ").toLowerCase();
  const keywords = getIncomeKeywords(income);
  if (keywords.length === 0) return 5;

  let hits = 0;
  for (const kw of keywords) {
    if (haystack.includes(kw)) hits++;
  }
  if (hits >= 2) return 10;
  if (hits === 1) return 7;
  return 3;
}

// ============================================================
// rankSchemes()
// Scores and sorts an array of schemes against a UserProfile.
// ============================================================

export function rankSchemes(
  schemes: GovernmentScheme[],
  profile: UserProfile
): RankedScheme[] {
  return schemes
    .map((scheme): RankedScheme => {
      const breakdown: ScoreBreakdown = {
        occupationScore: scoreOccupation(scheme, profile.occupation),
        stateScore:      scoreState(scheme, profile.state),
        categoryScore:   scoreCategory(scheme, profile.category),
        tagsScore:       scoreTags(scheme, profile),
        incomeScore:     scoreIncome(scheme, profile.income),
      };

      const relevanceScore = Math.min(
        breakdown.occupationScore +
        breakdown.stateScore +
        breakdown.categoryScore +
        breakdown.tagsScore +
        breakdown.incomeScore,
        100
      );

      return { scheme, relevanceScore, scoreBreakdown: breakdown };
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

// ============================================================
// getCachedSchemes()
// Pulls ALL schemes matching the user's state from Supabase,
// plus national "All India" schemes.
// ============================================================

export async function getCachedSchemes(
  profile: UserProfile
): Promise<GovernmentScheme[]> {
  const db = getSupabaseClient();

  // Fetch state-specific and All India schemes in one query
  const { data: stateData, error: stateError } = await db
    .from("scheme_cache")
    .select("*")
    .or(`states.cs.{"${profile.state}"},states.cs.{"All India"}`)
    .order("benefit_value", { ascending: false });

  // Also fetch schemes with no state restriction
  const { data: emptyStateData, error: emptyStateError } = await db
    .from("scheme_cache")
    .select("*")
    .eq("states", "{}");

  if (stateError) {
    console.error("[getCachedSchemes] State query error:", stateError.message);
  }
  if (emptyStateError) {
    console.error("[getCachedSchemes] Empty-state query error:", emptyStateError.message);
  }

  // Merge and deduplicate by id
  const seen = new Map<string, GovernmentScheme>();
  for (const row of [...(stateData ?? []), ...(emptyStateData ?? [])]) {
    const typed = row as GovernmentScheme;
    seen.set(typed.id, typed);
  }

  return Array.from(seen.values());
}

// ============================================================
// triggerDiscoveryIfNeeded()
// Calls SchemeDiscoveryService to generate search queries,
// then fetches schemes from the cache using those keywords.
// Saves any newly found schemes back to the Supabase cache.
//
// NOTE: SchemeDiscoveryService generates search query strings.
// In a full pipeline this would call a web scraper / external
// API. Here we search the Supabase cache with those keywords
// and also insert placeholder records for freshly discovered
// schemes so the cache stays warm.
// ============================================================

async function triggerDiscoveryIfNeeded(
  profile: UserProfile,
  existingIds: Set<string>
): Promise<GovernmentScheme[]> {
  const db = getSupabaseClient();

  // 1. Generate targeted search queries from the profile
  const queries = SchemeDiscoveryService.generateTopQueries(profile, 5);

  const discovered = new Map<string, GovernmentScheme>();

  // 2. Search the Supabase cache with each generated query
  for (const query of queries) {
    const term = `%${query.split(" ").slice(0, 3).join("%")}%`;

    const { data, error } = await db
      .from("scheme_cache")
      .select("*")
      .or(
        [
          `scheme_name.ilike.${term}`,
          `description.ilike.${term}`,
          `eligibility.ilike.${term}`,
          `tags.cs.{${query.split(" ")[0]}}`,
        ].join(",")
      )
      .limit(10);

    if (error) {
      console.error(`[triggerDiscoveryIfNeeded] Query "${query}" error:`, error.message);
      continue;
    }

    for (const row of data ?? []) {
      const scheme = row as GovernmentScheme;
      if (!existingIds.has(scheme.id)) {
        discovered.set(scheme.id, scheme);
      }
    }
  }

  // 3. If we found new schemes that aren't in the cache already, upsert them
  const newSchemes = Array.from(discovered.values());

  if (newSchemes.length > 0) {
    const inserts: SchemeInsert[] = newSchemes.map(
      ({ id: _id, fetched_at: _fa, ...rest }) => rest
    );
    await saveMultipleSchemes(inserts);
  }

  return newSchemes;
}

// ============================================================
// retrieveRelevantSchemes() — Main entry point
//
// Flow:
//   1. Pull schemes from Supabase cache (state + All India)
//   2. Rank by relevance score
//   3. Filter by minScore threshold
//   4. If fewer than MIN_RELEVANT_SCHEMES remain → trigger discovery
//   5. Merge, re-rank, and return final results
// ============================================================

export async function retrieveRelevantSchemes(
  profile: UserProfile,
  options: RetrievalOptions = {}
): Promise<RetrievalResult> {
  const limit    = options.limit    ?? DEFAULT_RETRIEVAL_LIMIT;
  const minScore = options.minScore ?? DEFAULT_MIN_SCORE;

  // ---- Step 1: Pull from cache ----------------------------
  const cached = await getCachedSchemes(profile);
  const cachedIds = new Set(cached.map((s) => s.id));

  // ---- Step 2: Rank cached schemes -----------------------
  const ranked = rankSchemes(cached, profile);
  const relevant = ranked.filter((r) => r.relevanceScore >= minScore);

  // ---- Step 3: Discovery if needed -----------------------
  let discoveryTriggered = false;
  let fromDiscovery = 0;
  let discoveredRanked: RankedScheme[] = [];

  const needsDiscovery =
    options.forceDiscovery || relevant.length < MIN_RELEVANT_SCHEMES;

  if (needsDiscovery) {
    discoveryTriggered = true;

    const newSchemes = await triggerDiscoveryIfNeeded(profile, cachedIds);
    fromDiscovery = newSchemes.length;

    if (newSchemes.length > 0) {
      discoveredRanked = rankSchemes(newSchemes, profile).filter(
        (r) => r.relevanceScore >= minScore
      );
    }
  }

  // ---- Step 4: Merge and re-rank -------------------------
  const mergedMap = new Map<string, RankedScheme>();

  for (const r of [...relevant, ...discoveredRanked]) {
    const id = r.scheme.id;
    const existing = mergedMap.get(id);
    // Keep the higher-scored entry if duplicated
    if (!existing || r.relevanceScore > existing.relevanceScore) {
      mergedMap.set(id, r);
    }
  }

  const finalRanked = Array.from(mergedMap.values())
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);

  // ---- Step 5: Build result --------------------------------
  const avgScore =
    finalRanked.length > 0
      ? Math.round(
          finalRanked.reduce((sum, r) => sum + r.relevanceScore, 0) /
            finalRanked.length
        )
      : 0;

  const fromCache = finalRanked.filter((r) =>
    cachedIds.has(r.scheme.id)
  ).length;

  return {
    schemes: finalRanked,
    totalFound: finalRanked.length,
    averageScore: avgScore,
    fromCache,
    fromDiscovery,
    discoveryTriggered,
  };
}

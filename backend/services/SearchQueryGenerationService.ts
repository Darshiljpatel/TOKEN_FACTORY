// ============================================================
// SchemeSathi — Search Query Generation Service
// Uses Gemini AI to generate optimized web search queries
// for discovering government schemes from official sources.
// ============================================================

import { z } from "zod";
import type { UserProfile } from "../types";

// ============================================================
// Zod schema for AI response
// ============================================================

const SearchQueriesSchema = z.object({
  queries: z
    .array(z.string().min(5).max(200))
    .min(1)
    .max(30),
});

export type GeneratedQueries = z.infer<typeof SearchQueriesSchema>;

// ============================================================
// Result types
// ============================================================

export interface QueryGenSuccess {
  success: true;
  queries: string[];
  totalQueries: number;
}

export interface QueryGenFailure {
  success: false;
  error: string;
  rawResponse?: string;
}

export type QueryGenResult = QueryGenSuccess | QueryGenFailure;

// ============================================================
// System prompt
// ============================================================

const SYSTEM_PROMPT = `You are a Government Scheme Search Specialist for India.

Given a user profile, generate the best web search queries that will discover relevant government schemes, subsidies, grants, loans, and benefits for this person.

PRIORITY ORDER for sources (generate queries that will surface these first):
1. MyScheme portal (myscheme.gov.in) — India's national scheme aggregator
2. Official ministry websites (e.g., pmkisan.gov.in, msme.gov.in, pmjay.gov.in)
3. MSME-related scheme portals (udyamregistration.gov.in, mudra.org.in)
4. State-specific government portals
5. National government portals (india.gov.in, pib.gov.in)

RULES:
1. Generate 10–25 highly targeted search queries.
2. Include "site:" operators for official sources where relevant.
3. Mix broad discovery queries with specific scheme-name queries.
4. Include state-specific queries using the user's state name.
5. Include occupation-specific queries.
6. Include social category-specific queries (SC/ST/OBC/EWS/Minority) when applicable.
7. Include income-bracket-specific queries when income data is available.
8. For business owners/self-employed, always include MSME and Mudra scheme queries.
9. For farmers, always include PM Kisan, crop insurance, and agriculture subsidy queries.
10. For students, always include scholarship and education loan queries.
11. For women, include women-specific scheme queries.
12. Queries should be in English and optimized for Google Search.
13. Return ONLY valid JSON. No markdown, no explanations, no code fences.

OUTPUT FORMAT:
{
  "queries": ["query1", "query2", ...]
}`;

// ============================================================
// Profile → text summary for the AI
// ============================================================

function profileToText(profile: UserProfile): string {
  const lines: string[] = [
    `Age: ${profile.age}`,
    `Gender: ${profile.gender}`,
    `State: ${profile.state}`,
    `Occupation: ${profile.occupation}`,
    `Annual Income: ₹${profile.income.toLocaleString("en-IN")}`,
    `Social Category: ${profile.category}`,
    `Education: ${profile.education}`,
  ];

  if (profile.business_type !== "None") {
    lines.push(`Business Type: ${profile.business_type}`);
    lines.push(`Annual Turnover: ₹${profile.turnover.toLocaleString("en-IN")}`);
  }

  if (profile.land_holding > 0) {
    lines.push(`Land Holding: ${profile.land_holding} acres`);
  }

  return lines.join("\n");
}

// ============================================================
// Gemini API call
// ============================================================

async function callGemini(profileText: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY in environment variables");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `${SYSTEM_PROMPT}\n\n---\n\nUser Profile:\n${profileText}`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      topP: 0.9,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  if (!text) {
    throw new Error("Empty response from Gemini API");
  }

  return text;
}

// ============================================================
// JSON cleaning
// ============================================================

function cleanJsonResponse(raw: string): string {
  let cleaned = raw.trim();

  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*\n?/, "")
      .replace(/\n?```\s*$/, "");
  }

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  return cleaned;
}

// ============================================================
// Fallback queries (when AI fails)
// ============================================================

function buildFallbackQueries(profile: UserProfile): string[] {
  const queries: string[] = [];
  const { state, occupation, category, income, gender, business_type } = profile;

  // MyScheme portal queries
  queries.push(
    `site:myscheme.gov.in ${occupation.toLowerCase()} schemes`,
    `site:myscheme.gov.in ${state} schemes`
  );

  // Occupation-specific
  const occupationMap: Record<string, string[]> = {
    Student: [
      `scholarship schemes for ${category} students India`,
      `site:scholarships.gov.in ${category} scholarship`,
      `${state} state scholarship schemes`,
    ],
    Farmer: [
      `PM Kisan eligibility ${state}`,
      `site:pmkisan.gov.in registration`,
      `agriculture subsidy schemes ${state}`,
      `crop insurance PMFBY ${state}`,
      `farmer welfare schemes India`,
    ],
    "Business Owner": [
      `MSME loan schemes India`,
      `site:msme.gov.in schemes`,
      `site:mudra.org.in eligibility`,
      `Udyam registration benefits`,
      `${business_type} enterprise government schemes India`,
    ],
    "Self-Employed": [
      `self-employment schemes India`,
      `site:msme.gov.in self-employed`,
      `Mudra loan eligibility self-employed`,
    ],
    "Daily Wage Worker": [
      `unorganised worker welfare schemes India`,
      `e-Shram registration benefits`,
      `construction worker schemes ${state}`,
      `MGNREGA ${state}`,
    ],
    Unemployed: [
      `skill development schemes India PMKVY`,
      `unemployment allowance ${state}`,
      `free vocational training government India`,
    ],
    Homemaker: [
      `women self-employment schemes India`,
      `Mahila Samman savings certificate`,
      `women welfare schemes ${state}`,
    ],
    Retired: [
      `senior citizen pension scheme India`,
      `Atal Pension Yojana eligibility`,
      `senior citizen savings scheme SCSS`,
    ],
    Salaried: [
      `EPF pension scheme India`,
      `government schemes salaried employees India`,
      `tax saving government schemes India`,
    ],
  };

  queries.push(...(occupationMap[occupation] ?? []));

  // Category-specific
  if (category !== "General") {
    queries.push(
      `${category} welfare schemes India`,
      `${category} government schemes ${state}`
    );
  }

  // Income-specific
  if (income <= 250000) {
    queries.push(
      `Ayushman Bharat eligibility`,
      `BPL schemes India`,
      `subsidised housing PMAY ${state}`
    );
  }

  // Gender-specific
  if (gender === "Female") {
    queries.push(
      `women empowerment schemes India`,
      `Beti Bachao Beti Padhao scheme`,
      `women entrepreneur loan scheme India`
    );
  }

  // State portal
  queries.push(`${state} government welfare schemes 2025`);

  // General official sources
  queries.push(
    `site:india.gov.in government schemes`,
    `site:pib.gov.in new government schemes`
  );

  return [...new Set(queries)];
}

// ============================================================
// Main Service
// ============================================================

export class SearchQueryGenerationService {
  /**
   * Generates optimized web search queries using Gemini AI.
   * Falls back to rule-based generation if AI fails.
   *
   * @param profile - User's demographic/economic profile
   * @returns Array of search query strings
   */
  static async generateQueries(profile: UserProfile): Promise<QueryGenResult> {
    try {
      const profileText = profileToText(profile);
      const rawResponse = await callGemini(profileText);
      const cleanedJson = cleanJsonResponse(rawResponse);

      let parsed: unknown;
      try {
        parsed = JSON.parse(cleanedJson);
      } catch {
        // AI returned invalid JSON → fall back
        console.warn("AI returned invalid JSON, using fallback queries");
        const fallback = buildFallbackQueries(profile);
        return {
          success: true,
          queries: fallback,
          totalQueries: fallback.length,
        };
      }

      const validation = SearchQueriesSchema.safeParse(parsed);

      if (!validation.success) {
        console.warn("AI response failed validation, using fallback queries");
        const fallback = buildFallbackQueries(profile);
        return {
          success: true,
          queries: fallback,
          totalQueries: fallback.length,
        };
      }

      // Deduplicate
      const unique = [...new Set(validation.data.queries)];

      return {
        success: true,
        queries: unique,
        totalQueries: unique.length,
      };
    } catch (err: unknown) {
      // Full failure → fallback
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("AI query generation failed:", message, "— using fallback");

      const fallback = buildFallbackQueries(profile);
      return {
        success: true,
        queries: fallback,
        totalQueries: fallback.length,
      };
    }
  }

  /**
   * Rule-based query generation (no AI call).
   * Use when you want instant results or to save API quota.
   *
   * @param profile - User's profile
   * @returns Array of search query strings
   */
  static generateFallbackQueries(profile: UserProfile): QueryGenResult {
    const queries = buildFallbackQueries(profile);
    return {
      success: true,
      queries,
      totalQueries: queries.length,
    };
  }

  /**
   * Combines AI-generated and rule-based queries for
   * maximum coverage. Deduplicates the merged set.
   *
   * @param profile - User's profile
   * @returns Merged, deduplicated array of search queries
   */
  static async generateCombinedQueries(
    profile: UserProfile
  ): Promise<QueryGenResult> {
    const [aiResult, ruleResult] = await Promise.all([
      SearchQueryGenerationService.generateQueries(profile),
      Promise.resolve(SearchQueryGenerationService.generateFallbackQueries(profile)),
    ]);

    const merged = [
      ...(aiResult.success ? aiResult.queries : []),
      ...(ruleResult.success ? ruleResult.queries : []),
    ];

    const unique = [...new Set(merged)];

    return {
      success: true,
      queries: unique,
      totalQueries: unique.length,
    };
  }
}

export default SearchQueryGenerationService;

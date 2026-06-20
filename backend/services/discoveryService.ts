// ============================================================
// SchemeSathi — Discovery Service
// services/discoveryService.ts
//
// Uses Nebius AI Studio (Qwen model, OpenAI-compatible API)
// to discover Indian government schemes for a user profile.
//
// Flow:
//   1. generateSearchQueries(profile)  → string[]
//   2. discoverSchemes(profile)
//      ├─ Generate targeted queries
//      ├─ Call Qwen via Nebius for each query
//      ├─ Parse & normalize → GovernmentScheme[]
//      └─ Save to Supabase cache
// ============================================================

import { z } from "zod";
import { saveMultipleSchemes } from "./schemeCacheService";
import type { UserProfile, GovernmentScheme } from "../types";

// ============================================================
// Config
// ============================================================

const NEBIUS_BASE_URL = "https://api.studio.nebius.com/v1";
const NEBIUS_MODEL    = "Qwen/Qwen3-235B-A22B";
const MAX_QUERIES     = 5;     // max queries to fire per profile
const MAX_SCHEMES_PER_QUERY = 5; // max schemes to extract per query

// ============================================================
// Zod schema for a single discovered scheme
// ============================================================

const DiscoveredSchemeSchema = z.object({
  scheme_name:   z.string().min(3),
  category:      z.string().nullable().default(null),
  description:   z.string().nullable().default(null),
  eligibility:   z.string().nullable().default(null),
  benefits:      z.string().nullable().default(null),
  benefit_value: z.number().nonnegative().default(0),
  source_url:    z.string().url().nullable().default(null),
  states:        z.array(z.string()).default([]),
  tags:          z.array(z.string()).default([]),
  ministry:      z.string().nullable().default(null),
});

const DiscoveryResponseSchema = z.object({
  schemes: z.array(DiscoveredSchemeSchema).min(1),
});

type DiscoveredScheme = z.infer<typeof DiscoveredSchemeSchema>;

// ============================================================
// Result types
// ============================================================

export interface DiscoveryResult {
  success: boolean;
  schemes: GovernmentScheme[];
  queriesRun: number;
  savedToCache: number;
  errors: string[];
}

// ============================================================
// Occupation → keyword map for query generation
// ============================================================

const OCCUPATION_QUERY_MAP: Record<string, string[]> = {
  Student: [
    "scholarship schemes for students India",
    "education loan government scheme India",
    "free coaching scheme India",
  ],
  Farmer: [
    "farmer subsidy schemes India",
    "PM Kisan Samman Nidhi eligibility",
    "crop insurance PMFBY scheme India",
    "agriculture irrigation subsidy India",
  ],
  "Self-Employed": [
    "self-employed government scheme India",
    "Mudra loan self-employed India",
  ],
  Salaried: [
    "government schemes salaried employees India",
    "EPF ESIC benefits salaried India",
  ],
  "Business Owner": [
    "MSME loan scheme India",
    "Udyam registration benefits India",
    "Mudra loan PMMY eligibility India",
    "startup India government scheme",
  ],
  "Daily Wage Worker": [
    "unorganised worker scheme India",
    "e-Shram portal benefits India",
    "MGNREGA scheme eligibility India",
  ],
  Unemployed: [
    "PMKVY skill development scheme India",
    "unemployment welfare scheme India",
    "free training government scheme India",
  ],
  Homemaker: [
    "women self-help group scheme India",
    "Mahila Samman scheme India",
    "women welfare government scheme India",
  ],
  Retired: [
    "senior citizen government scheme India",
    "Atal Pension Yojana eligibility India",
    "senior citizen savings scheme India",
  ],
};

const CATEGORY_QUERIES: Record<string, string[]> = {
  OBC:      ["OBC scholarship scheme India", "OBC welfare scheme India"],
  SC:       ["SC scholarship scheme India", "SC Dalit welfare scheme India"],
  ST:       ["ST tribal welfare scheme India", "Scheduled Tribe scheme India"],
  EWS:      ["EWS government scheme India", "economically weaker section scheme"],
  Minority: ["minority scholarship India", "Maulana Azad scholarship scheme"],
  General:  [],
};

// ============================================================
// 1. generateSearchQueries()
// Returns targeted search query strings from a UserProfile.
// ============================================================

export function generateSearchQueries(profile: UserProfile): string[] {
  const queries: string[] = [];

  // Occupation-based (primary)
  const occQueries = OCCUPATION_QUERY_MAP[profile.occupation] ?? [];
  queries.push(...occQueries);

  // Category-based
  const catQueries = CATEGORY_QUERIES[profile.category] ?? [];
  queries.push(...catQueries);

  // State-specific
  queries.push(`government welfare schemes ${profile.state} India`);

  // Gender-specific
  if (profile.gender === "Female") {
    queries.push("women empowerment government scheme India");
  }

  // Income-based
  if (profile.income <= 200_000) {
    queries.push("BPL below poverty line government scheme India");
    queries.push("Ayushman Bharat eligibility income");
  }

  // Land / agriculture
  if (profile.land_holding > 0) {
    queries.push(
      profile.land_holding <= 2
        ? "small marginal farmer scheme India"
        : "farmer subsidy schemes India"
    );
  }

  // Business type
  if (profile.business_type !== "None" && profile.turnover > 0) {
    queries.push(`${profile.business_type.toLowerCase()} enterprise MSME scheme India`);
  }

  // Deduplicate and cap
  return [...new Set(queries)].slice(0, MAX_QUERIES);
}

// ============================================================
// Nebius / Qwen API caller
// ============================================================

async function callQwen(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = process.env.NEBIUS_API_KEY;

  if (!apiKey || apiKey === "your_nebius_api_key") {
    throw new Error(
      "Missing or placeholder NEBIUS_API_KEY. Set it in .env from https://studio.nebius.com/settings/api-keys"
    );
  }

  const response = await fetch(`${NEBIUS_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      model: NEBIUS_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userMessage  },
      ],
      temperature:       0.2,
      max_tokens:        4096,
      top_p:             0.85,
      response_format:   { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Nebius API error (${response.status}): ${body}`);
  }

  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content ?? "";

  if (!content) {
    throw new Error("Nebius returned empty content");
  }

  return content;
}

// ============================================================
// System prompt for scheme discovery
// ============================================================

const DISCOVERY_SYSTEM_PROMPT = `You are an Indian Government Scheme Expert.

Given a search query about government welfare schemes, extract and return detailed information about relevant Indian government schemes.

Rules:
1. Only return REAL, EXISTING Indian government schemes. Do NOT invent or hallucinate schemes.
2. Include central government AND state government schemes relevant to the query.
3. For benefit_value: provide annual monetary value in INR as an integer. Use 0 if non-monetary.
4. For states: use ["All India"] for central schemes, or actual state names for state schemes.
5. For tags: 3–8 lowercase keywords describing the scheme (e.g., ["farmer", "subsidy", "agriculture"]).
6. For source_url: use the official government portal URL if known, otherwise null.
7. Return maximum ${MAX_SCHEMES_PER_QUERY} schemes per query.
8. Return ONLY valid JSON in this exact format:

{
  "schemes": [
    {
      "scheme_name": "string",
      "category": "string",
      "description": "string",
      "eligibility": "string",
      "benefits": "string",
      "benefit_value": number,
      "source_url": "url or null",
      "states": ["All India"] or ["State Name"],
      "tags": ["tag1", "tag2"],
      "ministry": "string or null"
    }
  ]
}`;

// ============================================================
// Parse and validate Qwen's JSON response
// ============================================================

function parseQwenResponse(raw: string): DiscoveredScheme[] {
  let cleaned = raw.trim();

  // Strip markdown code fences
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*\n?/, "")
      .replace(/\n?```\s*$/, "");
  }

  // Extract JSON object
  const firstBrace = cleaned.indexOf("{");
  const lastBrace  = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  const parsed = JSON.parse(cleaned);
  const result = DiscoveryResponseSchema.safeParse(parsed);

  if (!result.success) {
    throw new Error(
      `Validation failed: ${result.error.issues.map((i) => i.message).join("; ")}`
    );
  }

  return result.data.schemes;
}

// ============================================================
// Normalize DiscoveredScheme → GovernmentScheme-compatible insert
// ============================================================

function normalizeScheme(
  raw: DiscoveredScheme
): Omit<GovernmentScheme, "id" | "fetched_at"> {
  return {
    scheme_name:   raw.scheme_name.trim(),
    category:      raw.category,
    description:   raw.description,
    eligibility:   raw.eligibility,
    benefits:      raw.benefits,
    benefit_value: Math.round(raw.benefit_value),
    source_url:    raw.source_url,
    states:        raw.states.length > 0 ? raw.states : ["All India"],
    tags:          raw.tags.map((t) => t.toLowerCase().trim()),
    ministry:      raw.ministry,
  };
}

// ============================================================
// 2. discoverSchemes() — Main entry point
// ============================================================

export async function discoverSchemes(
  profile: UserProfile
): Promise<DiscoveryResult> {
  const errors: string[] = [];
  const allDiscovered = new Map<string, Omit<GovernmentScheme, "id" | "fetched_at">>();

  // Step 1: Generate targeted queries
  const queries = generateSearchQueries(profile);

  // Step 2: Call Qwen for each query
  for (const query of queries) {
    const userMessage = `Search query: "${query}"

User profile context:
- Occupation: ${profile.occupation}
- State: ${profile.state}
- Category: ${profile.category}
- Income: ₹${profile.income.toLocaleString("en-IN")}/year
- Gender: ${profile.gender}
${profile.land_holding > 0 ? `- Land: ${profile.land_holding} acres` : ""}
${profile.business_type !== "None" ? `- Business: ${profile.business_type} (₹${profile.turnover.toLocaleString("en-IN")} turnover)` : ""}

Find the most relevant government schemes for this query and user profile.`;

    try {
      const raw = await callQwen(DISCOVERY_SYSTEM_PROMPT, userMessage);
      const schemes = parseQwenResponse(raw);

      for (const scheme of schemes) {
        const normalized = normalizeScheme(scheme);
        const key = normalized.scheme_name.toLowerCase().trim();

        // Deduplicate by name — last-write wins within same batch
        allDiscovered.set(key, normalized);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Query "${query}": ${msg}`);
      console.error(`[discoveryService] Query failed: "${query}"\n  ${msg}`);
    }

    // Small delay between queries to avoid rate limiting
    await new Promise((r) => setTimeout(r, 300));
  }

  // Step 3: Save discovered schemes to Supabase cache
  const discovered = Array.from(allDiscovered.values());
  let savedToCache = 0;

  if (discovered.length > 0) {
    const saveResult = await saveMultipleSchemes(discovered);

    if (saveResult.success) {
      savedToCache = saveResult.count;
    } else {
      errors.push(`Cache save error: ${saveResult.error}`);
      console.error("[discoveryService] Cache save failed:", saveResult.error);
    }
  }

  // Step 4: Build final GovernmentScheme list
  // We attach placeholder ids for in-memory use; Supabase will have real ids
  const schemes: GovernmentScheme[] = discovered.map((s, i) => ({
    ...s,
    id:         `discovered-${Date.now()}-${i}`,
    fetched_at: new Date().toISOString(),
  }));

  return {
    success:      errors.length < queries.length, // partial success OK
    schemes,
    queriesRun:   queries.length,
    savedToCache,
    errors,
  };
}

export default { generateSearchQueries, discoverSchemes };

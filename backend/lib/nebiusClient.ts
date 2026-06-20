// ============================================================
// SchemeSathi — Nebius AI Client
// lib/nebiusClient.ts
//
// Models:
//   • Qwen3-235B-A22B  → Search query generation + scheme extraction
//   • DeepSeek-R1      → Eligibility reasoning
//
// All functions use Nebius AI Studio (OpenAI-compatible API).
// ============================================================

import { z } from "zod";
import type { UserProfile, GovernmentScheme } from "../types";

// ============================================================
// Config
// ============================================================

const NEBIUS_BASE_URL = "https://api.studio.nebius.com/v1";

const MODELS = {
  /** Structured extraction: search queries, scheme parsing */
  QWEN: "Qwen/Qwen3-235B-A22B",
  /** Deep reasoning: eligibility evaluation */
  DEEPSEEK: "deepseek-ai/DeepSeek-R1",
} as const;

// ============================================================
// Zod output schemas
// ============================================================

// --- Search Queries ------------------------------------------
const SearchQueriesSchema = z.object({
  queries: z.array(z.string().min(5)).min(1).max(25),
});

// --- Extracted Scheme ----------------------------------------
const ExtractedSchemeSchema = z.object({
  scheme_name:   z.string().min(3),
  category:      z.string().nullable().default(null),
  description:   z.string().nullable().default(null),
  eligibility:   z.string().nullable().default(null),
  benefits:      z.string().nullable().default(null),
  benefit_value: z.number().nonnegative().default(0),
  source_url:    z.string().url().nullable().default(null),
  states:        z.array(z.string()).default(["All India"]),
  tags:          z.array(z.string()).default([]),
  ministry:      z.string().nullable().default(null),
});

// --- Eligibility Result --------------------------------------
const EligibilityResultSchema = z.object({
  scheme_name:      z.string(),
  status:           z.enum(["Eligible", "Possibly Eligible", "Not Eligible"]),
  confidence:       z.number().int().min(0).max(100),
  reason:           z.string().min(5),
  benefits_summary: z.string().min(3),
  action_steps:     z.array(z.string()).default([]),
});

export type SearchQueriesOutput  = z.infer<typeof SearchQueriesSchema>;
export type ExtractedSchemeOutput = z.infer<typeof ExtractedSchemeSchema>;
export type EligibilityOutput     = z.infer<typeof EligibilityResultSchema>;

// ============================================================
// Generic Result wrapper
// ============================================================

export interface NebiusSuccess<T> {
  success: true;
  data: T;
  model: string;
  tokensUsed?: number;
}

export interface NebiusFailure {
  success: false;
  error: string;
  model: string;
  rawResponse?: string;
}

export type NebiusResult<T> = NebiusSuccess<T> | NebiusFailure;

// ============================================================
// Core HTTP caller
// ============================================================

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface CallOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  jsonMode?: boolean;   // sets response_format: { type: "json_object" }
}

async function callNebius(options: CallOptions): Promise<{ content: string; tokensUsed: number }> {
  const apiKey = process.env.NEBIUS_API_KEY;

  if (!apiKey || apiKey === "your_nebius_api_key") {
    throw new Error(
      "Missing NEBIUS_API_KEY. Add it to .env from https://studio.nebius.com/settings/api-keys"
    );
  }

  const body: Record<string, unknown> = {
    model:       options.model,
    messages:    options.messages,
    temperature: options.temperature  ?? 0.2,
    max_tokens:  options.maxTokens    ?? 4096,
    top_p:       options.topP         ?? 0.85,
  };

  if (options.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(`${NEBIUS_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Nebius API (${response.status}): ${errText}`);
  }

  const json = await response.json();

  const content = json?.choices?.[0]?.message?.content ?? "";
  if (!content) throw new Error("Nebius returned empty content");

  const tokensUsed =
    (json?.usage?.prompt_tokens ?? 0) +
    (json?.usage?.completion_tokens ?? 0);

  return { content, tokensUsed };
}

// ============================================================
// JSON cleaner (strips markdown fences)
// ============================================================

function cleanJson(raw: string): string {
  let s = raw.trim();

  // Remove <think>...</think> blocks (DeepSeek R1 chain-of-thought)
  s = s.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }

  const first = s.indexOf("{");
  const last  = s.lastIndexOf("}");
  if (first !== -1 && last !== -1) {
    s = s.slice(first, last + 1);
  }

  return s;
}

// ============================================================
// Profile → concise text summary
// ============================================================

function profileSummary(profile: UserProfile): string {
  const lines = [
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
// 1. generateSearchQueries()
//    Model: Qwen3
//    Generates targeted web search queries to discover schemes.
// ============================================================

const QUERY_GEN_SYSTEM = `You are a Government Scheme Search Specialist for India.

Generate targeted web search queries to discover relevant Indian government schemes for the given user profile.

Priority sources (generate queries that surface these):
1. site:myscheme.gov.in
2. Official ministry websites (pmkisan.gov.in, msme.gov.in, scholarships.gov.in)
3. site:mudra.org.in, site:udyamregistration.gov.in
4. State government portals
5. site:india.gov.in

Rules:
- Generate 10–20 highly targeted queries.
- Mix broad and specific queries.
- Include "site:" operators for official portals.
- Include state-specific, occupation-specific, and category-specific queries.
- For women users: include women-specific scheme queries.
- For farmers: always include PM Kisan, crop insurance, irrigation subsidy.
- For business owners: always include MSME, Mudra, Udyam queries.
- Return ONLY valid JSON. No markdown. No explanation.

Output:
{
  "queries": ["query1", "query2", ...]
}`;

export async function generateSearchQueries(
  profile: UserProfile
): Promise<NebiusResult<SearchQueriesOutput>> {
  const userMsg = `Generate search queries for this user profile:\n\n${profileSummary(profile)}`;

  try {
    const { content, tokensUsed } = await callNebius({
      model:       MODELS.QWEN,
      messages:    [
        { role: "system", content: QUERY_GEN_SYSTEM },
        { role: "user",   content: userMsg },
      ],
      temperature: 0.3,
      maxTokens:   2048,
      jsonMode:    true,
    });

    const cleaned  = cleanJson(content);
    const parsed   = JSON.parse(cleaned);
    const validated = SearchQueriesSchema.safeParse(parsed);

    if (!validated.success) {
      return {
        success: false,
        error:   `Validation: ${validated.error.issues.map((i) => i.message).join("; ")}`,
        model:   MODELS.QWEN,
        rawResponse: content,
      };
    }

    // Deduplicate
    const unique = [...new Set(validated.data.queries)];

    return {
      success:    true,
      data:       { queries: unique },
      model:      MODELS.QWEN,
      tokensUsed,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error:   err instanceof Error ? err.message : String(err),
      model:   MODELS.QWEN,
    };
  }
}

// ============================================================
// 2. extractGovernmentScheme()
//    Model: Qwen3
//    Extracts structured scheme data from raw page content.
// ============================================================

const EXTRACTION_SYSTEM = `You are an Indian Government Scheme Data Extractor.

Extract structured government scheme information from the provided raw web page text.

Rules:
1. Extract ONLY information that is explicitly present in the text.
2. Do NOT invent or hallucinate any details.
3. benefit_value = annual monetary benefit in INR as integer. Use 0 if non-monetary or unknown.
4. states = ["All India"] for central schemes, or actual Indian state names.
5. tags = 3–8 lowercase keywords (e.g., ["farmer", "subsidy", "agriculture"]).
6. source_url = official portal URL if mentioned in the text, else null.
7. If scheme_name cannot be determined, return null for the entire object.
8. Return ONLY valid JSON. No markdown. No explanation.

Output:
{
  "scheme_name": "string",
  "category": "Agriculture | Education | Healthcare | Housing | Business & Entrepreneurship | Women & Child Development | Social Welfare | Employment | Financial Inclusion | Other | null",
  "description": "string | null",
  "eligibility": "string | null",
  "benefits": "string | null",
  "benefit_value": number,
  "source_url": "url | null",
  "states": ["All India"] or ["State1", ...],
  "tags": ["tag1", "tag2", ...],
  "ministry": "string | null"
}`;

export async function extractGovernmentScheme(
  pageContent: string
): Promise<NebiusResult<ExtractedSchemeOutput>> {
  if (!pageContent || pageContent.trim().length < 30) {
    return {
      success: false,
      error:   "Page content too short to extract scheme data",
      model:   MODELS.QWEN,
    };
  }

  // Truncate to avoid hitting token limits (keep first 6000 chars)
  const truncated = pageContent.trim().slice(0, 6000);

  try {
    const { content, tokensUsed } = await callNebius({
      model:       MODELS.QWEN,
      messages:    [
        { role: "system", content: EXTRACTION_SYSTEM },
        { role: "user",   content: `Extract scheme data from this page content:\n\n${truncated}` },
      ],
      temperature: 0.1,
      maxTokens:   2048,
      jsonMode:    true,
    });

    const cleaned   = cleanJson(content);
    const parsed    = JSON.parse(cleaned);
    const validated = ExtractedSchemeSchema.safeParse(parsed);

    if (!validated.success) {
      return {
        success: false,
        error:   `Validation: ${validated.error.issues.map((i) => i.message).join("; ")}`,
        model:   MODELS.QWEN,
        rawResponse: content,
      };
    }

    return {
      success:    true,
      data:       validated.data,
      model:      MODELS.QWEN,
      tokensUsed,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error:   err instanceof Error ? err.message : String(err),
      model:   MODELS.QWEN,
    };
  }
}

// ============================================================
// 3. evaluateEligibility()
//    Model: DeepSeek R1 (chain-of-thought reasoning)
//    Determines eligibility with conservative, cited reasoning.
// ============================================================

const ELIGIBILITY_SYSTEM = `You are an Indian Government Welfare Expert using careful step-by-step reasoning.

Determine whether a user is eligible for a government scheme based STRICTLY on the provided information.

Classification:
- "Eligible": User clearly meets ALL stated eligibility criteria.
- "Possibly Eligible": Partial match or insufficient information to confirm fully.
- "Not Eligible": User clearly fails one or more stated criteria.

Rules:
1. Be CONSERVATIVE. Default to "Possibly Eligible" when uncertain.
2. NEVER invent eligibility requirements not stated in the scheme data.
3. Use ONLY the provided profile and scheme information.
4. confidence (0–100): how certain you are of the classification.
5. reason: cite specific scheme criteria and how the profile matches or doesn't.
6. benefits_summary: what the user would receive if eligible.
7. action_steps: 1–3 concrete next steps the user should take.
8. Think through each eligibility dimension: state → income → occupation → category → age → gender.
9. Return ONLY valid JSON. No markdown.

Output:
{
  "scheme_name": "string",
  "status": "Eligible" | "Possibly Eligible" | "Not Eligible",
  "confidence": 0-100,
  "reason": "string",
  "benefits_summary": "string",
  "action_steps": ["step1", "step2"]
}`;

export async function evaluateEligibility(
  profile: UserProfile,
  scheme: GovernmentScheme
): Promise<NebiusResult<EligibilityOutput>> {
  const schemeText = [
    `Scheme Name: ${scheme.scheme_name}`,
    scheme.category    ? `Category: ${scheme.category}` : null,
    scheme.description ? `Description: ${scheme.description}` : null,
    scheme.eligibility ? `Eligibility: ${scheme.eligibility}` : null,
    scheme.benefits    ? `Benefits: ${scheme.benefits}` : null,
    scheme.benefit_value > 0
      ? `Benefit Value: ₹${scheme.benefit_value.toLocaleString("en-IN")}`
      : null,
    scheme.ministry    ? `Ministry: ${scheme.ministry}` : null,
    (scheme.states ?? []).length > 0
      ? `Applicable States: ${scheme.states!.join(", ")}`
      : null,
    (scheme.tags ?? []).length > 0
      ? `Tags: ${scheme.tags!.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const userMsg = `USER PROFILE:\n${profileSummary(profile)}\n\nSCHEME:\n${schemeText}\n\nEvaluate this user's eligibility for the scheme above.`;

  try {
    const { content, tokensUsed } = await callNebius({
      model:       MODELS.DEEPSEEK,
      messages:    [
        { role: "system", content: ELIGIBILITY_SYSTEM },
        { role: "user",   content: userMsg },
      ],
      temperature: 0.1,
      maxTokens:   4096,
      topP:        0.85,
      jsonMode:    true,
    });

    const cleaned   = cleanJson(content);
    const parsed    = JSON.parse(cleaned);
    const validated = EligibilityResultSchema.safeParse(parsed);

    if (!validated.success) {
      return {
        success: false,
        error:   `Validation: ${validated.error.issues.map((i) => i.message).join("; ")}`,
        model:   MODELS.DEEPSEEK,
        rawResponse: content,
      };
    }

    return {
      success:    true,
      data:       validated.data,
      model:      MODELS.DEEPSEEK,
      tokensUsed,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error:   err instanceof Error ? err.message : String(err),
      model:   MODELS.DEEPSEEK,
    };
  }
}

// ============================================================
// Batch eligibility evaluation
// Evaluates multiple schemes in parallel (up to 5 at a time).
// ============================================================

export async function evaluateEligibilityBatch(
  profile: UserProfile,
  schemes: GovernmentScheme[],
  concurrency: number = 5
): Promise<Array<NebiusResult<EligibilityOutput>>> {
  const results: Array<NebiusResult<EligibilityOutput>> = [];

  for (let i = 0; i < schemes.length; i += concurrency) {
    const batch = schemes.slice(i, i + concurrency);

    const batchResults = await Promise.all(
      batch.map((scheme) => evaluateEligibility(profile, scheme))
    );

    results.push(...batchResults);

    // Avoid rate limiting between batches
    if (i + concurrency < schemes.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return results;
}

// ============================================================
// Export model names for reference
// ============================================================
export { MODELS };

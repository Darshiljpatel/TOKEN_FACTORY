// ============================================================
// SchemeSathi — Eligibility Checker Service
// Uses Nebius AI to determine a user's eligibility for
// government schemes with conservative, evidence-based reasoning.
// ============================================================

import { z } from "zod";
import type { UserProfile, GovernmentScheme } from "../types";

// ============================================================
// Zod schemas
// ============================================================

export const EligibilityStatus = z.enum([
  "Eligible",
  "Possibly Eligible",
  "Not Eligible",
]);

export const SingleEligibilitySchema = z.object({
  scheme_name: z.string().min(1),
  status: EligibilityStatus,
  confidence: z.number().int().min(0).max(100),
  reason: z.string().min(5),
  benefits_summary: z.string().min(3),
});

export const BatchEligibilitySchema = z.object({
  results: z.array(SingleEligibilitySchema).min(1),
});

export type EligibilityVerdict = z.infer<typeof SingleEligibilitySchema>;
export type BatchEligibility = z.infer<typeof BatchEligibilitySchema>;

// ============================================================
// Result types
// ============================================================

export interface EligibilityCheckSuccess {
  success: true;
  results: EligibilityVerdict[];
  summary: {
    eligible: number;
    possiblyEligible: number;
    notEligible: number;
    totalSchemes: number;
    averageConfidence: number;
  };
}

export interface EligibilityCheckFailure {
  success: false;
  error: string;
  rawResponse?: string;
}

export type EligibilityCheckResult = EligibilityCheckSuccess | EligibilityCheckFailure;

// ============================================================
// System prompt
// ============================================================

const SYSTEM_PROMPT = `You are an Indian Government Welfare Expert with deep knowledge of central and state government schemes, subsidies, grants, and benefits.

Your task is to determine a user's eligibility for government schemes based STRICTLY on the information provided.

CLASSIFICATION:
- "Eligible": The user clearly meets all stated eligibility criteria.
- "Possibly Eligible": The user appears to meet some criteria but there is insufficient information to confirm full eligibility, OR the scheme has additional conditions not fully verifiable from the profile alone.
- "Not Eligible": The user clearly does NOT meet one or more stated eligibility criteria.

RULES:
1. Be CONSERVATIVE. When in doubt, classify as "Possibly Eligible" rather than "Eligible".
2. NEVER invent eligibility requirements that are not stated in the scheme information.
3. Use ONLY the provided user profile and scheme information. Do not assume or infer unstated facts.
4. Confidence score (0–100) should reflect how certain you are about the classification:
   - 90–100: All criteria clearly match or clearly don't match.
   - 70–89: Most criteria match but minor ambiguity exists.
   - 50–69: Significant ambiguity or missing information.
   - 0–49: Very uncertain, limited data.
5. "reason" must cite SPECIFIC criteria from the scheme and how the user's profile matches or doesn't match.
6. "benefits_summary" should concisely state what the user would receive if eligible.
7. Check these dimensions in order: state, occupation, income, age, gender, social category, education, business type.
8. Return ONLY valid JSON. No markdown, no explanations, no code fences.

OUTPUT FORMAT for multiple schemes:
{
  "results": [
    {
      "scheme_name": "...",
      "status": "Eligible" | "Possibly Eligible" | "Not Eligible",
      "confidence": 0-100,
      "reason": "...",
      "benefits_summary": "..."
    }
  ]
}

OUTPUT FORMAT for a single scheme:
{
  "results": [
    {
      "scheme_name": "...",
      "status": "...",
      "confidence": 0-100,
      "reason": "...",
      "benefits_summary": "..."
    }
  ]
}`;

// ============================================================
// Helpers
// ============================================================

function profileToText(profile: UserProfile): string {
  const lines: string[] = [
    `Age: ${profile.age} years`,
    `Gender: ${profile.gender}`,
    `State: ${profile.state}`,
    `Occupation: ${profile.occupation}`,
    `Annual Income: ₹${profile.income.toLocaleString("en-IN")}`,
    `Social Category: ${profile.category}`,
    `Education Level: ${profile.education}`,
    `Business Type: ${profile.business_type}`,
  ];

  if (profile.turnover > 0) {
    lines.push(`Annual Turnover: ₹${profile.turnover.toLocaleString("en-IN")}`);
  }

  if (profile.land_holding > 0) {
    lines.push(`Land Holding: ${profile.land_holding} acres`);
  }

  return lines.join("\n");
}

function schemeToText(scheme: GovernmentScheme): string {
  const parts: string[] = [
    `Scheme Name: ${scheme.scheme_name}`,
  ];

  if (scheme.category) parts.push(`Category: ${scheme.category}`);
  if (scheme.description) parts.push(`Description: ${scheme.description}`);
  if (scheme.eligibility) parts.push(`Eligibility: ${scheme.eligibility}`);
  if (scheme.benefits) parts.push(`Benefits: ${scheme.benefits}`);
  if (scheme.benefit_value > 0) {
    parts.push(`Benefit Value: ₹${scheme.benefit_value.toLocaleString("en-IN")}`);
  }
  if (scheme.ministry) parts.push(`Ministry: ${scheme.ministry}`);
  if (scheme.states && scheme.states.length > 0) {
    parts.push(`Applicable States: ${scheme.states.join(", ")}`);
  }
  if (scheme.tags && scheme.tags.length > 0) {
    parts.push(`Tags: ${scheme.tags.join(", ")}`);
  }

  return parts.join("\n");
}

function schemesToText(schemes: GovernmentScheme[]): string {
  return schemes
    .map((s, i) => `--- SCHEME ${i + 1} ---\n${schemeToText(s)}`)
    .join("\n\n");
}

// ============================================================
// Nebius API call
// ============================================================

import { callNebius, MODELS } from "../lib/nebiusClient";

async function callNebiusAPI(prompt: string): Promise<string> {
  const { content } = await callNebius({
    model: MODELS.DEEPSEEK,
    messages: [
      { role: "user", content: prompt },
    ],
    temperature: 0.1,
    maxTokens: 4096,
    jsonMode: true,
  });
  return content;
}

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
// Rule-based fallback eligibility check
// ============================================================

function ruleFallback(
  profile: UserProfile,
  scheme: GovernmentScheme
): EligibilityVerdict {
  let status: "Eligible" | "Possibly Eligible" | "Not Eligible" = "Possibly Eligible";
  let confidence = 50;
  const reasons: string[] = [];

  // State check
  const states = (scheme.states ?? []).map((s) => s.toLowerCase());
  if (states.length > 0) {
    const userState = profile.state.toLowerCase();
    if (states.includes(userState) || states.includes("all india")) {
      reasons.push(`State "${profile.state}" is covered by this scheme.`);
      confidence += 10;
    } else {
      status = "Not Eligible";
      confidence = 85;
      reasons.push(
        `Scheme is limited to ${scheme.states?.join(", ")} — user is from ${profile.state}.`
      );
    }
  }

  // Occupation keyword check
  if (status !== "Not Eligible" && scheme.eligibility) {
    const eligLower = scheme.eligibility.toLowerCase();
    const occLower = profile.occupation.toLowerCase();

    if (eligLower.includes(occLower) || eligLower.includes("all")) {
      reasons.push(`Occupation "${profile.occupation}" appears to match eligibility criteria.`);
      confidence += 10;
    }
  }

  // Category keyword check
  if (status !== "Not Eligible" && scheme.eligibility) {
    const eligLower = scheme.eligibility.toLowerCase();
    const catLower = profile.category.toLowerCase();

    if (catLower !== "general" && eligLower.includes(catLower)) {
      reasons.push(`Social category "${profile.category}" is mentioned in eligibility.`);
      confidence += 5;
    }
  }

  // Income check (if eligibility mentions income)
  if (status !== "Not Eligible" && scheme.eligibility) {
    const incomeMatch = scheme.eligibility.match(/₹?\s*([\d,.]+)\s*(?:lakh|lac)/i);
    if (incomeMatch) {
      const thresholdLakh = parseFloat(incomeMatch[1].replace(/,/g, ""));
      const thresholdINR = thresholdLakh * 100_000;

      if (profile.income <= thresholdINR) {
        reasons.push(
          `Income ₹${profile.income.toLocaleString("en-IN")} is within the ₹${thresholdLakh} lakh limit.`
        );
        confidence += 10;
      } else {
        status = "Not Eligible";
        confidence = 80;
        reasons.push(
          `Income ₹${profile.income.toLocaleString("en-IN")} exceeds the ₹${thresholdLakh} lakh limit.`
        );
      }
    }
  }

  // Clamp confidence
  confidence = Math.min(confidence, 100);

  // If enough positive signals, upgrade to Eligible
  if (status === "Possibly Eligible" && confidence >= 75) {
    status = "Eligible";
  }

  return {
    scheme_name: scheme.scheme_name,
    status,
    confidence,
    reason: reasons.length > 0
      ? reasons.join(" ")
      : "Insufficient information to make a definitive determination.",
    benefits_summary: scheme.benefits ?? `Benefit value: ₹${(scheme.benefit_value ?? 0).toLocaleString("en-IN")}`,
  };
}

// ============================================================
// Main Service
// ============================================================

export class EligibilityCheckerService {
  /**
   * Checks eligibility for a single scheme using Nebius AI.
   *
   * @param profile - User's profile
   * @param scheme  - Scheme to check
   * @returns Eligibility verdict with confidence and reasoning
   */
  static async checkSingle(
    profile: UserProfile,
    scheme: GovernmentScheme
  ): Promise<EligibilityCheckResult> {
    return EligibilityCheckerService.checkMultiple(profile, [scheme]);
  }

  /**
   * Checks eligibility for multiple schemes in a single AI call.
   * Falls back to rule-based checking if AI fails.
   *
   * @param profile - User's profile
   * @param schemes - Array of schemes to check
   * @returns Array of eligibility verdicts with summary stats
   */
  static async checkMultiple(
    profile: UserProfile,
    schemes: GovernmentScheme[]
  ): Promise<EligibilityCheckResult> {
    if (schemes.length === 0) {
      return {
        success: true,
        results: [],
        summary: {
          eligible: 0,
          possiblyEligible: 0,
          notEligible: 0,
          totalSchemes: 0,
          averageConfidence: 0,
        },
      };
    }

    try {
      // Build prompt
      const prompt = [
        SYSTEM_PROMPT,
        "\n---\n",
        "USER PROFILE:",
        profileToText(profile),
        "\n---\n",
        "SCHEMES TO EVALUATE:",
        schemesToText(schemes),
      ].join("\n");

      // Call Nebius
      const rawResponse = await callNebiusAPI(prompt);
      const cleanedJson = cleanJsonResponse(rawResponse);

      let parsed: unknown;
      try {
        parsed = JSON.parse(cleanedJson);
      } catch {
        console.warn("AI returned invalid JSON, using rule-based fallback");
        return EligibilityCheckerService.buildSuccessResult(
          schemes.map((s) => ruleFallback(profile, s))
        );
      }

      // Handle single-result edge case
      if (parsed && typeof parsed === "object" && !("results" in (parsed as Record<string, unknown>))) {
        const singleValidation = SingleEligibilitySchema.safeParse(parsed);
        if (singleValidation.success) {
          return EligibilityCheckerService.buildSuccessResult([singleValidation.data]);
        }
      }

      const validation = BatchEligibilitySchema.safeParse(parsed);

      if (!validation.success) {
        console.warn("AI response failed Zod validation, using fallback");
        return EligibilityCheckerService.buildSuccessResult(
          schemes.map((s) => ruleFallback(profile, s))
        );
      }

      return EligibilityCheckerService.buildSuccessResult(validation.data.results);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("AI eligibility check failed:", message, "— using fallback");

      return EligibilityCheckerService.buildSuccessResult(
        schemes.map((s) => ruleFallback(profile, s))
      );
    }
  }

  /**
   * Rule-based eligibility check (no AI call).
   * Faster but less nuanced than AI-powered check.
   */
  static checkWithRules(
    profile: UserProfile,
    schemes: GovernmentScheme[]
  ): EligibilityCheckResult {
    const results = schemes.map((s) => ruleFallback(profile, s));
    return EligibilityCheckerService.buildSuccessResult(results);
  }

  /**
   * Filters results by status.
   */
  static filterByStatus(
    results: EligibilityVerdict[],
    status: "Eligible" | "Possibly Eligible" | "Not Eligible"
  ): EligibilityVerdict[] {
    return results.filter((r) => r.status === status);
  }

  /**
   * Returns only schemes the user is eligible or possibly eligible for,
   * sorted by confidence (highest first).
   */
  static getActionableSchemes(results: EligibilityVerdict[]): EligibilityVerdict[] {
    return results
      .filter((r) => r.status !== "Not Eligible")
      .sort((a, b) => b.confidence - a.confidence);
  }

  // ---- Internal helpers ------------------------------------

  private static buildSuccessResult(
    results: EligibilityVerdict[]
  ): EligibilityCheckSuccess {
    const eligible = results.filter((r) => r.status === "Eligible").length;
    const possiblyEligible = results.filter((r) => r.status === "Possibly Eligible").length;
    const notEligible = results.filter((r) => r.status === "Not Eligible").length;

    const avgConfidence =
      results.length > 0
        ? Math.round(
            results.reduce((sum, r) => sum + r.confidence, 0) / results.length
          )
        : 0;

    return {
      success: true,
      results,
      summary: {
        eligible,
        possiblyEligible,
        notEligible,
        totalSchemes: results.length,
        averageConfidence: avgConfidence,
      },
    };
  }
}

export default EligibilityCheckerService;

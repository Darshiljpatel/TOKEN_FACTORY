// ============================================================
// SchemeSathi — Profile Extraction Service
// Uses Nebius AI to extract structured UserProfile data
// from natural language text input.
// ============================================================

import { z } from "zod";
import type { UserProfile } from "../types";

// ============================================================
// Zod schema for extracted profile (nullable fields)
// ============================================================

export const ExtractedProfileSchema = z.object({
  age: z.number().int().min(0).max(150).nullable(),
  gender: z
    .enum(["Male", "Female", "Transgender", "Other"])
    .nullable(),
  state: z.string().nullable(),
  occupation: z
    .enum([
      "Student", "Farmer", "Self-Employed", "Salaried",
      "Business Owner", "Daily Wage Worker", "Unemployed",
      "Homemaker", "Retired",
    ])
    .nullable(),
  income: z.number().nonnegative().nullable(),
  category: z
    .enum(["General", "OBC", "SC", "ST", "EWS", "Minority"])
    .nullable(),
  education: z
    .enum([
      "No Formal Education", "Below 10th", "10th Pass",
      "12th Pass", "Diploma", "Graduate", "Post Graduate",
      "Doctorate",
    ])
    .nullable(),
  business_type: z
    .enum(["Micro", "Small", "Medium", "Large", "Startup", "None"])
    .nullable(),
  turnover: z.number().nonnegative().nullable(),
  land_holding: z.number().nonnegative().nullable(),
});

export type ExtractedProfile = z.infer<typeof ExtractedProfileSchema>;

// ============================================================
// Result types
// ============================================================

export interface ExtractionSuccess {
  success: true;
  profile: ExtractedProfile;
  confidence: number;         // 0–100
  missingFields: string[];
}

export interface ExtractionFailure {
  success: false;
  error: string;
  rawResponse?: string;
}

export type ExtractionResult = ExtractionSuccess | ExtractionFailure;

// ============================================================
// System prompt
// ============================================================

const SYSTEM_PROMPT = `You are an Indian government benefits expert. Your job is to extract user demographic and economic information from natural language text.

Extract the following fields from the user's text. Return ONLY valid JSON — no markdown, no explanations, no code fences.

Schema:
{
  "age": number | null,
  "gender": "Male" | "Female" | "Transgender" | "Other" | null,
  "state": string | null,
  "occupation": "Student" | "Farmer" | "Self-Employed" | "Salaried" | "Business Owner" | "Daily Wage Worker" | "Unemployed" | "Homemaker" | "Retired" | null,
  "income": number | null,
  "category": "General" | "OBC" | "SC" | "ST" | "EWS" | "Minority" | null,
  "education": "No Formal Education" | "Below 10th" | "10th Pass" | "12th Pass" | "Diploma" | "Graduate" | "Post Graduate" | "Doctorate" | null,
  "business_type": "Micro" | "Small" | "Medium" | "Large" | "Startup" | "None" | null,
  "turnover": number | null,
  "land_holding": number | null
}

Rules:
1. "state" must be a valid Indian state or union territory name.
2. "income" is annual income in INR. Convert monthly to annual (×12). Convert "lakh" (×100000) and "crore" (×10000000).
3. "turnover" is annual business turnover in INR. Same conversion rules.
4. "land_holding" is in acres. Convert hectares to acres (×2.471) and bigha to acres based on context.
5. If a field is not mentioned or cannot be inferred, set it to null.
6. Do NOT guess or hallucinate values. Only extract what is explicitly stated or clearly implied.
7. For "category", recognize common terms: "general/unreserved" → "General", "OBC/other backward" → "OBC", "SC/dalit/scheduled caste" → "SC", "ST/tribal/adivasi/scheduled tribe" → "ST", "EWS/economically weaker" → "EWS", "minority/muslim/christian/sikh/buddhist/jain/parsi" → "Minority".
8. Return ONLY the JSON object. No other text.`;

// ============================================================
// Nebius API call
// ============================================================

import { callNebius, MODELS } from "../lib/nebiusClient";

async function callNebiusAPI(userText: string): Promise<string> {
  const { content } = await callNebius({
    model: MODELS.QWEN,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `User text:\n"${userText}"` },
    ],
    temperature: 0.1,
    maxTokens: 1024,
    jsonMode: true,
  });
  return content;
}

// ============================================================
// JSON cleaning
// ============================================================

function cleanJsonResponse(raw: string): string {
  let cleaned = raw.trim();

  // Strip markdown code fences if present
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*\n?/, "")
      .replace(/\n?```\s*$/, "");
  }

  // Strip leading/trailing non-JSON chars
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  return cleaned;
}

// ============================================================
// Main Service
// ============================================================

export class ProfileExtractionService {
  /**
   * Extracts a UserProfile from natural language text using
   * Nebius AI, with Zod validation on the output.
   *
   * @param userText - Natural language description of the user
   * @returns Validated extracted profile or error
   */
  static async extract(userText: string): Promise<ExtractionResult> {
    if (!userText || userText.trim().length < 5) {
      return {
        success: false,
        error: "Input text is too short for profile extraction",
      };
    }

    try {
      // 1. Call Nebius
      const rawResponse = await callNebiusAPI(userText.trim());

      // 2. Clean and parse JSON
      const cleanedJson = cleanJsonResponse(rawResponse);

      let parsed: unknown;
      try {
        parsed = JSON.parse(cleanedJson);
      } catch {
        return {
          success: false,
          error: "Failed to parse AI response as JSON",
          rawResponse,
        };
      }

      // 3. Validate with Zod
      const validation = ExtractedProfileSchema.safeParse(parsed);

      if (!validation.success) {
        return {
          success: false,
          error: `Validation failed: ${validation.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
          rawResponse,
        };
      }

      const profile = validation.data;

      // 4. Compute missing fields and confidence
      const allFields = Object.keys(ExtractedProfileSchema.shape) as (keyof ExtractedProfile)[];
      const missingFields = allFields.filter((f) => profile[f] === null);
      const filledCount = allFields.length - missingFields.length;
      const confidence = Math.round((filledCount / allFields.length) * 100);

      return {
        success: true,
        profile,
        confidence,
        missingFields,
      };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unknown error during extraction";
      return { success: false, error: message };
    }
  }

  /**
   * Extracts a profile and fills missing fields with sensible
   * defaults so the result can be used directly as a UserProfile.
   *
   * @param userText - Natural language text
   * @returns A complete UserProfile with defaults for missing fields
   */
  static async extractWithDefaults(
    userText: string
  ): Promise<{ success: true; profile: UserProfile; confidence: number; missingFields: string[] } | ExtractionFailure> {
    const result = await ProfileExtractionService.extract(userText);

    if (!result.success) return result;

    const defaults: UserProfile = {
      age: result.profile.age ?? 30,
      gender: result.profile.gender ?? "Male",
      state: (result.profile.state as UserProfile["state"]) ?? "Delhi",
      occupation: result.profile.occupation ?? "Unemployed",
      income: result.profile.income ?? 0,
      category: result.profile.category ?? "General",
      education: result.profile.education ?? "10th Pass",
      business_type: result.profile.business_type ?? "None",
      turnover: result.profile.turnover ?? 0,
      land_holding: result.profile.land_holding ?? 0,
    };

    return {
      success: true,
      profile: defaults,
      confidence: result.confidence,
      missingFields: result.missingFields,
    };
  }

  /**
   * Validates that the extracted text likely contains personal
   * profile information before spending an API call.
   */
  static isProfileText(text: string): boolean {
    const indicators = [
      "year", "old", "age", "male", "female", "woman", "man",
      "farmer", "student", "business", "employed", "work",
      "income", "salary", "earn", "lakh", "rupee",
      "state", "district", "village", "city",
      "caste", "category", "OBC", "SC", "ST", "general",
      "education", "graduate", "school", "college", "degree",
      "land", "acre", "hectare", "bigha",
    ];

    const lowerText = text.toLowerCase();
    let hits = 0;

    for (const indicator of indicators) {
      if (lowerText.includes(indicator)) hits++;
    }

    return hits >= 2;
  }
}

export default ProfileExtractionService;

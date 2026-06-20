// ============================================================
// SchemeSathi — Benefits Analysis Service
// Analyzes eligible schemes and calculates total monetary
// benefits, categorizes opportunities, and generates
// prioritized action items using Nebius AI.
// ============================================================

import { z } from "zod";
import type { UserProfile, GovernmentScheme } from "../types";
import type { EligibilityVerdict } from "./EligibilityCheckerService";

// ============================================================
// Zod schemas
// ============================================================

const OpportunitySchema = z.object({
  scheme_name: z.string(),
  category: z.enum(["Loan", "Subsidy", "Scholarship", "Insurance", "Direct Benefit", "Pension", "Other"]),
  estimated_value: z.number().nonnegative(),
  urgency: z.enum(["High", "Medium", "Low"]),
  summary: z.string(),
});

const PriorityActionSchema = z.object({
  action: z.string(),
  scheme_name: z.string(),
  deadline_info: z.string(),
  estimated_benefit: z.number().nonnegative(),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
});

const BenefitsAnalysisSchema = z.object({
  total_potential_benefit: z.number().nonnegative(),
  missed_benefits: z.number().nonnegative(),
  top_opportunities: z.array(OpportunitySchema),
  priority_actions: z.array(PriorityActionSchema),
  breakdown: z.object({
    loans: z.number().nonnegative(),
    subsidies: z.number().nonnegative(),
    scholarships: z.number().nonnegative(),
    insurance: z.number().nonnegative(),
    direct_benefits: z.number().nonnegative(),
    pensions: z.number().nonnegative(),
    other: z.number().nonnegative(),
  }),
});

export type Opportunity = z.infer<typeof OpportunitySchema>;
export type PriorityAction = z.infer<typeof PriorityActionSchema>;
export type BenefitsAnalysis = z.infer<typeof BenefitsAnalysisSchema>;

// ============================================================
// Result types
// ============================================================

export interface AnalysisSuccess {
  success: true;
  analysis: BenefitsAnalysis;
}

export interface AnalysisFailure {
  success: false;
  error: string;
  rawResponse?: string;
}

export type AnalysisResult = AnalysisSuccess | AnalysisFailure;

// ============================================================
// System prompt
// ============================================================

const SYSTEM_PROMPT = `You are a Government Benefits Advisor for India with expertise in central and state government welfare schemes.

Analyze the provided eligible and possibly-eligible schemes for a user and calculate their total potential benefits.

CATEGORIZE each scheme into one of:
- "Loan": Subsidised or collateral-free loan opportunities
- "Subsidy": Direct subsidies on purchases, services, or interest rates
- "Scholarship": Educational grants and fellowships
- "Insurance": Health, crop, life, or accident insurance coverage
- "Direct Benefit": Cash transfers (e.g., PM Kisan ₹6,000/year)
- "Pension": Retirement or old-age pension schemes
- "Other": Any scheme not fitting above categories

CALCULATE:
1. "total_potential_benefit": Sum of ALL monetary benefits the user could receive (annual value for recurring benefits, one-time value for grants/subsidies, loan amount for loans).
2. "missed_benefits": Estimated annual value of schemes the user is possibly eligible for but hasn't applied to (assume they haven't applied to any).
3. "top_opportunities": The most impactful schemes sorted by estimated_value descending. Include urgency level.
4. "priority_actions": Specific next steps the user should take, sorted by impact. Include application difficulty.
5. "breakdown": Totals by category.

RULES:
1. Be realistic with estimates. Use the benefit_value from scheme data when available.
2. For loans, use the maximum loan amount as the estimated_value.
3. For insurance, use the coverage amount as the estimated_value.
4. For recurring benefits (pension, income support), use the ANNUAL value.
5. For subsidies, use the subsidy amount (not the full price).
6. "deadline_info" should say "Open / Rolling" if no specific deadline is known. Never invent deadlines.
7. Return ONLY valid JSON. No markdown, no explanations, no code fences.

OUTPUT FORMAT:
{
  "total_potential_benefit": number,
  "missed_benefits": number,
  "top_opportunities": [
    {
      "scheme_name": "...",
      "category": "Loan" | "Subsidy" | "Scholarship" | "Insurance" | "Direct Benefit" | "Pension" | "Other",
      "estimated_value": number,
      "urgency": "High" | "Medium" | "Low",
      "summary": "..."
    }
  ],
  "priority_actions": [
    {
      "action": "...",
      "scheme_name": "...",
      "deadline_info": "...",
      "estimated_benefit": number,
      "difficulty": "Easy" | "Medium" | "Hard"
    }
  ],
  "breakdown": {
    "loans": number,
    "subsidies": number,
    "scholarships": number,
    "insurance": number,
    "direct_benefits": number,
    "pensions": number,
    "other": number
  }
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
    `Education: ${profile.education}`,
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

function verdictsToText(verdicts: EligibilityVerdict[], schemes: GovernmentScheme[]): string {
  const schemeMap = new Map(schemes.map((s) => [s.scheme_name, s]));

  return verdicts
    .map((v, i) => {
      const scheme = schemeMap.get(v.scheme_name);
      const lines = [
        `--- SCHEME ${i + 1} ---`,
        `Name: ${v.scheme_name}`,
        `Eligibility Status: ${v.status}`,
        `Confidence: ${v.confidence}%`,
        `Reason: ${v.reason}`,
        `Benefits Summary: ${v.benefits_summary}`,
      ];

      if (scheme) {
        if (scheme.category) lines.push(`Category: ${scheme.category}`);
        if (scheme.benefit_value > 0) {
          lines.push(`Benefit Value: ₹${scheme.benefit_value.toLocaleString("en-IN")}`);
        }
        if (scheme.ministry) lines.push(`Ministry: ${scheme.ministry}`);
        if (scheme.source_url) lines.push(`Source: ${scheme.source_url}`);
      }

      return lines.join("\n");
    })
    .join("\n\n");
}

// ============================================================
// Nebius API call
// ============================================================

import { callNebius, MODELS } from "../lib/nebiusClient";

async function callNebiusAPI(prompt: string): Promise<string> {
  const { content } = await callNebius({
    model: MODELS.QWEN,
    messages: [
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
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
// Rule-based fallback
// ============================================================

function categorizeScheme(scheme: GovernmentScheme, verdict: EligibilityVerdict): Opportunity["category"] {
  const text = [
    scheme.scheme_name,
    scheme.category,
    scheme.description,
    scheme.benefits,
    verdict.benefits_summary,
    ...(scheme.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (text.match(/\b(loan|mudra|credit|lending|finance)\b/)) return "Loan";
  if (text.match(/\b(scholarship|fellowship|stipend|merit|tuition)\b/)) return "Scholarship";
  if (text.match(/\b(insurance|ayushman|swasthya|health cover|pmfby|crop insurance)\b/)) return "Insurance";
  if (text.match(/\b(pension|atal pension|old age|retirement|varishtha)\b/)) return "Pension";
  if (text.match(/\b(subsidy|subsidised|rebate|concession|discount|waiver)\b/)) return "Subsidy";
  if (text.match(/\b(direct benefit|DBT|cash transfer|income support|kisan)\b/)) return "Direct Benefit";

  return "Other";
}

function buildFallbackAnalysis(
  verdicts: EligibilityVerdict[],
  schemes: GovernmentScheme[]
): BenefitsAnalysis {
  const schemeMap = new Map(schemes.map((s) => [s.scheme_name, s]));

  const actionable = verdicts.filter((v) => v.status !== "Not Eligible");

  const opportunities: Opportunity[] = actionable.map((v) => {
    const scheme = schemeMap.get(v.scheme_name);
    const value = scheme?.benefit_value ?? 0;
    const cat = scheme ? categorizeScheme(scheme, v) : "Other";

    return {
      scheme_name: v.scheme_name,
      category: cat,
      estimated_value: value,
      urgency: v.status === "Eligible" ? ("High" as const) : ("Medium" as const),
      summary: v.benefits_summary,
    };
  });

  // Sort by value descending
  opportunities.sort((a, b) => b.estimated_value - a.estimated_value);

  // Breakdown
  const breakdown = {
    loans: 0,
    subsidies: 0,
    scholarships: 0,
    insurance: 0,
    direct_benefits: 0,
    pensions: 0,
    other: 0,
  };

  const categoryKeyMap: Record<Opportunity["category"], keyof typeof breakdown> = {
    Loan: "loans",
    Subsidy: "subsidies",
    Scholarship: "scholarships",
    Insurance: "insurance",
    "Direct Benefit": "direct_benefits",
    Pension: "pensions",
    Other: "other",
  };

  for (const opp of opportunities) {
    breakdown[categoryKeyMap[opp.category]] += opp.estimated_value;
  }

  const totalBenefit = opportunities.reduce((sum, o) => sum + o.estimated_value, 0);

  const possiblyEligible = actionable.filter((v) => v.status === "Possibly Eligible");
  const missedBenefits = possiblyEligible.reduce((sum, v) => {
    const scheme = schemeMap.get(v.scheme_name);
    return sum + (scheme?.benefit_value ?? 0);
  }, 0);

  // Priority actions
  const actions: PriorityAction[] = opportunities
    .slice(0, 10)
    .map((opp) => ({
      action: `Apply for ${opp.scheme_name}`,
      scheme_name: opp.scheme_name,
      deadline_info: "Open / Rolling",
      estimated_benefit: opp.estimated_value,
      difficulty: opp.estimated_value > 500000 ? ("Medium" as const) : ("Easy" as const),
    }));

  return {
    total_potential_benefit: totalBenefit,
    missed_benefits: missedBenefits,
    top_opportunities: opportunities.slice(0, 15),
    priority_actions: actions,
    breakdown,
  };
}

// ============================================================
// Main Service
// ============================================================

export class BenefitsAnalysisService {
  /**
   * Analyzes eligible schemes using Nebius AI and returns
   * a comprehensive benefits breakdown with priority actions.
   *
   * @param profile  - User's profile
   * @param verdicts - Eligibility results from EligibilityCheckerService
   * @param schemes  - Full scheme objects for context
   * @returns Benefits analysis with totals, breakdown, and actions
   */
  static async analyze(
    profile: UserProfile,
    verdicts: EligibilityVerdict[],
    schemes: GovernmentScheme[]
  ): Promise<AnalysisResult> {
    // Filter to actionable schemes only
    const actionable = verdicts.filter((v) => v.status !== "Not Eligible");

    if (actionable.length === 0) {
      return {
        success: true,
        analysis: {
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
        },
      };
    }

    try {
      const prompt = [
        SYSTEM_PROMPT,
        "\n---\n",
        "USER PROFILE:",
        profileToText(profile),
        "\n---\n",
        "ELIGIBLE / POSSIBLY ELIGIBLE SCHEMES:",
        verdictsToText(actionable, schemes),
      ].join("\n");

      const rawResponse = await callNebiusAPI(prompt);
      const cleanedJson = cleanJsonResponse(rawResponse);

      let parsed: unknown;
      try {
        parsed = JSON.parse(cleanedJson);
      } catch {
        console.warn("AI returned invalid JSON, using rule-based fallback");
        return {
          success: true,
          analysis: buildFallbackAnalysis(verdicts, schemes),
        };
      }

      const validation = BenefitsAnalysisSchema.safeParse(parsed);

      if (!validation.success) {
        console.warn("AI response failed Zod validation, using fallback");
        return {
          success: true,
          analysis: buildFallbackAnalysis(verdicts, schemes),
        };
      }

      return { success: true, analysis: validation.data };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("AI benefits analysis failed:", message, "— using fallback");

      return {
        success: true,
        analysis: buildFallbackAnalysis(verdicts, schemes),
      };
    }
  }

  /**
   * Rule-based analysis (no AI call).
   * Instant but less detailed than AI-powered analysis.
   */
  static analyzeWithRules(
    verdicts: EligibilityVerdict[],
    schemes: GovernmentScheme[]
  ): AnalysisResult {
    return {
      success: true,
      analysis: buildFallbackAnalysis(verdicts, schemes),
    };
  }

  /**
   * Formats the analysis into a human-readable text summary.
   */
  static formatSummary(analysis: BenefitsAnalysis): string {
    const lines: string[] = [
      `💰 Total Potential Benefits: ₹${analysis.total_potential_benefit.toLocaleString("en-IN")}`,
      `⚠️  Unclaimed / Missed Benefits: ₹${analysis.missed_benefits.toLocaleString("en-IN")}`,
      "",
      "📊 Breakdown:",
    ];

    const { breakdown } = analysis;
    if (breakdown.loans > 0) lines.push(`   🏦 Loans: ₹${breakdown.loans.toLocaleString("en-IN")}`);
    if (breakdown.subsidies > 0) lines.push(`   🎯 Subsidies: ₹${breakdown.subsidies.toLocaleString("en-IN")}`);
    if (breakdown.scholarships > 0) lines.push(`   🎓 Scholarships: ₹${breakdown.scholarships.toLocaleString("en-IN")}`);
    if (breakdown.insurance > 0) lines.push(`   🛡️ Insurance: ₹${breakdown.insurance.toLocaleString("en-IN")}`);
    if (breakdown.direct_benefits > 0) lines.push(`   💵 Direct Benefits: ₹${breakdown.direct_benefits.toLocaleString("en-IN")}`);
    if (breakdown.pensions > 0) lines.push(`   👴 Pensions: ₹${breakdown.pensions.toLocaleString("en-IN")}`);
    if (breakdown.other > 0) lines.push(`   📦 Other: ₹${breakdown.other.toLocaleString("en-IN")}`);

    if (analysis.top_opportunities.length > 0) {
      lines.push("", "🏆 Top Opportunities:");
      for (const opp of analysis.top_opportunities.slice(0, 5)) {
        lines.push(
          `   ${opp.urgency === "High" ? "🔴" : opp.urgency === "Medium" ? "🟡" : "🟢"} ${opp.scheme_name} — ₹${opp.estimated_value.toLocaleString("en-IN")} (${opp.category})`
        );
      }
    }

    if (analysis.priority_actions.length > 0) {
      lines.push("", "📋 Priority Actions:");
      for (const act of analysis.priority_actions.slice(0, 5)) {
        lines.push(
          `   ${act.difficulty === "Easy" ? "✅" : act.difficulty === "Medium" ? "⚡" : "🔧"} ${act.action} — ₹${act.estimated_benefit.toLocaleString("en-IN")} [${act.deadline_info}]`
        );
      }
    }

    return lines.join("\n");
  }
}

export default BenefitsAnalysisService;

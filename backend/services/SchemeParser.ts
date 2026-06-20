// ============================================================
// SchemeSathi — Government Scheme Parser
// Extracts structured scheme data from raw web page text
// and validates it with Zod.
// ============================================================

import { z } from "zod";

// ============================================================
// Zod Schema — strict validation for parsed output
// ============================================================

export const GovernmentSchemeSchema = z.object({
  scheme_name: z
    .string()
    .min(3, "Scheme name must be at least 3 characters")
    .max(300, "Scheme name is too long"),

  category: z
    .string()
    .nullable()
    .default(null),

  description: z
    .string()
    .nullable()
    .default(null),

  eligibility: z
    .string()
    .nullable()
    .default(null),

  benefits: z
    .string()
    .nullable()
    .default(null),

  benefit_value: z
    .number()
    .int()
    .nonnegative("Benefit value cannot be negative")
    .default(0),

  ministry: z
    .string()
    .nullable()
    .default(null),
});

export type ParsedScheme = z.infer<typeof GovernmentSchemeSchema>;

// ============================================================
// Result types
// ============================================================

export interface ParseSuccess {
  success: true;
  data: ParsedScheme;
}

export interface ParseFailure {
  success: false;
  errors: z.ZodIssue[];
  partial: Partial<ParsedScheme>;
}

export type ParseResult = ParseSuccess | ParseFailure;

// ============================================================
// Category detection
// ============================================================

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Agriculture: [
    "agriculture", "farmer", "kisan", "crop", "irrigation",
    "fertilizer", "soil", "harvest", "agri", "farming",
    "horticulture", "livestock", "fishery", "dairy",
  ],
  Education: [
    "scholarship", "education", "student", "school", "college",
    "university", "tuition", "fellowship", "academic", "study",
    "vidyalaya", "shiksha",
  ],
  Healthcare: [
    "health", "medical", "hospital", "ayushman", "insurance",
    "treatment", "medicine", "doctor", "swasthya", "arogya",
    "wellness", "nursing",
  ],
  Housing: [
    "housing", "awas", "home", "shelter", "construction",
    "pucca", "house", "dwelling", "PMAY", "real estate",
  ],
  "Business & Entrepreneurship": [
    "MSME", "business", "entrepreneur", "startup", "enterprise",
    "manufacturing", "industry", "Mudra", "loan", "SME",
    "Udyam", "CGTMSE", "commercial",
  ],
  "Women & Child Development": [
    "women", "mahila", "girl", "beti", "sukanya",
    "maternity", "child", "anganwadi", "ICDS", "nari",
    "stree", "female empowerment",
  ],
  "Social Welfare": [
    "pension", "welfare", "disability", "disabled", "widow",
    "senior citizen", "old age", "BPL", "poverty", "ration",
    "Antyodaya", "destitute",
  ],
  Employment: [
    "employment", "job", "skill", "training", "vocational",
    "PMKVY", "rozgar", "placement", "apprenticeship", "labour",
    "MGNREGA", "workforce",
  ],
  "Financial Inclusion": [
    "Jan Dhan", "bank account", "financial inclusion",
    "DBT", "direct benefit", "digital payment", "savings",
    "insurance", "provident fund", "PPF",
  ],
};

function detectCategory(text: string): string | null {
  const lowerText = text.toLowerCase();
  let bestCategory: string | null = null;
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        score++;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestScore >= 1 ? bestCategory : null;
}

// ============================================================
// Ministry detection
// ============================================================

const KNOWN_MINISTRIES: string[] = [
  "Ministry of Agriculture & Farmers Welfare",
  "Ministry of Rural Development",
  "Ministry of Health and Family Welfare",
  "Ministry of Housing and Urban Affairs",
  "Ministry of Education",
  "Ministry of Finance",
  "Ministry of Women and Child Development",
  "Ministry of Social Justice and Empowerment",
  "Ministry of Labour and Employment",
  "Ministry of Micro, Small and Medium Enterprises",
  "Ministry of Skill Development and Entrepreneurship",
  "Ministry of Science and Technology",
  "Ministry of Electronics and Information Technology",
  "Ministry of Commerce and Industry",
  "Ministry of Tribal Affairs",
  "Ministry of Minority Affairs",
  "Ministry of Youth Affairs and Sports",
  "Ministry of Food Processing Industries",
  "Ministry of Textiles",
  "Ministry of Power",
  "Ministry of New and Renewable Energy",
  "Ministry of Petroleum and Natural Gas",
  "Ministry of Environment, Forest and Climate Change",
  "Ministry of Jal Shakti",
  "Ministry of Consumer Affairs, Food and Public Distribution",
  "NITI Aayog",
];

function detectMinistry(text: string): string | null {
  const lowerText = text.toLowerCase();

  // Direct match against known ministries
  for (const ministry of KNOWN_MINISTRIES) {
    if (lowerText.includes(ministry.toLowerCase())) {
      return ministry;
    }
  }

  // Regex for "Ministry of ..." pattern
  const ministryRegex = /ministry\s+of\s+[A-Za-z,&\s]+(?:and\s+[A-Za-z\s]+)?/gi;
  const matches = text.match(ministryRegex);
  if (matches && matches.length > 0) {
    // Clean up and return the first match
    return matches[0]
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120);
  }

  // Regex for "Department of ..."
  const deptRegex = /department\s+of\s+[A-Za-z,&\s]+/gi;
  const deptMatches = text.match(deptRegex);
  if (deptMatches && deptMatches.length > 0) {
    return deptMatches[0]
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120);
  }

  return null;
}

// ============================================================
// Benefit value extraction (₹ amounts)
// ============================================================

function extractBenefitValue(text: string): number {
  // Match patterns like ₹5,00,000 or Rs. 2.67 lakh or ₹6000 or Rs 10 crore
  const patterns: Array<{ regex: RegExp; multiplier: (match: RegExpMatchArray) => number }> = [
    // ₹X crore / Rs X crore
    {
      regex: /(?:₹|rs\.?|inr)\s*([\d,.]+)\s*(?:crore|cr)/gi,
      multiplier: (m) => parseIndianNumber(m[1]) * 10_000_000,
    },
    // ₹X lakh / Rs X lakh
    {
      regex: /(?:₹|rs\.?|inr)\s*([\d,.]+)\s*(?:lakh|lac|lakhs)/gi,
      multiplier: (m) => parseIndianNumber(m[1]) * 100_000,
    },
    // ₹X,XX,XXX or ₹XXXXX (plain amounts)
    {
      regex: /(?:₹|rs\.?|inr)\s*([\d,]+)/gi,
      multiplier: (m) => parseIndianNumber(m[1]),
    },
    // "X lakh" without currency symbol
    {
      regex: /([\d,.]+)\s*(?:lakh|lac|lakhs)\s*(?:rupees?)?/gi,
      multiplier: (m) => parseIndianNumber(m[1]) * 100_000,
    },
    // "X crore" without currency symbol
    {
      regex: /([\d,.]+)\s*(?:crore|cr)\s*(?:rupees?)?/gi,
      multiplier: (m) => parseIndianNumber(m[1]) * 10_000_000,
    },
  ];

  let maxValue = 0;

  for (const { regex, multiplier } of patterns) {
    let match: RegExpExecArray | null;
    // Reset regex state
    regex.lastIndex = 0;
    while ((match = regex.exec(text)) !== null) {
      const value = multiplier(match);
      if (value > maxValue && value <= 100_000_000_000) {
        // Cap at ₹1000 crore to avoid garbage
        maxValue = value;
      }
    }
  }

  return Math.round(maxValue);
}

function parseIndianNumber(raw: string): number {
  // Remove commas and parse
  const cleaned = raw.replace(/,/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

// ============================================================
// Section extraction (eligibility, benefits, description)
// ============================================================

const SECTION_PATTERNS: Record<string, RegExp[]> = {
  eligibility: [
    /(?:eligibility|who\s+(?:can|is)\s+eligible|eligible\s+(?:candidates?|persons?|beneficiar(?:y|ies))|qualification\s+criteria|criteria\s+for\s+selection)[:\-\s]*\n?([\s\S]{20,1500}?)(?=\n\s*(?:[A-Z][a-z]+\s+[A-Z]|benefits|how\s+to\s+apply|documents?\s+required|features|application|contact|website|note|disclaimer|important|\d+\.\s+[A-Z])|\n{2,}|$)/gi,
    /(?:who\s+is\s+eligible|eligibility\s+criteria?)[:\-\s]*([\s\S]{20,1500}?)(?:\n{2,}|$)/gi,
  ],
  benefits: [
    /(?:benefits?|key\s+(?:benefits|features)|scheme\s+benefits|advantages|what\s+you\s+(?:get|receive)|financial\s+(?:assistance|support|benefit))[:\-\s]*\n?([\s\S]{20,1500}?)(?=\n\s*(?:[A-Z][a-z]+\s+[A-Z]|eligibility|how\s+to\s+apply|documents?\s+required|application|contact|website|note|disclaimer|important|\d+\.\s+[A-Z])|\n{2,}|$)/gi,
    /(?:amount|subsidy|grant|loan\s+amount)[:\-\s]*([\s\S]{20,800}?)(?:\n{2,}|$)/gi,
  ],
  description: [
    /(?:about\s+(?:the\s+)?scheme|scheme\s+(?:details|description|overview)|introduction|objective|overview)[:\-\s]*\n?([\s\S]{20,2000}?)(?=\n\s*(?:[A-Z][a-z]+\s+[A-Z]|eligibility|benefits|how\s+to\s+apply|features|key\s+features)|\n{2,}|$)/gi,
  ],
};

function extractSection(text: string, sectionKey: string): string | null {
  const patterns = SECTION_PATTERNS[sectionKey];
  if (!patterns) return null;

  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    const match = pattern.exec(text);
    if (match && match[1]) {
      const cleaned = match[1]
        .replace(/\s+/g, " ")
        .trim();
      if (cleaned.length >= 15) {
        return cleaned;
      }
    }
  }

  return null;
}

// ============================================================
// Scheme name extraction
// ============================================================

function extractSchemeName(text: string): string | null {
  // Try common patterns for scheme/yojana names
  const namePatterns: RegExp[] = [
    // "Pradhan Mantri ... Yojana" or "PM ... Scheme"
    /(?:Pradhan\s+Mantri|PM)\s+[\w\s]+(?:Yojana|Scheme|Nidhi|Abhiyan|Mission)/gi,
    // "... Yojana" or "... Scheme"
    /(?:[A-Z][\w]*\s+){1,6}(?:Yojana|Scheme|Abhiyan|Mission|Nidhi|Programme|Program)/gi,
    // Title-like pattern at the start: first line with >3 words
    /^[\s]*([A-Z][\w\s\-()]{10,120})$/m,
  ];

  for (const pattern of namePatterns) {
    pattern.lastIndex = 0;
    const match = pattern.exec(text);
    if (match) {
      const name = (match[1] ?? match[0])
        .replace(/\s+/g, " ")
        .trim();
      if (name.length >= 5 && name.length <= 200) {
        return name;
      }
    }
  }

  // Fallback: first non-empty line that looks like a title
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 5)) {
    if (line.length >= 5 && line.length <= 200 && /^[A-Z]/.test(line)) {
      return line;
    }
  }

  return null;
}

// ============================================================
// Main Parser Class
// ============================================================

export class SchemeParser {
  /**
   * Parses raw web page text and extracts a structured
   * GovernmentScheme object, validated by Zod.
   *
   * @param rawText - Raw text content from a web page
   * @returns ParseResult with validated data or Zod errors
   */
  static parse(rawText: string): ParseResult {
    if (!rawText || rawText.trim().length < 20) {
      return {
        success: false,
        errors: [
          {
            code: "too_small",
            minimum: 20,
            type: "string",
            inclusive: true,
            exact: false,
            message: "Input text is too short to extract scheme data",
            path: ["rawText"],
          },
        ],
        partial: {},
      };
    }

    const text = rawText.trim();

    // Extract raw fields
    const rawScheme = {
      scheme_name: extractSchemeName(text),
      category: detectCategory(text),
      description: extractSection(text, "description"),
      eligibility: extractSection(text, "eligibility"),
      benefits: extractSection(text, "benefits"),
      benefit_value: extractBenefitValue(text),
      ministry: detectMinistry(text),
    };

    // If no description was extracted via section headers, use first ~500 chars
    if (!rawScheme.description) {
      const fallbackDesc = text
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 30)
        .slice(0, 3)
        .join(" ")
        .slice(0, 500);

      if (fallbackDesc.length >= 30) {
        rawScheme.description = fallbackDesc;
      }
    }

    // Validate with Zod
    const result = GovernmentSchemeSchema.safeParse(rawScheme);

    if (result.success) {
      return { success: true, data: result.data };
    }

    return {
      success: false,
      errors: result.error.issues,
      partial: rawScheme as Partial<ParsedScheme>,
    };
  }

  /**
   * Parses multiple schemes from text that contains several
   * scheme descriptions separated by common delimiters.
   *
   * @param rawText - Raw text with multiple scheme descriptions
   * @returns Array of ParseResult objects
   */
  static parseMultiple(rawText: string): ParseResult[] {
    // Split on common delimiters
    const delimiters = [
      /\n-{3,}\n/,          // ---
      /\n={3,}\n/,          // ===
      /\n\*{3,}\n/,         // ***
      /\n#{1,3}\s+/,        // Markdown headers
      /\n(?=\d+\.\s+[A-Z])/ // Numbered list items
    ];

    let sections = [rawText];

    for (const delimiter of delimiters) {
      if (sections.length <= 1) {
        const split = rawText.split(delimiter).filter((s) => s.trim().length > 50);
        if (split.length > 1) {
          sections = split;
          break;
        }
      }
    }

    return sections.map((section) => SchemeParser.parse(section));
  }

  /**
   * Quick validation check — tests if text likely contains
   * government scheme data before running full extraction.
   *
   * @param rawText - Raw text to check
   * @returns true if text likely contains scheme information
   */
  static isSchemeContent(rawText: string): boolean {
    const indicators = [
      "scheme", "yojana", "government", "ministry", "subsidy",
      "eligibility", "beneficiary", "benefits", "welfare",
      "pradhan mantri", "central government", "state government",
      "abhiyan", "mission", "nidhi",
    ];

    const lowerText = rawText.toLowerCase();
    let matchCount = 0;

    for (const indicator of indicators) {
      if (lowerText.includes(indicator)) {
        matchCount++;
      }
    }

    return matchCount >= 2;
  }
}

export default SchemeParser;

import { CitizenProfile, ProfileCategory } from "@/types/profile";

/**
 * The default sample profile used to seed the experience / for reference.
 * Mirrors the example given in the project brief.
 */
export const sampleProfile: CitizenProfile = {
  rawText:
    "I am a second-year engineering student from Karnataka. My family income is around ₹3 lakh. I belong to OBC category.",
  category: "student",
  categoryLabel: "Student",
  state: "Karnataka",
  socialCategory: "OBC",
  income: 300000,
};

const STATE_KEYWORDS: Record<string, string> = {
  karnataka: "Karnataka",
  maharashtra: "Maharashtra",
  "tamil nadu": "Tamil Nadu",
  telangana: "Telangana",
  "andhra pradesh": "Andhra Pradesh",
  kerala: "Kerala",
  gujarat: "Gujarat",
  rajasthan: "Rajasthan",
  punjab: "Punjab",
  bihar: "Bihar",
  "uttar pradesh": "Uttar Pradesh",
  "west bengal": "West Bengal",
  odisha: "Odisha",
  delhi: "Delhi",
  haryana: "Haryana",
  "madhya pradesh": "Madhya Pradesh",
};

const SOCIAL_CATEGORY_KEYWORDS = ["obc", "sc", "st", "general", "ews"];

const CATEGORY_LABELS: Record<ProfileCategory, string> = {
  student: "Student",
  farmer: "Farmer",
  business: "Small Business Owner",
  senior: "Senior Citizen",
  general: "Citizen",
};

function detectCategory(text: string): ProfileCategory {
  const t = text.toLowerCase();
  if (/(student|college|university|engineering|school|scholarship|studying)/.test(t)) {
    return "student";
  }
  if (/(farmer|farming|crop|agricult|land|kisan|harvest)/.test(t)) {
    return "farmer";
  }
  if (/(business|shop|enterprise|startup|self-employed|trader|entrepreneur|vendor)/.test(t)) {
    return "business";
  }
  if (/(senior citizen|retired|pension|elderly|60 years|65 years|old age)/.test(t)) {
    return "senior";
  }
  return "general";
}

function detectIncome(text: string): number | undefined {
  // Looks for patterns like "₹3 lakh", "3 lakhs", "300000", "3,00,000"
  const lakhMatch = text.match(/₹?\s*(\d+(\.\d+)?)\s*lakh/i);
  if (lakhMatch) {
    return Math.round(parseFloat(lakhMatch[1]) * 100000);
  }
  const numberMatch = text.match(/₹\s*([\d,]{4,})/);
  if (numberMatch) {
    return parseInt(numberMatch[1].replace(/,/g, ""), 10);
  }
  return undefined;
}

function detectState(text: string): string {
  const t = text.toLowerCase();
  for (const key of Object.keys(STATE_KEYWORDS)) {
    if (t.includes(key)) return STATE_KEYWORDS[key];
  }
  return "India";
}

function detectSocialCategory(text: string): string | undefined {
  const t = text.toLowerCase();
  for (const key of SOCIAL_CATEGORY_KEYWORDS) {
    if (new RegExp(`\\b${key}\\b`).test(t)) return key.toUpperCase();
  }
  return undefined;
}

/**
 * Turns whatever the person typed (or a demo profile) into a lightweight
 * structured profile. This is a friendly, rule-based stand-in for a real
 * matching engine, kept intentionally simple on the frontend.
 */
export function interpretProfile(rawText: string): CitizenProfile {
  const category = detectCategory(rawText);
  return {
    rawText,
    category,
    categoryLabel: CATEGORY_LABELS[category],
    state: detectState(rawText),
    socialCategory: detectSocialCategory(rawText),
    income: detectIncome(rawText),
  };
}

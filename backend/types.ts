// ============================================================
// SchemeSathi — TypeScript Interfaces
// Strict typing for all core data models
// ============================================================

/** Supported Indian states / UTs */
export type IndianState =
  | "Andhra Pradesh"
  | "Arunachal Pradesh"
  | "Assam"
  | "Bihar"
  | "Chhattisgarh"
  | "Goa"
  | "Gujarat"
  | "Haryana"
  | "Himachal Pradesh"
  | "Jharkhand"
  | "Karnataka"
  | "Kerala"
  | "Madhya Pradesh"
  | "Maharashtra"
  | "Manipur"
  | "Meghalaya"
  | "Mizoram"
  | "Nagaland"
  | "Odisha"
  | "Punjab"
  | "Rajasthan"
  | "Sikkim"
  | "Tamil Nadu"
  | "Telangana"
  | "Tripura"
  | "Uttar Pradesh"
  | "Uttarakhand"
  | "West Bengal"
  | "Andaman and Nicobar Islands"
  | "Chandigarh"
  | "Dadra and Nagar Haveli and Daman and Diu"
  | "Delhi"
  | "Jammu and Kashmir"
  | "Ladakh"
  | "Lakshadweep"
  | "Puducherry"
  | "All India";

export type Gender = "Male" | "Female" | "Transgender" | "Other";

export type SocialCategory = "General" | "OBC" | "SC" | "ST" | "EWS" | "Minority";

export type EducationLevel =
  | "No Formal Education"
  | "Below 10th"
  | "10th Pass"
  | "12th Pass"
  | "Diploma"
  | "Graduate"
  | "Post Graduate"
  | "Doctorate";

export type OccupationType =
  | "Student"
  | "Farmer"
  | "Self-Employed"
  | "Salaried"
  | "Business Owner"
  | "Daily Wage Worker"
  | "Unemployed"
  | "Homemaker"
  | "Retired";

export type BusinessType =
  | "Micro"
  | "Small"
  | "Medium"
  | "Large"
  | "Startup"
  | "None";

// ============================================================
// 1. UserProfile
// ============================================================

export interface UserProfile {
  age: number;
  gender: Gender;
  state: IndianState;
  occupation: OccupationType;
  income: number;
  category: SocialCategory;
  education: EducationLevel;
  business_type: BusinessType;
  turnover: number;
  land_holding: number; // in acres
}

// ============================================================
// 2. GovernmentScheme (mirrors Supabase `scheme_cache` table)
// ============================================================

export interface GovernmentScheme {
  id: string;
  scheme_name: string;
  category: string | null;
  description: string | null;
  eligibility: string | null;
  benefits: string | null;
  benefit_value: number;
  source_url: string | null;
  states: string[];
  tags: string[];
  ministry: string | null;
  fetched_at: string; // ISO 8601 timestamp
}

// ============================================================
// 3. EligibilityResult
// ============================================================

export interface EligibilityResult {
  scheme: GovernmentScheme;
  is_eligible: boolean;
  match_score: number; // 0–100
  matched_criteria: string[];
  unmatched_criteria: string[];
  remarks: string | null;
}

// ============================================================
// 4. GeneratedReport (mirrors Supabase `generated_reports` table)
// ============================================================

export interface GeneratedReport {
  id: string;
  profile: UserProfile;
  scheme_count: number;
  total_benefits: number;
  created_at: string; // ISO 8601 timestamp
  results?: EligibilityResult[]; // optional: full breakdown
}

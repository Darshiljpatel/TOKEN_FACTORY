export type ProfileCategory = "student" | "farmer" | "business" | "senior" | "general";

export interface CitizenProfile {
  /** The raw, free-text description the person typed in. */
  rawText: string;
  /** Best-guess category used to pick a relevant mock result set. */
  category: ProfileCategory;
  /** Friendly display name for the category, e.g. "Student" */
  categoryLabel: string;
  /** State / region, when we can detect one. */
  state: string;
  /** Social category, e.g. OBC, SC, ST, General (optional). */
  socialCategory?: string;
  /** Annual family income in rupees, when mentioned. */
  income?: number;
  /** Age group, when relevant (e.g. senior citizen profiles). */
  ageGroup?: string;
}

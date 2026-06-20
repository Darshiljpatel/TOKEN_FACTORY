export type EligibilityStatus = "eligible" | "likely-eligible" | "check-details";

export type PriorityLevel = "high" | "recommended" | "additional";

export interface Scheme {
  id: string;
  name: string;
  /** Issuing department or ministry, shown as a small caption. */
  issuedBy: string;
  benefitAmount: number;
  /** Human label for the amount, e.g. "Up to ₹50,000" for variable schemes. */
  benefitLabel?: string;
  eligibilityStatus: EligibilityStatus;
  priority: PriorityLevel;
  /** Plain-language reason this scheme matches the person, in friendly tone. */
  whyThisMatches: string;
  documentsRequired: string[];
  /** Where the person can learn more / apply. */
  officialLink: string;
}

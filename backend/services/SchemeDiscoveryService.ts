// ============================================================
// SchemeSathi — Scheme Discovery Service
// Generates intelligent search queries from a UserProfile
// to find relevant government schemes.
// ============================================================

import type {
  UserProfile,
  OccupationType,
  SocialCategory,
  EducationLevel,
  BusinessType,
} from "../types";

// ---- Query templates by occupation --------------------------

const OCCUPATION_QUERIES: Record<OccupationType, string[]> = {
  Student: [
    "government scholarship schemes India",
    "student education loan subsidy India",
    "free education schemes India",
    "merit scholarship government India",
  ],
  Farmer: [
    "farmer subsidy schemes India",
    "PM Kisan eligibility",
    "agriculture loan schemes India",
    "crop insurance government scheme",
    "farmer welfare schemes India",
  ],
  "Self-Employed": [
    "self-employed government schemes India",
    "freelancer social security scheme India",
    "self-employment loan scheme India",
  ],
  Salaried: [
    "government schemes salaried employees India",
    "EPF PF pension scheme India",
    "tax saving government schemes India",
  ],
  "Business Owner": [
    "MSME loan schemes India",
    "government subsidy business India",
    "startup India scheme benefits",
    "Mudra loan eligibility India",
  ],
  "Daily Wage Worker": [
    "daily wage worker government schemes India",
    "labour welfare schemes India",
    "unorganised worker pension scheme",
    "Ayushman Bharat eligibility",
  ],
  Unemployed: [
    "unemployment allowance scheme India",
    "government skill development schemes India",
    "free vocational training schemes India",
    "PMKVY skill India scheme",
  ],
  Homemaker: [
    "women welfare schemes India",
    "Mahila Samman savings certificate",
    "government schemes housewife India",
    "women self-employment loan India",
  ],
  Retired: [
    "senior citizen pension scheme India",
    "Atal Pension Yojana eligibility",
    "senior citizen savings scheme India",
    "elderly welfare government schemes",
  ],
};

// ---- Query templates by social category ---------------------

const CATEGORY_QUERIES: Record<SocialCategory, string[]> = {
  General: [],
  OBC: [
    "OBC scholarship schemes India",
    "OBC welfare government schemes",
    "backward class loan subsidy India",
  ],
  SC: [
    "SC scholarship schemes India",
    "Scheduled Caste welfare schemes",
    "SC startup loan scheme India",
    "post matric scholarship SC India",
  ],
  ST: [
    "ST scholarship schemes India",
    "Scheduled Tribe welfare schemes",
    "tribal development schemes India",
    "ST education scheme India",
  ],
  EWS: [
    "EWS reservation benefits India",
    "economically weaker section schemes India",
    "EWS housing scheme India",
  ],
  Minority: [
    "minority scholarship schemes India",
    "minority welfare government schemes",
    "Maulana Azad scholarship eligibility",
  ],
};

// ---- Query templates by education level ---------------------

const EDUCATION_QUERIES: Partial<Record<EducationLevel, string[]>> = {
  "No Formal Education": [
    "government schemes illiterate persons India",
    "adult education scheme India",
  ],
  "Below 10th": [
    "skill development scheme 10th fail India",
    "ITI training government scheme India",
  ],
  "10th Pass": [
    "polytechnic scholarship government India",
    "vocational training scheme after 10th India",
  ],
  "12th Pass": [
    "undergraduate scholarship government India",
    "college fee waiver scheme India",
  ],
  Graduate: [
    "post graduation scholarship India",
    "graduate employment scheme India",
  ],
  "Post Graduate": [
    "PhD fellowship government India",
    "research grant scheme India",
  ],
  Doctorate: [
    "post-doctoral fellowship India",
    "research funding scheme India",
  ],
};

// ---- Query templates by business type -----------------------

const BUSINESS_QUERIES: Partial<Record<BusinessType, string[]>> = {
  Micro: [
    "micro enterprise loan scheme India",
    "Mudra Shishu loan eligibility",
    "micro business government subsidy",
  ],
  Small: [
    "small business loan government India",
    "Mudra Kishore loan scheme",
    "CGTMSE credit guarantee scheme",
  ],
  Medium: [
    "medium enterprise government schemes India",
    "Mudra Tarun loan eligibility",
    "MSME technology upgrade scheme",
  ],
  Large: [
    "large industry government incentives India",
    "PLI production linked incentive scheme",
  ],
  Startup: [
    "Startup India registration benefits",
    "startup seed fund scheme India",
    "angel tax exemption startup India",
    "DPIIT startup recognition benefits",
  ],
  None: [],
};

// ---- Income-based queries -----------------------------------

function getIncomeQueries(income: number): string[] {
  const queries: string[] = [];

  if (income <= 100000) {
    queries.push(
      "BPL government schemes India",
      "below poverty line benefits India",
      "Antyodaya Anna Yojana eligibility",
      "free ration scheme India"
    );
  } else if (income <= 250000) {
    queries.push(
      "low income family government schemes India",
      "Ayushman Bharat health insurance eligibility",
      "subsidised housing scheme India"
    );
  } else if (income <= 500000) {
    queries.push(
      "middle class government schemes India",
      "affordable housing PMAY eligibility",
      "income tax rebate section 87A"
    );
  } else if (income <= 1000000) {
    queries.push(
      "government schemes income below 10 lakh India",
      "PMAY MIG category eligibility"
    );
  }

  return queries;
}

// ---- Land-holding-based queries -----------------------------

function getLandQueries(landHolding: number, occupation: OccupationType): string[] {
  if (occupation !== "Farmer") return [];

  const queries: string[] = [];

  if (landHolding > 0 && landHolding <= 2) {
    queries.push(
      "small marginal farmer schemes India",
      "PM Kisan small farmer benefits",
      "micro irrigation subsidy scheme"
    );
  } else if (landHolding > 2 && landHolding <= 5) {
    queries.push(
      "medium farmer government schemes India",
      "drip irrigation subsidy India",
      "soil health card scheme India"
    );
  } else if (landHolding > 5) {
    queries.push(
      "large farmer schemes India",
      "agriculture mechanization subsidy India"
    );
  }

  return queries;
}

// ---- Gender-based queries -----------------------------------

function getGenderQueries(gender: string): string[] {
  if (gender === "Female") {
    return [
      "women empowerment schemes India",
      "Beti Bachao Beti Padhao scheme",
      "Sukanya Samriddhi Yojana eligibility",
      "women entrepreneur loan scheme India",
    ];
  }
  if (gender === "Transgender") {
    return [
      "transgender welfare schemes India",
      "SMILE scheme transgender India",
      "transgender pension scheme India",
    ];
  }
  return [];
}

// ---- Age-based queries --------------------------------------

function getAgeQueries(age: number): string[] {
  const queries: string[] = [];

  if (age < 18) {
    queries.push(
      "child welfare government schemes India",
      "mid-day meal scheme India",
      "Integrated Child Development Services"
    );
  } else if (age >= 18 && age <= 35) {
    queries.push(
      "youth government schemes India",
      "skill India mission for youth",
      "Pradhan Mantri Rojgar Protsahan"
    );
  } else if (age >= 60) {
    queries.push(
      "senior citizen government schemes India",
      "old age pension scheme India",
      "Varishtha Pension Bima Yojana"
    );
  }

  return queries;
}

// ---- State-specific queries ---------------------------------

function getStateQueries(state: string): string[] {
  return [
    `government schemes ${state}`,
    `${state} state welfare schemes`,
    `${state} subsidy schemes latest`,
  ];
}

// ---- Turnover-based queries ---------------------------------

function getTurnoverQueries(
  turnover: number,
  businessType: BusinessType
): string[] {
  if (businessType === "None" || turnover <= 0) return [];

  const queries: string[] = [];

  if (turnover <= 500000) {
    queries.push("nano enterprise government support India");
  } else if (turnover <= 5000000) {
    queries.push(
      "MSME registration benefits India",
      "Udyam registration scheme benefits"
    );
  } else if (turnover <= 50000000) {
    queries.push(
      "medium enterprise incentives India",
      "export promotion scheme MSME India"
    );
  }

  return queries;
}

// ============================================================
// Main Service
// ============================================================

export class SchemeDiscoveryService {
  /**
   * Generates an array of targeted search queries based on
   * the user's demographic and economic profile.
   *
   * @param profile - Complete user profile
   * @returns Array of unique search query strings
   */
  static generateSearchQueries(profile: UserProfile): string[] {
    const allQueries: string[] = [];

    // 1. Occupation-based queries (primary signal)
    allQueries.push(...OCCUPATION_QUERIES[profile.occupation]);

    // 2. Social category queries
    allQueries.push(...CATEGORY_QUERIES[profile.category]);

    // 3. Education-level queries
    const eduQueries = EDUCATION_QUERIES[profile.education];
    if (eduQueries) {
      allQueries.push(...eduQueries);
    }

    // 4. Business-type queries
    const bizQueries = BUSINESS_QUERIES[profile.business_type];
    if (bizQueries) {
      allQueries.push(...bizQueries);
    }

    // 5. Income-based queries
    allQueries.push(...getIncomeQueries(profile.income));

    // 6. Land-holding queries
    allQueries.push(...getLandQueries(profile.land_holding, profile.occupation));

    // 7. Gender-specific queries
    allQueries.push(...getGenderQueries(profile.gender));

    // 8. Age-based queries
    allQueries.push(...getAgeQueries(profile.age));

    // 9. State-specific queries
    allQueries.push(...getStateQueries(profile.state));

    // 10. Turnover-based queries
    allQueries.push(...getTurnoverQueries(profile.turnover, profile.business_type));

    // Deduplicate and return
    return [...new Set(allQueries)];
  }

  /**
   * Returns a subset of high-priority queries (top N).
   * Useful for rate-limited API calls.
   *
   * @param profile - Complete user profile
   * @param limit   - Maximum number of queries (default: 10)
   * @returns Array of top search query strings
   */
  static generateTopQueries(profile: UserProfile, limit: number = 10): string[] {
    return SchemeDiscoveryService.generateSearchQueries(profile).slice(0, limit);
  }

  /**
   * Returns queries grouped by source dimension for debugging
   * and transparency.
   *
   * @param profile - Complete user profile
   * @returns Object with queries grouped by category
   */
  static generateGroupedQueries(profile: UserProfile): Record<string, string[]> {
    return {
      occupation: OCCUPATION_QUERIES[profile.occupation] ?? [],
      category: CATEGORY_QUERIES[profile.category] ?? [],
      education: EDUCATION_QUERIES[profile.education] ?? [],
      business: BUSINESS_QUERIES[profile.business_type] ?? [],
      income: getIncomeQueries(profile.income),
      land: getLandQueries(profile.land_holding, profile.occupation),
      gender: getGenderQueries(profile.gender),
      age: getAgeQueries(profile.age),
      state: getStateQueries(profile.state),
      turnover: getTurnoverQueries(profile.turnover, profile.business_type),
    };
  }
}

export default SchemeDiscoveryService;

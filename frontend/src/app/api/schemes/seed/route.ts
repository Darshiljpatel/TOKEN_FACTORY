// ============================================================
// API Route: POST /api/schemes/seed
// Seeds the scheme_cache table with sample data (admin only).
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { saveMultipleSchemes } from "@/backend/services/SchemeCacheService";

const SAMPLE_SCHEMES = [
  {
    scheme_name: "PM Kisan Samman Nidhi",
    category: "Agriculture",
    description:
      "Income support of ₹6,000 per year to all landholding farmer families across the country.",
    eligibility:
      "All landholding farmer families with cultivable land. Excludes institutional landholders, constitutional post holders, and high-income taxpayers.",
    benefits: "₹6,000 per year in three equal installments of ₹2,000 each.",
    benefit_value: 6000,
    source_url: "https://pmkisan.gov.in/",
    states: ["All India"],
    tags: ["agriculture", "farmer", "income-support", "direct-benefit"],
    ministry: "Ministry of Agriculture & Farmers Welfare",
  },
  {
    scheme_name: "Pradhan Mantri Awas Yojana (PMAY)",
    category: "Housing",
    description:
      "Affordable housing scheme providing financial assistance for construction or enhancement of houses for the urban and rural poor.",
    eligibility:
      "EWS/LIG/MIG categories with annual household income up to ₹18 lakh. Beneficiary should not own a pucca house.",
    benefits:
      "Subsidy of ₹1.5 lakh to ₹2.67 lakh on home loan interest rates.",
    benefit_value: 267000,
    source_url: "https://pmaymis.gov.in/",
    states: ["All India"],
    tags: ["housing", "subsidy", "urban", "rural", "home-loan"],
    ministry: "Ministry of Housing and Urban Affairs",
  },
  {
    scheme_name: "Mudra Loan (PMMY)",
    category: "Business & Entrepreneurship",
    description:
      "Micro Units Development and Refinance Agency provides loans up to ₹10 lakh to non-corporate, non-farm small/micro enterprises.",
    eligibility:
      "Any Indian citizen with a business plan for non-farm income-generating activity. Shishu (up to ₹50K), Kishore (₹50K–₹5L), Tarun (₹5L–₹10L).",
    benefits: "Collateral-free loans up to ₹10 lakh at competitive interest rates.",
    benefit_value: 1000000,
    source_url: "https://www.mudra.org.in/",
    states: ["All India"],
    tags: ["business", "loan", "MSME", "startup", "entrepreneur"],
    ministry: "Ministry of Finance",
  },
  {
    scheme_name: "Ayushman Bharat (PM-JAY)",
    category: "Healthcare",
    description:
      "World's largest health insurance scheme providing ₹5 lakh per family per year for secondary and tertiary hospitalization.",
    eligibility:
      "Bottom 40% of the population based on SECC 2011 data. Covers poor and vulnerable families.",
    benefits:
      "Health cover of ₹5 lakh per family per year for hospitalization expenses.",
    benefit_value: 500000,
    source_url: "https://pmjay.gov.in/",
    states: ["All India"],
    tags: ["health", "insurance", "hospitalization", "cashless"],
    ministry: "Ministry of Health and Family Welfare",
  },
  {
    scheme_name: "Sukanya Samriddhi Yojana",
    category: "Women & Child Development",
    description:
      "Savings scheme for the girl child offering high interest rates and tax benefits under Section 80C.",
    eligibility:
      "Parents/guardians of a girl child below 10 years. Maximum 2 accounts per family.",
    benefits:
      "Interest rate of ~8% p.a., tax-free maturity amount, minimum deposit ₹250/year.",
    benefit_value: 0,
    source_url: "https://www.nsiindia.gov.in/",
    states: ["All India"],
    tags: ["savings", "girl-child", "tax-benefit", "education"],
    ministry: "Ministry of Finance",
  },
  {
    scheme_name: "Karnataka Raitha Siri",
    category: "Agriculture",
    description:
      "State-level crop loan waiver and agricultural support for small and marginal farmers in Karnataka.",
    eligibility:
      "Small and marginal farmers in Karnataka with outstanding crop loans up to ₹1 lakh.",
    benefits: "Crop loan waiver up to ₹1 lakh.",
    benefit_value: 100000,
    source_url: "https://raitamitra.karnataka.gov.in/",
    states: ["Karnataka"],
    tags: ["agriculture", "loan-waiver", "state-scheme"],
    ministry: "Karnataka Department of Agriculture",
  },
];

export async function POST(req: NextRequest) {
  try {
    const { data, success, error } = await saveMultipleSchemes(SAMPLE_SCHEMES);

    if (!success) {
      return NextResponse.json(
        { success: false, error: error || "Failed to seed schemes" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${data?.length ?? 0} schemes into scheme_cache`,
      schemes: data,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

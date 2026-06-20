import { Scheme } from "@/types/scheme";

/**
 * Mock scheme data, grouped by the profile category they're most relevant to.
 * This stands in for a real eligibility engine so the frontend has
 * realistic, friendly content to render for every demo profile.
 */
export const schemesByCategory: Record<string, Scheme[]> = {
  student: [
    {
      id: "nsp-scholarship",
      name: "National Scholarship Portal",
      issuedBy: "Ministry of Education",
      benefitAmount: 50000,
      eligibilityStatus: "eligible",
      priority: "high",
      whyThisMatches:
        "Your family income falls within the eligibility criteria and you are currently enrolled as a student.",
      documentsRequired: ["Aadhaar Card", "Income Certificate", "Bonafide Certificate"],
      officialLink: "https://scholarships.gov.in",
    },
    {
      id: "pm-vidya-lakshmi",
      name: "PM Vidya Lakshmi Education Loan Scheme",
      issuedBy: "Department of Financial Services",
      benefitAmount: 500000,
      benefitLabel: "Up to ₹5,00,000",
      eligibilityStatus: "eligible",
      priority: "high",
      whyThisMatches:
        "Students pursuing higher education can apply for a collateral-free loan through this portal, with interest support based on family income.",
      documentsRequired: ["Admission Letter", "Aadhaar Card", "Income Certificate"],
      officialLink: "https://www.vidyalakshmi.co.in",
    },
    {
      id: "skill-india",
      name: "Skill India Digital",
      issuedBy: "Ministry of Skill Development",
      benefitAmount: 25000,
      benefitLabel: "Free training + certificate",
      eligibilityStatus: "likely-eligible",
      priority: "recommended",
      whyThisMatches:
        "Open to all students looking to build job-ready skills alongside their degree, with certification recognised by employers.",
      documentsRequired: ["Aadhaar Card", "Educational Certificates"],
      officialLink: "https://www.skillindiadigital.gov.in",
    },
    {
      id: "aicte-scholarship",
      name: "AICTE Pragati Scholarship",
      issuedBy: "AICTE",
      benefitAmount: 40000,
      eligibilityStatus: "likely-eligible",
      priority: "additional",
      whyThisMatches:
        "This scholarship supports students in technical education and may apply depending on your specific course and institution.",
      documentsRequired: ["Aadhaar Card", "Income Certificate", "College ID Card"],
      officialLink: "https://www.aicte-india.org/schemes/students-development-schemes",
    },
  ],

  farmer: [
    {
      id: "pm-kisan",
      name: "PM-KISAN Samman Nidhi",
      issuedBy: "Ministry of Agriculture & Farmers Welfare",
      benefitAmount: 6000,
      benefitLabel: "₹6,000 per year",
      eligibilityStatus: "eligible",
      priority: "high",
      whyThisMatches:
        "Small and marginal farmer families with cultivable land are eligible for direct income support paid in three instalments a year.",
      documentsRequired: ["Aadhaar Card", "Land Records", "Bank Passbook"],
      officialLink: "https://pmkisan.gov.in",
    },
    {
      id: "kisan-credit-card",
      name: "Kisan Credit Card",
      issuedBy: "Department of Agriculture",
      benefitAmount: 300000,
      benefitLabel: "Credit up to ₹3,00,000",
      eligibilityStatus: "eligible",
      priority: "high",
      whyThisMatches:
        "Gives farmers easy access to short-term credit for seeds, fertiliser and equipment at a low, subsidised interest rate.",
      documentsRequired: ["Aadhaar Card", "Land Records", "Passport-size Photo"],
      officialLink: "https://www.myscheme.gov.in/schemes/kcc",
    },
    {
      id: "pmfby",
      name: "Pradhan Mantri Fasal Bima Yojana",
      issuedBy: "Ministry of Agriculture & Farmers Welfare",
      benefitAmount: 200000,
      benefitLabel: "Crop insurance cover",
      eligibilityStatus: "likely-eligible",
      priority: "recommended",
      whyThisMatches:
        "Protects your crop income against drought, flood or unseasonal rain, with a low premium share for the farmer.",
      documentsRequired: ["Aadhaar Card", "Land Records", "Bank Passbook"],
      officialLink: "https://pmfby.gov.in",
    },
    {
      id: "soil-health-card",
      name: "Soil Health Card Scheme",
      issuedBy: "Department of Agriculture",
      benefitAmount: 0,
      benefitLabel: "Free soil testing & guidance",
      eligibilityStatus: "likely-eligible",
      priority: "additional",
      whyThisMatches:
        "Helps you understand your soil's nutrients so you can choose the right fertiliser and improve yield over time.",
      documentsRequired: ["Aadhaar Card", "Land Records"],
      officialLink: "https://soilhealth.dac.gov.in",
    },
  ],

  business: [
    {
      id: "pm-mudra",
      name: "PM MUDRA Yojana",
      issuedBy: "Ministry of Finance",
      benefitAmount: 1000000,
      benefitLabel: "Loans up to ₹10,00,000",
      eligibilityStatus: "eligible",
      priority: "high",
      whyThisMatches:
        "Designed for small and micro business owners who need collateral-free funding to start or grow a business.",
      documentsRequired: ["Aadhaar Card", "Business Proof", "Bank Passbook"],
      officialLink: "https://www.mudra.org.in",
    },
    {
      id: "stand-up-india",
      name: "Stand-Up India Scheme",
      issuedBy: "Department of Financial Services",
      benefitAmount: 1000000,
      benefitLabel: "₹10 Lakh to ₹1 Crore",
      eligibilityStatus: "likely-eligible",
      priority: "recommended",
      whyThisMatches:
        "Supports women and first-generation entrepreneurs with bank loans for setting up a new enterprise.",
      documentsRequired: ["Aadhaar Card", "Business Plan", "Caste Certificate (if applicable)"],
      officialLink: "https://www.standupmitra.in",
    },
    {
      id: "pmegp",
      name: "PM Employment Generation Programme",
      issuedBy: "Ministry of MSME",
      benefitAmount: 500000,
      benefitLabel: "Subsidy up to ₹5,00,000",
      eligibilityStatus: "likely-eligible",
      priority: "recommended",
      whyThisMatches:
        "Offers a subsidy on new micro-enterprise projects in manufacturing or services, reducing your loan burden.",
      documentsRequired: ["Aadhaar Card", "Project Report", "Educational Certificate"],
      officialLink: "https://www.kviconline.gov.in/pmegpeportal",
    },
    {
      id: "udyam-registration",
      name: "Udyam Registration",
      issuedBy: "Ministry of MSME",
      benefitAmount: 0,
      benefitLabel: "Free MSME registration",
      eligibilityStatus: "eligible",
      priority: "additional",
      whyThisMatches:
        "Registering as an MSME unlocks priority lending, tax benefits and easier access to government tenders.",
      documentsRequired: ["Aadhaar Card", "Business Address Proof"],
      officialLink: "https://udyamregistration.gov.in",
    },
  ],

  senior: [
    {
      id: "ioaps",
      name: "Indira Gandhi National Old Age Pension",
      issuedBy: "Ministry of Rural Development",
      benefitAmount: 12000,
      benefitLabel: "₹1,000 per month",
      eligibilityStatus: "eligible",
      priority: "high",
      whyThisMatches:
        "Provides a monthly pension to senior citizens above 60 from low-income households, paid directly to your bank account.",
      documentsRequired: ["Aadhaar Card", "Age Proof", "Income Certificate"],
      officialLink: "https://nsap.nic.in",
    },
    {
      id: "pmvvy",
      name: "Pradhan Mantri Vaya Vandana Yojana",
      issuedBy: "LIC of India",
      benefitAmount: 150000,
      benefitLabel: "Guaranteed monthly pension",
      eligibilityStatus: "likely-eligible",
      priority: "recommended",
      whyThisMatches:
        "A simple pension plan for senior citizens that offers a fixed, guaranteed monthly income on a one-time investment.",
      documentsRequired: ["Aadhaar Card", "Age Proof", "Bank Passbook"],
      officialLink: "https://licindia.in/Products/Pension-Plans",
    },
    {
      id: "health-insurance-senior",
      name: "Ayushman Bharat (Senior Citizen Cover)",
      issuedBy: "National Health Authority",
      benefitAmount: 500000,
      benefitLabel: "Cover up to ₹5,00,000",
      eligibilityStatus: "eligible",
      priority: "high",
      whyThisMatches:
        "Gives senior citizens free hospital treatment cover for many common health conditions, with no premium to pay.",
      documentsRequired: ["Aadhaar Card", "Age Proof"],
      officialLink: "https://pmjay.gov.in",
    },
    {
      id: "senior-citizen-savings",
      name: "Senior Citizens Savings Scheme",
      issuedBy: "Ministry of Finance",
      benefitAmount: 3000000,
      benefitLabel: "Deposit up to ₹30,00,000",
      eligibilityStatus: "likely-eligible",
      priority: "additional",
      whyThisMatches:
        "A safe, government-backed savings option offering higher, regular interest payouts for retirees.",
      documentsRequired: ["Aadhaar Card", "Age Proof", "PAN Card"],
      officialLink: "https://www.nsiindia.gov.in/(S(scss))/InternalPage.aspx?Id_Pk=89",
    },
  ],

  general: [
    {
      id: "ayushman-bharat",
      name: "Ayushman Bharat - PMJAY",
      issuedBy: "National Health Authority",
      benefitAmount: 500000,
      benefitLabel: "Cover up to ₹5,00,000",
      eligibilityStatus: "likely-eligible",
      priority: "high",
      whyThisMatches:
        "Most low and middle-income families qualify for free hospital treatment cover under this scheme.",
      documentsRequired: ["Aadhaar Card", "Income Certificate", "Ration Card"],
      officialLink: "https://pmjay.gov.in",
    },
    {
      id: "ujjwala-yojana",
      name: "Pradhan Mantri Ujjwala Yojana",
      issuedBy: "Ministry of Petroleum & Natural Gas",
      benefitAmount: 1600,
      benefitLabel: "Free LPG connection",
      eligibilityStatus: "likely-eligible",
      priority: "recommended",
      whyThisMatches:
        "Helps eligible households get a free LPG gas connection, replacing unsafe cooking fuel sources.",
      documentsRequired: ["Aadhaar Card", "Ration Card", "Bank Passbook"],
      officialLink: "https://www.pmuy.gov.in",
    },
    {
      id: "pmay",
      name: "Pradhan Mantri Awas Yojana",
      issuedBy: "Ministry of Housing & Urban Affairs",
      benefitAmount: 267000,
      benefitLabel: "Subsidy up to ₹2,67,000",
      eligibilityStatus: "check-details",
      priority: "additional",
      whyThisMatches:
        "Offers an interest subsidy to help eligible families build or buy their first home.",
      documentsRequired: ["Aadhaar Card", "Income Certificate", "Property Documents"],
      officialLink: "https://pmaymis.gov.in",
    },
  ],
};

export const getSchemesForCategory = (category: string): Scheme[] =>
  schemesByCategory[category] ?? schemesByCategory.general;

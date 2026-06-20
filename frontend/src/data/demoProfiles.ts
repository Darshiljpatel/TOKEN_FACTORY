export interface DemoProfile {
  id: string;
  emoji: string;
  label: string;
  description: string;
  sampleText: string;
}

export const demoProfiles: DemoProfile[] = [
  {
    id: "student",
    emoji: "🎓",
    label: "Student",
    description: "Scholarships & education loans",
    sampleText:
      "I am a second-year engineering student from Karnataka. My family income is around ₹3 lakh. I belong to OBC category.",
  },
  {
    id: "farmer",
    emoji: "🌾",
    label: "Farmer",
    description: "Crop support & farming credit",
    sampleText:
      "I am a farmer from Punjab with 2 acres of land. My family income is around ₹1.5 lakh a year. I belong to General category.",
  },
  {
    id: "business",
    emoji: "👩",
    label: "Small Business Owner",
    description: "Loans & enterprise support",
    sampleText:
      "I run a small tailoring business from home in Maharashtra. My yearly income is around ₹2 lakh. I belong to OBC category.",
  },
  {
    id: "senior",
    emoji: "👴",
    label: "Senior Citizen",
    description: "Pension & healthcare support",
    sampleText:
      "I am a 67-year-old retired teacher living in Tamil Nadu. My monthly pension is small and I would like to know about senior citizen support.",
  },
];

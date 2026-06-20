"use client";

import { useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { ProfileInput } from "@/components/ProfileInput";
import { LoadingState } from "@/components/LoadingState";
import { Dashboard } from "@/components/Dashboard";
import { interpretProfile } from "@/data/mockProfile";
import { getSchemesForCategory } from "@/data/mockSchemes";
import { CitizenProfile, ProfileCategory } from "@/types/profile";
import { Scheme, EligibilityStatus, PriorityLevel } from "@/types/scheme";

type FlowStage = "landing" | "loading" | "results";

export default function Home() {
  const [stage, setStage] = useState<FlowStage>("landing");
  const [inputText, setInputText] = useState("");
  const [profile, setProfile] = useState<CitizenProfile | null>(null);
  const [schemes, setSchemes] = useState<Scheme[]>([]);

  // Refs for loading transition to prevent stale closures in async handlers
  const isApiDoneRef = useRef(false);
  const isAnimationDoneRef = useRef(false);
  const pendingProfileRef = useRef<CitizenProfile | null>(null);
  const pendingSchemesRef = useRef<Scheme[]>([]);

  // Dynamic document extraction helper
  function extractDocuments(scheme: any): string[] {
    const text = `${scheme.scheme_name} ${scheme.description || ""} ${scheme.eligibility || ""} ${scheme.benefits || ""}`.toLowerCase();
    const documents: string[] = [];
    if (text.includes("aadhaar") || text.includes("aadhar") || text.includes("uidai")) {
      documents.push("Aadhaar Card");
    }
    if (text.includes("pan card") || text.includes("permanent account number") || text.includes("pan number")) {
      documents.push("PAN Card");
    }
    if (text.includes("income certificate") || text.includes("salary slip") || text.includes("family income") || text.includes("income proof")) {
      documents.push("Income Certificate");
    }
    if (text.includes("caste") || text.includes("category certificate") || text.includes("obc") || text.includes("sc certificate") || text.includes("st certificate")) {
      documents.push("Caste Certificate");
    }
    if (text.includes("ration card") || text.includes("bpl card") || text.includes("apl card")) {
      documents.push("Ration Card");
    }
    if (text.includes("bank passbook") || text.includes("bank account details") || text.includes("canceled cheque") || text.includes("bank statement")) {
      documents.push("Bank Passbook / Details");
    }
    if (text.includes("admission") || text.includes("college id") || text.includes("school id") || text.includes("bonafide") || text.includes("enrollment")) {
      documents.push("College / School ID or Admission Proof");
    }
    if (text.includes("land records") || text.includes("patta") || text.includes("rorec") || text.includes("land holding") || text.includes("land proof")) {
      documents.push("Land Records");
    }
    if (text.includes("business registration") || text.includes("udyam") || text.includes("gstin") || text.includes("company registration")) {
      documents.push("Business Registration Proof");
    }
    // Fallback if none found
    if (documents.length === 0) {
      documents.push("Aadhaar Card");
    }
    return documents;
  }

  // Triggered when search API is completed AND loader animation has run fully
  function checkAndTransition() {
    if (isApiDoneRef.current && isAnimationDoneRef.current && pendingProfileRef.current) {
      setProfile(pendingProfileRef.current);
      setSchemes(pendingSchemesRef.current);
      setStage("results");
    }
  }

  async function handleSubmit() {
    if (inputText.trim().length < 8) return;

    // Reset latch states
    isApiDoneRef.current = false;
    isAnimationDoneRef.current = false;
    pendingProfileRef.current = null;
    pendingSchemesRef.current = [];

    setStage("loading");

    try {
      const response = await fetch("/api/find-schemes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText }),
      });

      if (!response.ok) {
        throw new Error("API request failed");
      }

      const data = await response.json();

      // Map backend profile
      let category: ProfileCategory = "general";
      const occ = data.profile.occupation?.toLowerCase() || "";
      if (occ.includes("student")) category = "student";
      else if (occ.includes("farmer")) category = "farmer";
      else if (occ.includes("business") || occ.includes("employed") || occ.includes("self")) category = "business";
      else if (occ.includes("retire") || (data.profile.age && data.profile.age >= 60)) category = "senior";

      const categoryLabels: Record<ProfileCategory, string> = {
        student: "Student",
        farmer: "Farmer",
        business: "Business & Entrepreneur",
        senior: "Senior Citizen",
        general: "General Profile",
      };

      const mappedProfile: CitizenProfile = {
        rawText: inputText,
        category,
        categoryLabel: categoryLabels[category],
        state: data.profile.state || "All India",
        socialCategory: data.profile.category || "General",
        income: data.profile.income ?? undefined,
        ageGroup: data.profile.age ? `${data.profile.age} years` : undefined,
      };

      // Map backend schemes
      const mappedSchemes: Scheme[] = data.retrievedSchemes.map((item: any, idx: number) => {
        const s = item.scheme;
        const score = item.relevanceScore;

        const verdict = data.eligibility?.results?.find((v: any) => v.scheme_name === s.scheme_name);
        let eligibilityStatus: EligibilityStatus = "likely-eligible";
        let whyThisMatches = verdict?.reason || s.description || "Fits your profile details.";

        if (verdict) {
          if (verdict.status === "Eligible") eligibilityStatus = "eligible";
          else if (verdict.status === "Possibly Eligible") eligibilityStatus = "likely-eligible";
          else if (verdict.status === "Not Eligible") eligibilityStatus = "check-details";
        }

        let priority: PriorityLevel = "recommended";
        if (score >= 70) priority = "high";
        else if (score < 40) priority = "additional";

        return {
          id: s.id || `scheme-${idx}`,
          name: s.scheme_name,
          issuedBy: s.ministry || "Government Department",
          benefitAmount: s.benefit_value || 0,
          benefitLabel: s.benefits || (s.benefit_value > 0 ? `₹${s.benefit_value.toLocaleString("en-IN")}` : "Benefits apply"),
          eligibilityStatus,
          priority,
          whyThisMatches,
          documentsRequired: extractDocuments(s),
          officialLink: s.source_url || "https://www.myscheme.gov.in",
        };
      });

      // Update latch state
      pendingProfileRef.current = mappedProfile;
      pendingSchemesRef.current = mappedSchemes;
      isApiDoneRef.current = true;

      // Transition if animation is already complete
      checkAndTransition();
    } catch (err) {
      console.warn("E2E API failed, falling back to mock client-side interpreter", err);
      // Resilient Fallback to local mock data
      const interpreted = interpretProfile(inputText);
      const mockSchemes = getSchemesForCategory(interpreted.category);

      pendingProfileRef.current = interpreted;
      pendingSchemesRef.current = mockSchemes;
      isApiDoneRef.current = true;

      checkAndTransition();
    }
  }

  function handleLoadingDone() {
    isAnimationDoneRef.current = true;
    // Transition if API is already complete
    checkAndTransition();
  }

  function handleStartOver() {
    setStage("landing");
    setInputText("");
    setProfile(null);
    setSchemes([]);
    isApiDoneRef.current = false;
    isAnimationDoneRef.current = false;
    pendingProfileRef.current = null;
    pendingSchemesRef.current = [];
  }

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />

      <AnimatePresence mode="wait">
        {stage === "landing" && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Hero />
            <ProfileInput value={inputText} onChange={setInputText} onSubmit={handleSubmit} />
          </motion.div>
        )}

        {stage === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <LoadingState onDone={handleLoadingDone} />
          </motion.div>
        )}

        {stage === "results" && profile && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Dashboard profile={profile} schemes={schemes} onStartOver={handleStartOver} />
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="border-t border-line py-6 text-center text-xs text-ink-soft">
        SchemeSathi is an informational tool. Always confirm scheme details on
        the official government portal before applying.
      </footer>
    </main>
  );
}

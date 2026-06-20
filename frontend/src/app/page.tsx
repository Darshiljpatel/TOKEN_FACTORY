"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { ProfileInput } from "@/components/ProfileInput";
import { LoadingState } from "@/components/LoadingState";
import { Dashboard } from "@/components/Dashboard";
import { interpretProfile } from "@/data/mockProfile";
import { getSchemesForCategory } from "@/data/mockSchemes";
import { CitizenProfile } from "@/types/profile";
import { Scheme } from "@/types/scheme";

type FlowStage = "landing" | "loading" | "results";

export default function Home() {
  const [stage, setStage] = useState<FlowStage>("landing");
  const [inputText, setInputText] = useState("");
  const [profile, setProfile] = useState<CitizenProfile | null>(null);
  const [schemes, setSchemes] = useState<Scheme[]>([]);

  function handleSubmit() {
    if (inputText.trim().length < 8) return;
    const interpreted = interpretProfile(inputText);
    setProfile(interpreted);
    setSchemes(getSchemesForCategory(interpreted.category));
    setStage("loading");
  }

  function handleLoadingDone() {
    setStage("results");
  }

  function handleStartOver() {
    setStage("landing");
    setInputText("");
    setProfile(null);
    setSchemes([]);
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

"use client";

import { motion } from "framer-motion";
import { demoProfiles } from "@/data/demoProfiles";

interface DemoProfilesProps {
  onSelect: (sampleText: string) => void;
  activeText: string;
}

export function DemoProfiles({ onSelect, activeText }: DemoProfilesProps) {
  return (
    <div className="mt-6">
      <p className="mb-3 text-sm font-medium text-ink-soft">
        Not sure what to write? Try one of these:
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {demoProfiles.map((profile, i) => {
          const isActive = activeText === profile.sampleText;
          return (
            <motion.button
              key={profile.id}
              type="button"
              onClick={() => onSelect(profile.sampleText)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              className={`flex flex-col items-center gap-1.5 rounded-2xl border px-3 py-4 text-center transition-all ${
                isActive
                  ? "border-primary bg-primary-light shadow-lift"
                  : "border-line bg-white hover:border-primary/40 hover:bg-cream-soft"
              }`}
            >
              <span className="text-2xl">{profile.emoji}</span>
              <span className="font-heading text-sm font-semibold text-ink">
                {profile.label}
              </span>
              <span className="text-xs text-ink-soft leading-snug">
                {profile.description}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

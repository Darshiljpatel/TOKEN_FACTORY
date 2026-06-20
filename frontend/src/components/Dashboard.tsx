"use client";

import { motion } from "framer-motion";
import { CitizenProfile } from "@/types/profile";
import { Scheme } from "@/types/scheme";
import { BenefitSummary } from "@/components/BenefitSummary";
import { StatsRow } from "@/components/StatsRow";
import { ProfileCard } from "@/components/ProfileCard";
import { SchemeCard } from "@/components/SchemeCard";
import { PriorityRecommendations } from "@/components/PriorityRecommendations";
import { ActionTimeline } from "@/components/ActionTimeline";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

interface DashboardProps {
  profile: CitizenProfile;
  schemes: Scheme[];
  onStartOver: () => void;
}

export function Dashboard({ profile, schemes, onStartOver }: DashboardProps) {
  const eligibleSchemes = schemes.filter((s) => s.eligibilityStatus !== "check-details");
  const totalValue = eligibleSchemes.reduce((sum, s) => sum + s.benefitAmount, 0);
  const documentsCount = new Set(schemes.flatMap((s) => s.documentsRequired)).size;

  return (
    <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center justify-between pb-4 pt-2">
          <p className="font-heading text-sm font-semibold text-ink-soft">
            Here&apos;s what we found for you
          </p>
          <Button variant="ghost" size="sm" onClick={onStartOver}>
            <RotateCcw size={14} />
            Start Over
          </Button>
        </div>

        <BenefitSummary totalValue={totalValue} />
        <StatsRow
          totalSchemes={schemes.length}
          eligibleCount={eligibleSchemes.length}
          documentsCount={documentsCount}
        />

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-10">
            <div>
              <h2 className="font-heading text-2xl font-bold text-ink">
                Recommended For You
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                Schemes that fit what you&apos;ve told us, explained simply.
              </p>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                {schemes.map((scheme, i) => (
                  <SchemeCard key={scheme.id} scheme={scheme} index={i} />
                ))}
              </div>
            </div>

            <ActionTimeline schemes={schemes} />
          </div>

          <div className="space-y-6">
            <ProfileCard profile={profile} />
            <PriorityRecommendations schemes={schemes} />
          </div>
        </div>
      </motion.div>
    </section>
  );
}

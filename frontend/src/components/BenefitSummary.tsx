"use client";

import { motion } from "framer-motion";
import { HandCoins } from "lucide-react";
import { formatRupees } from "@/lib/utils";

interface BenefitSummaryProps {
  totalValue: number;
  name?: string;
}

export function BenefitSummary({ totalValue, name }: BenefitSummaryProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative overflow-hidden rounded-3xl border border-primary/15 bg-primary-light px-6 py-8 sm:px-10 sm:py-10"
    >
      {/* soft decorative shapes, kept quiet and out of the way */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10" />
      <div className="pointer-events-none absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-white/40" />

      <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white">
            <HandCoins size={22} />
          </div>
          <h2 className="font-heading text-lg font-semibold text-ink-soft">
            Benefits You May Be Eligible For
          </h2>
          <p className="mt-2 font-heading text-4xl font-extrabold text-primary-dark sm:text-5xl">
            {formatRupees(totalValue)}
          </p>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
            Estimated value of schemes and support programs available to
            {name ? ` ${name}` : " you"}, based on what you&apos;ve shared.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

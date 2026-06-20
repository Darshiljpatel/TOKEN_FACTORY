"use client";

import { motion } from "framer-motion";
import { ListChecks, BadgeCheck, FileText } from "lucide-react";

interface StatsRowProps {
  totalSchemes: number;
  eligibleCount: number;
  documentsCount: number;
}

export function StatsRow({ totalSchemes, eligibleCount, documentsCount }: StatsRowProps) {
  const stats = [
    { label: "Schemes Found", value: totalSchemes, icon: ListChecks },
    { label: "You're Eligible For", value: eligibleCount, icon: BadgeCheck },
    { label: "Documents To Prepare", value: documentsCount, icon: FileText },
  ];

  return (
    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
            className="flex items-center gap-3 rounded-2xl border border-line bg-card px-5 py-4"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream-soft text-primary">
              <Icon size={18} />
            </div>
            <div>
              <p className="font-heading text-xl font-bold text-ink">{stat.value}</p>
              <p className="text-xs text-ink-soft">{stat.label}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

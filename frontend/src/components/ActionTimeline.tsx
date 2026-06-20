"use client";

import { motion } from "framer-motion";
import { Scheme } from "@/types/scheme";
import { CheckCircle, Circle } from "lucide-react";

interface ActionTimelineProps {
  schemes: Scheme[];
}

function actionVerb(priority: Scheme["priority"]): string {
  if (priority === "high") return "Apply for";
  if (priority === "recommended") return "Register for";
  return "Explore";
}

export function ActionTimeline({ schemes }: ActionTimelineProps) {
  // Surface a friendly, ordered set of next steps: high priority first.
  const ordered = [...schemes]
    .sort((a, b) => {
      const rank = { high: 0, recommended: 1, additional: 2 };
      return rank[a.priority] - rank[b.priority];
    })
    .slice(0, 4);

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-ink">Your Next Steps</h2>
      <p className="mt-1 text-sm text-ink-soft">A simple path forward, one step at a time.</p>

      <ol className="mt-6 space-y-0">
        {ordered.map((scheme, i) => {
          const isLast = i === ordered.length - 1;
          return (
            <motion.li
              key={scheme.id}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="relative flex gap-4 pb-8 last:pb-0"
            >
              <div className="flex flex-col items-center">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
                  {i === 0 ? <CheckCircle size={18} /> : <Circle size={16} />}
                </div>
                {!isLast && <div className="mt-1 w-px flex-1 bg-line" />}
              </div>

              <div className="pt-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Step {i + 1}
                </p>
                <p className="mt-0.5 font-heading text-base font-semibold text-ink">
                  {actionVerb(scheme.priority)} {scheme.name}
                </p>
                <p className="mt-0.5 text-sm text-ink-soft">{scheme.issuedBy}</p>
              </div>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}

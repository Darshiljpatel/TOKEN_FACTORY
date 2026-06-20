"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Scheme } from "@/types/scheme";
import { formatRupees } from "@/lib/utils";
import { CheckCircle2, FileText, ArrowUpRight, BadgeCheck, CircleHelp } from "lucide-react";

interface SchemeCardProps {
  scheme: Scheme;
  index?: number;
}

const eligibilityConfig: Record<
  Scheme["eligibilityStatus"],
  { label: string; variant: "solid" | "primary" | "outline"; icon: typeof CheckCircle2 }
> = {
  eligible: { label: "Eligible", variant: "solid", icon: CheckCircle2 },
  "likely-eligible": { label: "Likely Eligible", variant: "primary", icon: BadgeCheck },
  "check-details": { label: "Check Details", variant: "outline", icon: CircleHelp },
};

export function SchemeCard({ scheme, index = 0 }: SchemeCardProps) {
  const eligibility = eligibilityConfig[scheme.eligibilityStatus];
  const EligibilityIcon = eligibility.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.06, 0.3) }}
    >
      <Card className="h-full transition-shadow hover:shadow-soft">
        <CardContent className="flex h-full flex-col p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-soft/70">
                {scheme.issuedBy}
              </p>
              <h3 className="mt-0.5 font-heading text-lg font-bold leading-snug text-ink">
                {scheme.name}
              </h3>
            </div>
            <Badge variant={eligibility.variant} className="shrink-0">
              <EligibilityIcon size={13} />
              {eligibility.label}
            </Badge>
          </div>

          <p className="mt-3 font-heading text-2xl font-extrabold text-primary">
            {scheme.benefitLabel ?? formatRupees(scheme.benefitAmount)}
          </p>

          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            <span className="font-semibold text-ink">Why this matches: </span>
            {scheme.whyThisMatches}
          </p>

          <div className="mt-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
              <FileText size={13} />
              Documents Required
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {scheme.documentsRequired.map((doc) => (
                <li
                  key={doc}
                  className="rounded-full bg-cream-soft px-2.5 py-1 text-xs text-ink-soft"
                >
                  {doc}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-5 pt-1">
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => window.open(scheme.officialLink, "_blank", "noopener,noreferrer")}
            >
              Learn More
              <ArrowUpRight size={15} />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

import { Scheme } from "@/types/scheme";
import { Badge } from "@/components/ui/badge";
import { formatRupees } from "@/lib/utils";
import { Star, ThumbsUp, Compass } from "lucide-react";

interface PriorityRecommendationsProps {
  schemes: Scheme[];
}

const PRIORITY_CONFIG = {
  high: { label: "High Priority", icon: Star, variant: "solid" as const },
  recommended: { label: "Recommended", icon: ThumbsUp, variant: "primary" as const },
  additional: { label: "Additional Opportunities", icon: Compass, variant: "outline" as const },
};

export function PriorityRecommendations({ schemes }: PriorityRecommendationsProps) {
  const grouped: Record<string, Scheme[]> = { high: [], recommended: [], additional: [] };
  schemes.forEach((s) => grouped[s.priority]?.push(s));

  const order: Array<keyof typeof PRIORITY_CONFIG> = ["high", "recommended", "additional"];

  return (
    <div className="space-y-5">
      <h2 className="font-heading text-2xl font-bold text-ink">Start With These</h2>
      <p className="text-sm text-ink-soft -mt-3">
        A gentle guide to where you&apos;ll get the most value first.
      </p>

      {order.map((key) => {
        const group = grouped[key];
        if (!group.length) return null;
        const config = PRIORITY_CONFIG[key];
        const Icon = config.icon;

        return (
          <div key={key} className="rounded-2xl border border-line bg-card p-5">
            <Badge variant={config.variant} className="mb-3">
              <Icon size={13} />
              {config.label}
            </Badge>
            <ul className="space-y-2.5">
              {group.map((scheme) => (
                <li
                  key={scheme.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-cream-soft/60 px-4 py-3"
                >
                  <span className="text-sm font-medium text-ink">{scheme.name}</span>
                  <span className="shrink-0 text-sm font-semibold text-primary">
                    {scheme.benefitLabel ?? formatRupees(scheme.benefitAmount)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

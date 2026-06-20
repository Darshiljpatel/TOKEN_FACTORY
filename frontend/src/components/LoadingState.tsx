"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HeartHandshake, Search, ClipboardCheck, Gift } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const STEPS = [
  { label: "Getting to know you", icon: HeartHandshake },
  { label: "Finding helpful schemes", icon: Search },
  { label: "Checking eligibility", icon: ClipboardCheck },
  { label: "Preparing recommendations", icon: Gift },
];

interface LoadingStateProps {
  onDone: () => void;
}

export function LoadingState({ onDone }: LoadingStateProps) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const stepDuration = 850;

    const interval = setInterval(() => {
      setStepIndex((prev) => {
        if (prev >= STEPS.length - 1) {
          clearInterval(interval);
          setTimeout(onDone, 700);
          return prev;
        }
        return prev + 1;
      });
    }, stepDuration);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progress = ((stepIndex + 1) / STEPS.length) * 100;
  const ActiveIcon = STEPS[stepIndex].icon;

  return (
    <section className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-5 text-center">
      <motion.div
        key={stepIndex}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
        className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-light text-primary"
      >
        <ActiveIcon size={34} strokeWidth={2} />
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.p
          key={STEPS[stepIndex].label}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3 }}
          className="mt-6 font-heading text-xl font-semibold text-ink"
        >
          {STEPS[stepIndex].label}…
        </motion.p>
      </AnimatePresence>

      <p className="mt-2 text-sm text-ink-soft">
        This usually takes just a few seconds.
      </p>

      <div className="mt-6 w-full">
        <Progress value={progress} />
      </div>
    </section>
  );
}

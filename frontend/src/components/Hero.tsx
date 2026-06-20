"use client";

import { motion } from "framer-motion";
import { HeroIllustration } from "@/components/illustrations/HeroIllustration";
import { Sparkles } from "lucide-react";

export function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-5 pt-12 pb-6 sm:px-8 sm:pt-16">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sand px-3.5 py-1.5 text-xs font-semibold text-ink">
            <Sparkles size={13} className="text-terracotta" />
            Made for every Indian citizen
          </span>

          <h1 className="mt-5 font-heading text-4xl font-extrabold leading-[1.1] text-ink sm:text-5xl">
            Find Government Benefits
            <br />
            <span className="text-primary">Made For You</span>
          </h1>

          <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-soft">
            Tell us a little about yourself and discover scholarships, welfare
            programs, loans and government schemes you may qualify for.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-soft">
            <span>🇮🇳 Built for citizens across India</span>
            <span>🔒 No login needed</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          className="flex justify-center"
        >
          <div className="animate-gentle-float">
            <HeroIllustration />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

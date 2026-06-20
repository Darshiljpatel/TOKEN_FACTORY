"use client";

import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DemoProfiles } from "@/components/DemoProfiles";
import { ArrowRight, PenLine } from "lucide-react";

interface ProfileInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export function ProfileInput({ value, onChange, onSubmit }: ProfileInputProps) {
  const canSubmit = value.trim().length > 8;

  return (
    <section id="profile-input" className="mx-auto max-w-3xl px-5 pb-16 sm:px-8">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <Card className="shadow-soft">
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-light text-primary">
                <PenLine size={18} />
              </div>
              <CardTitle>Tell Us About Yourself</CardTitle>
            </div>
            <CardDescription>Describe your situation in your own words.</CardDescription>
          </CardHeader>

          <CardContent>
            <Textarea
              rows={5}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={
                "For example: I am a second-year engineering student from Karnataka. My family income is around ₹3 lakh. I belong to OBC category."
              }
            />

            <DemoProfiles onSelect={onChange} activeText={value} />

            <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
              <p className="text-xs text-ink-soft">
                We only use this to suggest schemes. Nothing is stored or shared.
              </p>
              <Button
                onClick={onSubmit}
                disabled={!canSubmit}
                size="lg"
                className="w-full sm:w-auto"
              >
                Find My Benefits
                <ArrowRight size={18} />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </section>
  );
}

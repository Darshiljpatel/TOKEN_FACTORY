import { HeartHandshake } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-cream/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-light text-primary">
            <HeartHandshake size={20} strokeWidth={2.2} />
          </div>
          <span className="font-heading text-lg font-bold text-ink">SchemeSathi</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden rounded-full bg-cream-soft px-3.5 py-1.5 text-xs font-medium text-ink-soft sm:inline-block">
            Government Benefits Assistant
          </span>
          <LanguageSelector />
        </div>
      </div>
    </header>
  );
}

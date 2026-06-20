# SchemeSathi — Frontend

Helping Every Indian Discover Benefits They Deserve.

A warm, friendly, single-page web app that helps people describe their
situation in plain language and discover government schemes, scholarships,
subsidies, loans and welfare programs they may qualify for.

## Tech stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS (custom warm color system, no dark theme)
- Framer Motion for subtle motion only
- Lucide React for icons
- Small hand-built UI primitives (Button, Card, Badge, Textarea, Progress) —
  no external UI library dependency, kept lightweight and easy to restyle

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Project structure

```
src/
  app/
    page.tsx          # Orchestrates the single-page flow (landing → loading → results)
    layout.tsx         # Root layout, fonts, metadata
    globals.css         # Tailwind layers + base styles
  components/
    ui/                 # Small design-system primitives
    illustrations/      # Hand-built flat-vector SVG illustrations
    Navbar.tsx
    Hero.tsx
    ProfileInput.tsx
    DemoProfiles.tsx
    LoadingState.tsx
    Dashboard.tsx
    BenefitSummary.tsx
    StatsRow.tsx
    ProfileCard.tsx
    SchemeCard.tsx
    PriorityRecommendations.tsx
    ActionTimeline.tsx
    LanguageSelector.tsx
  data/
    mockProfile.ts       # Lightweight keyword-based profile interpreter
    mockSchemes.ts        # Mock scheme datasets per profile category
    demoProfiles.ts        # Content for the 4 sample profile cards
  types/
    profile.ts
    scheme.ts
```

## How the Flow Works (Fully Integrated Backend)

1. The user describes their background (e.g., "I am a 19 year old engineering student from Karnataka family income 3 lakh, caste OBC") or taps a demo profile card.
2. On submit, a POST request is made to `/api/find-schemes` passing the raw profile text.
3. The API Orchestrator:
   - Extracts structured profile dimensions (Zod validated) using Nebius AI `Qwen/Qwen3-235B-A22B-Instruct-2507`.
   - Queries the Supabase database cache for matching state/occupation/category schemes.
   - Triggers Web Search Query Generation and discovery for live scheme updates, saving new schemes to Supabase.
   - Evaluates scheme-by-scheme eligibility reasoning using Nebius AI `deepseek-ai/DeepSeek-V3.2`.
   - Generates benefits analysis breakdown and a prioritized application roadmap.
   - Stores search logs and report statistics.
4. A smooth loader transitions and displays the results dashboard dynamically translating into selected regional Indian languages.

## Design notes

- Colors, type and spacing follow the brief's warm, human palette: cream
  background, deep green for primary actions, soft borders — deliberately
  avoiding dark themes, neon, and "AI dashboard" styling.
- Headings use Manrope, body text uses Inter — both loaded via `next/font`.
- The hero illustration and small icon accents are hand-built flat SVGs
  rather than stock or AI-generated imagery, per the brief.
- Motion is limited to gentle fades, hovers and a soft floating illustration;
  `prefers-reduced-motion` is respected globally in `globals.css`.

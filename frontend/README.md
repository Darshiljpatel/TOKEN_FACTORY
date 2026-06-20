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

## How the flow works (frontend-only, no backend yet)

1. The person describes themselves in the textarea, or taps a demo profile
   card (Student, Farmer, Small Business Owner, Senior Citizen) to auto-fill it.
2. On submit, `interpretProfile()` in `src/data/mockProfile.ts` does light
   keyword detection (category, state, income, social category) to build a
   `CitizenProfile`.
3. `getSchemesForCategory()` in `src/data/mockSchemes.ts` returns a relevant
   mock list of `Scheme` objects for that category.
4. A friendly, non-technical loading screen plays for a few seconds.
5. The results dashboard renders the benefit summary, profile tags, scheme
   cards, priority groupings and a next-steps timeline.

### Plugging in a real backend later

Replace the two functions in `src/data/mockProfile.ts` and
`src/data/mockSchemes.ts` with real API calls (e.g. inside `handleSubmit` in
`src/app/page.tsx`), keeping the same `CitizenProfile` / `Scheme` shapes so no
component needs to change.

## Design notes

- Colors, type and spacing follow the brief's warm, human palette: cream
  background, deep green for primary actions, soft borders — deliberately
  avoiding dark themes, neon, and "AI dashboard" styling.
- Headings use Manrope, body text uses Inter — both loaded via `next/font`.
- The hero illustration and small icon accents are hand-built flat SVGs
  rather than stock or AI-generated imagery, per the brief.
- Motion is limited to gentle fades, hovers and a soft floating illustration;
  `prefers-reduced-motion` is respected globally in `globals.css`.

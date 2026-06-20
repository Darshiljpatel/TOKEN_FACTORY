# SchemeSathi

An AI-powered Government Scheme Finder and Application Planner for India. SchemeSathi takes natural language descriptions of user profiles, extracts structured demographic/economic details, retrieves matching central and state government schemes (via cached Supabase data and real-time Nebius AI search discovery), performs eligibility audits, calculates potential benefits, structures application roadmaps, and translates outputs into regional languages.

---

## 1. Project Directory Structure

```text
TOKEN_FACTORY/
├── ai/                      # Standalone Python AI Module (Agent Prototype)
│   ├── prompts/             # System prompts for extraction, roadmap, translation etc.
│   ├── services/            # Profile extractor, discoverer, translator agents (Nebius)
│   └── tests/               # Standalone Python integration & unit tests
├── frontend/                # Integrated Next.js Web Application
│   ├── src/
│   │   ├── app/             # Next.js App Router (pages and API routes)
│   │   │   ├── api/         # E2E Backend Orchestrator endpoints
│   │   │   └── page.tsx     # Single-page interface (Landing, loading, results dashboard)
│   │   ├── backend/         # Integrated TypeScript backend services & tests
│   │   │   ├── lib/         # Supabase & Nebius API Studio clients
│   │   │   ├── services/    # Profile extraction, query generation, eligibility checker
│   │   │   └── tests/       # TypeScript E2E integration test suite
│   │   └── components/      # UI design system components
└── .env                     # Global Environment configuration file
```

---

## 2. Environment Setup

Copy or create a `.env` file at the root of the project (`TOKEN_FACTORY/.env`) and inside the frontend directory (`TOKEN_FACTORY/frontend/.env`):

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Nebius AI API Key
NEBIUS_API_KEY=your_nebius_api_key_here
```

---

## 3. How to Run the Project

### A. Integrated Next.js Application (Web Dashboard & API)

1. Navigate to the `frontend/` folder:
   ```bash
   cd frontend
   ```
2. Install the package dependencies:
   ```bash
   npm install
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
4. Access the web dashboard at [http://localhost:3000](http://localhost:3000).

---

### B. Seeding the Scheme Database Cache

To seed the initial scheme database cache with sample schemes (e.g., PM Kisan, Ayushman Bharat, PMAY, Mudra loan) for local matching:
1. Ensure the Next.js server is running (`npm run dev`).
2. Make a `POST` request to the seed API route:
   ```bash
   curl -X POST http://localhost:3000/api/schemes/seed
   ```

---

### C. Running TypeScript Backend Tests

We have two automated test suites in the frontend package verifying all AI integrations (Nebius) and database caching (Supabase):

1. **Scheme Retrieval & Scoring Test**:
   Validates search matching, database indexing, and scoring against multiple mock profiles (Student, Farmer, Business Owner, MSME).
   ```bash
   cd frontend
   npx tsx src/backend/tests/testSchemeRetrieval.ts
   ```

2. **Full E2E Integration Pipeline Test**:
   Validates profile extraction, search query generation, cached retrieval, real-time Nebius AI search discovery, eligibility audits, benefits analysis, search logging, and report storage.
   ```bash
   cd frontend
   npx tsx src/backend/tests/e2e.integration.ts
   ```

---

### D. Running Python Standalone Agent Tests

The `ai/` folder contains standalone prototype Python scripts communicating with Nebius AI endpoints:

1. **Setup Python Environment**:
   ```bash
   cd ai
   pip install -r requirements.txt
   ```

2. **Run Profile Extractor Agent Test**:
   Validates extracting structured JSON profile keys from user paragraph text.
   ```bash
   python tests/test_extractor.py
   ```

3. **Run Full Agent Integration Test Suite**:
   Runs the python agents sequentially: Profile extraction -> Search query generation -> Scheme extraction from search results -> Eligibility explanation -> Priority roadmap -> Multilingual translation.
   ```bash
   python tests/test_integration.py
   ```
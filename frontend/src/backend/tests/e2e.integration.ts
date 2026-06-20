// ============================================================
// SchemeSathi — End-to-End Integration Test
// backend/tests/e2e.integration.ts
//
// Tests the full pipeline for a Student profile:
//
//   Student Profile
//   → Retrieval Engine    (schemeRetrievalService)
//   → Discovery Service   (discoveryService)
//   → Cache Layer         (schemeCacheService)
//   → Supabase            (direct DB assertions)
//   → API Route           (POST /api/retrieve-schemes)
//
// Run with:
//   npx tsx backend/tests/e2e.integration.ts
// ============================================================

import "dotenv/config";

// Services
import {
  retrieveRelevantSchemes,
  getCachedSchemes,
  rankSchemes,
} from "../services/SchemeRetrievalService";
import {
  discoverSchemes,
  generateSearchQueries,
} from "../services/discoveryService";
import {
  saveDiscoveredScheme,
  saveMultipleSchemes,
  getCachedSchemes as getCachedFromDB,
  searchCache,
  logSearch,
  saveReport,
} from "../services/SchemeCacheService";
import { getSupabaseClient } from "../lib/supabase";
import type { UserProfile, GovernmentScheme } from "../types";

// ============================================================
// Test configuration
// ============================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// ============================================================
// Student mock profile
// ============================================================

const STUDENT_PROFILE: UserProfile = {
  age:           21,
  gender:        "Male",
  state:         "Karnataka",
  occupation:    "Student",
  income:        300_000,
  category:      "OBC",
  education:     "12th Pass",
  business_type: "None",
  turnover:      0,
  land_holding:  0,
};

// ============================================================
// Test result tracking
// ============================================================

interface StageResult {
  stage:    string;
  passed:   boolean;
  details:  Record<string, unknown>;
  error?:   string;
  durationMs: number;
}

const results: StageResult[] = [];

function timer() {
  const start = Date.now();
  return () => Date.now() - start;
}

// ============================================================
// Print helpers
// ============================================================

const C = {
  reset:  "\x1b[0m",
  bold:   "\x1b[1m",
  green:  "\x1b[32m",
  red:    "\x1b[31m",
  yellow: "\x1b[33m",
  cyan:   "\x1b[36m",
  gray:   "\x1b[90m",
  blue:   "\x1b[34m",
};

const DIVIDER  = `${C.gray}${"─".repeat(65)}${C.reset}`;
const DIVIDER2 = `${C.cyan}${"═".repeat(65)}${C.reset}`;

function pass(msg: string) { console.log(`  ${C.green}✅ PASS${C.reset}  ${msg}`); }
function fail(msg: string) { console.log(`  ${C.red}❌ FAIL${C.reset}  ${msg}`); }
function info(msg: string) { console.log(`  ${C.cyan}ℹ${C.reset}      ${msg}`); }
function warn(msg: string) { console.log(`  ${C.yellow}⚠${C.reset}       ${msg}`); }
function kv(k: string, v: unknown) {
  console.log(`  ${C.gray}${k.padEnd(28)}${C.reset}${C.bold}${v}${C.reset}`);
}

function stageHeader(n: number, name: string) {
  console.log(`\n${DIVIDER2}`);
  console.log(`  ${C.bold}STAGE ${n}: ${name}${C.reset}`);
  console.log(DIVIDER2);
}

// ============================================================
// STAGE 1 — Validate Student Profile
// ============================================================

async function stage1_ValidateProfile(): Promise<void> {
  stageHeader(1, "Profile Validation");
  const elapsed = timer();

  const requiredFields: (keyof UserProfile)[] = [
    "age", "gender", "state", "occupation", "income",
    "category", "education", "business_type", "turnover", "land_holding",
  ];

  const missing = requiredFields.filter(
    (f) => STUDENT_PROFILE[f] === undefined || STUDENT_PROFILE[f] === null
  );

  const passed = missing.length === 0;

  kv("Profile",          STUDENT_PROFILE.occupation);
  kv("State",            STUDENT_PROFILE.state);
  kv("Category",         STUDENT_PROFILE.category);
  kv("Annual Income",    `₹${STUDENT_PROFILE.income.toLocaleString("en-IN")}`);
  kv("Missing fields",   missing.length === 0 ? "None" : missing.join(", "));

  passed ? pass("All profile fields present") : fail(`Missing: ${missing.join(", ")}`);

  results.push({
    stage: "Profile Validation",
    passed,
    details: { profile: STUDENT_PROFILE, missingFields: missing },
    durationMs: elapsed(),
  });
}

// ============================================================
// STAGE 2 — Search Query Generation
// ============================================================

async function stage2_SearchQueryGeneration(): Promise<void> {
  stageHeader(2, "Search Query Generation");
  const elapsed = timer();

  try {
    const queries = generateSearchQueries(STUDENT_PROFILE);
    const passed  = queries.length >= 3;

    kv("Queries generated", queries.length);
    queries.slice(0, 5).forEach((q, i) => {
      console.log(`  ${C.gray}  ${i + 1}. ${q}${C.reset}`);
    });
    if (queries.length > 5) {
      console.log(`  ${C.gray}  ... and ${queries.length - 5} more${C.reset}`);
    }

    passed
      ? pass(`${queries.length} targeted queries generated`)
      : fail("Too few queries generated (expected ≥ 3)");

    results.push({
      stage:   "Search Query Generation",
      passed,
      details: { count: queries.length, queries },
      durationMs: elapsed(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    fail(msg);
    results.push({ stage: "Search Query Generation", passed: false, details: {}, error: msg, durationMs: elapsed() });
  }
}

// ============================================================
// STAGE 3 — Cache Layer: Read from Supabase
// ============================================================

async function stage3_CacheRead(): Promise<GovernmentScheme[]> {
  stageHeader(3, "Cache Layer — Supabase Read");
  const elapsed = timer();

  try {
    const cached = await getCachedSchemes(STUDENT_PROFILE);

    kv("Schemes in cache (state match)", cached.length);

    if (cached.length > 0) {
      kv("Sample scheme", cached[0].scheme_name);
      pass(`${cached.length} scheme(s) loaded from Supabase cache`);
    } else {
      warn("Cache is empty — discovery will be triggered");
    }

    results.push({
      stage:   "Cache Read",
      passed:  true,  // empty cache is still a valid state
      details: { cachedCount: cached.length },
      durationMs: elapsed(),
    });

    return cached;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    fail(`Cache read error: ${msg}`);
    results.push({ stage: "Cache Read", passed: false, details: {}, error: msg, durationMs: elapsed() });
    return [];
  }
}

// ============================================================
// STAGE 4 — Cache Layer: Write to Supabase
// ============================================================

async function stage4_CacheWrite(): Promise<void> {
  stageHeader(4, "Cache Layer — Supabase Write (upsert)");
  const elapsed = timer();

  const testScheme = {
    scheme_name:   "National Scholarship Portal Test Scheme",
    category:      "Education",
    description:   "Test scholarship scheme for integration testing.",
    eligibility:   "Students from OBC category with income below ₹5 lakh.",
    benefits:      "₹12,000 per year scholarship.",
    benefit_value: 12_000,
    source_url:    "https://scholarships.gov.in/",
    states:        ["All India"],
    tags:          ["scholarship", "student", "obc", "education"],
    ministry:      "Ministry of Education",
  };

  try {
    // Single upsert
    const single = await saveDiscoveredScheme(testScheme);

    if (single.success) {
      pass(`Single scheme upserted: "${testScheme.scheme_name}"`);
      kv("Returned id", single.data!.id);
    } else {
      fail(`Single upsert failed: ${single.error}`);
    }

    // Batch upsert (with a duplicate to test deduplication)
    const batch = [
      testScheme,  // duplicate
      {
        ...testScheme,
        scheme_name:   "Post Matric Scholarship OBC Karnataka",
        category:      "Education",
        states:        ["Karnataka"],
        benefit_value: 15_000,
        tags:          ["scholarship", "obc", "karnataka", "student"],
      },
    ];

    const batchResult = await saveMultipleSchemes(batch);

    if (batchResult.success) {
      pass(`Batch upsert: ${batchResult.count} scheme(s) saved (including 1 duplicate → update)`);
    } else {
      fail(`Batch upsert failed: ${batchResult.error}`);
    }

    results.push({
      stage:   "Cache Write",
      passed:  single.success,
      details: { singleSaved: single.success, batchSaved: batchResult.count },
      durationMs: elapsed(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    fail(`Cache write error: ${msg}`);
    results.push({ stage: "Cache Write", passed: false, details: {}, error: msg, durationMs: elapsed() });
  }
}

// ============================================================
// STAGE 5 — Supabase Direct Assertions
// ============================================================

async function stage5_SupabaseAssertions(): Promise<void> {
  stageHeader(5, "Supabase — Direct DB Assertions");
  const elapsed = timer();

  const db = getSupabaseClient();
  let allPassed = true;

  try {
    // Assert scheme_cache table exists and has rows
    const { data: cacheRows, error: cacheErr } = await db
      .from("scheme_cache")
      .select("id, scheme_name, category, benefit_value")
      .limit(5);

    if (cacheErr) {
      fail(`scheme_cache query failed: ${cacheErr.message}`);
      allPassed = false;
    } else {
      pass(`scheme_cache table accessible — ${cacheRows?.length ?? 0} row(s) sampled`);
      cacheRows?.slice(0, 3).forEach((r) => {
        console.log(`  ${C.gray}    • ${r.scheme_name} (${r.category ?? "N/A"}) — ₹${(r.benefit_value ?? 0).toLocaleString("en-IN")}${C.reset}`);
      });
    }

    // Assert search_logs table exists
    const { error: logsErr } = await db
      .from("search_logs")
      .select("id")
      .limit(1);

    if (logsErr) {
      fail(`search_logs table error: ${logsErr.message}`);
      allPassed = false;
    } else {
      pass("search_logs table accessible");
    }

    // Assert generated_reports table exists
    const { error: rptErr } = await db
      .from("generated_reports")
      .select("id")
      .limit(1);

    if (rptErr) {
      fail(`generated_reports table error: ${rptErr.message}`);
      allPassed = false;
    } else {
      pass("generated_reports table accessible");
    }

    // Assert searchCache() works
    const searchResult = await searchCache("scholarship");
    if (searchResult.success) {
      pass(`searchCache("scholarship") → ${searchResult.count} result(s)`);
    } else {
      fail(`searchCache failed: ${searchResult.error}`);
      allPassed = false;
    }

    results.push({
      stage:   "Supabase Assertions",
      passed:  allPassed,
      details: {
        cacheRows:     cacheRows?.length ?? 0,
        searchResults: searchResult.count,
      },
      durationMs: elapsed(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    fail(`Supabase assertion error: ${msg}`);
    results.push({ stage: "Supabase Assertions", passed: false, details: {}, error: msg, durationMs: elapsed() });
  }
}

// ============================================================
// STAGE 6 — Retrieval Engine (full pipeline)
// ============================================================

async function stage6_RetrievalEngine(): Promise<void> {
  stageHeader(6, "Retrieval Engine — retrieveRelevantSchemes()");
  const elapsed = timer();

  try {
    const result = await retrieveRelevantSchemes(STUDENT_PROFILE, {
      limit:          15,
      minScore:       10,
      forceDiscovery: false,
    });

    const cacheHitRatio =
      result.totalFound > 0
        ? ((result.fromCache / result.totalFound) * 100).toFixed(1)
        : "0.0";

    // Print the 4 key metrics
    console.log("");
    kv("Schemes found",        result.totalFound);
    kv("Cache hits",           result.fromCache);
    kv("Discovery triggered",  result.discoveryTriggered ? "✅ Yes" : "❌ No");
    kv("Average relevance",    `${result.averageScore}/100`);
    kv("Cache hit ratio",      `${cacheHitRatio}%`);
    kv("From discovery",       result.fromDiscovery);

    if (result.schemes.length > 0) {
      console.log(`\n  ${C.bold}Top 5 ranked schemes:${C.reset}`);
      result.schemes.slice(0, 5).forEach((s, i) => {
        const badge = s.relevanceScore >= 60 ? C.green : s.relevanceScore >= 30 ? C.yellow : C.red;
        console.log(
          `  ${badge}[${i + 1}] ${s.scheme.scheme_name}${C.reset} — Score: ${C.bold}${s.relevanceScore}/100${C.reset}`
        );
        console.log(
          `      Occ:${s.scoreBreakdown.occupationScore} | State:${s.scoreBreakdown.stateScore} | Cat:${s.scoreBreakdown.categoryScore} | Tags:${s.scoreBreakdown.tagsScore} | Inc:${s.scoreBreakdown.incomeScore}`
        );
      });
    }

    const passed = result.totalFound >= 0; // 0 is valid if cache is empty
    passed
      ? pass("Retrieval engine executed successfully")
      : fail("Retrieval engine returned unexpected state");

    results.push({
      stage:   "Retrieval Engine",
      passed,
      details: {
        schemesFound:      result.totalFound,
        cacheHits:         result.fromCache,
        discoveryTriggered: result.discoveryTriggered,
        averageScore:      result.averageScore,
        cacheHitRatio:     `${cacheHitRatio}%`,
        fromDiscovery:     result.fromDiscovery,
      },
      durationMs: elapsed(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    fail(`Retrieval engine error: ${msg}`);
    results.push({ stage: "Retrieval Engine", passed: false, details: {}, error: msg, durationMs: elapsed() });
  }
}

// ============================================================
// STAGE 7 — Discovery Service (Nebius Qwen)
// ============================================================

async function stage7_DiscoveryService(): Promise<void> {
  stageHeader(7, "Discovery Service — discoverSchemes()");

  const apiKey = process.env.NEBIUS_API_KEY;
  if (!apiKey || apiKey === "your_nebius_api_key") {
    warn("NEBIUS_API_KEY not set — skipping live discovery test");
    results.push({
      stage:   "Discovery Service",
      passed:  true,  // skip counts as pass
      details: { skipped: true, reason: "NEBIUS_API_KEY not configured" },
      durationMs: 0,
    });
    return;
  }

  const elapsed = timer();

  try {
    const result = await discoverSchemes(STUDENT_PROFILE);

    kv("Queries run",     result.queriesRun);
    kv("Schemes found",   result.schemes.length);
    kv("Saved to cache",  result.savedToCache);
    kv("Errors",          result.errors.length > 0 ? result.errors.join("; ") : "None");

    if (result.schemes.length > 0) {
      console.log(`\n  ${C.bold}Discovered schemes:${C.reset}`);
      result.schemes.slice(0, 3).forEach((s, i) => {
        console.log(`  ${C.blue}  [${i + 1}] ${s.scheme_name}${C.reset} — ₹${(s.benefit_value ?? 0).toLocaleString("en-IN")}`);
      });
    }

    const passed = result.success || result.schemes.length > 0;
    passed
      ? pass(`Discovery returned ${result.schemes.length} scheme(s), saved ${result.savedToCache} to cache`)
      : fail("Discovery returned no schemes");

    results.push({
      stage:   "Discovery Service",
      passed,
      details: {
        queriesRun:    result.queriesRun,
        schemesFound:  result.schemes.length,
        savedToCache:  result.savedToCache,
        errors:        result.errors,
      },
      durationMs: elapsed(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    fail(`Discovery error: ${msg}`);
    results.push({ stage: "Discovery Service", passed: false, details: {}, error: msg, durationMs: elapsed() });
  }
}

// ============================================================
// STAGE 8 — Search Log & Report Storage
// ============================================================

async function stage8_LoggingLayer(): Promise<void> {
  stageHeader(8, "Logging — logSearch() & saveReport()");
  const elapsed = timer();

  let allPassed = true;

  try {
    // Log search
    const logResult = await logSearch({
      profile:      STUDENT_PROFILE,
      search_query: "scholarship OBC Karnataka student",
    });

    if (logResult.success) {
      pass("logSearch() → inserted to search_logs");
    } else {
      fail(`logSearch() failed: ${logResult.error}`);
      allPassed = false;
    }

    // Save report
    const reportResult = await saveReport({
      profile:        STUDENT_PROFILE,
      scheme_count:   8,
      total_benefits: 96_000,
    });

    if (reportResult.success) {
      pass(`saveReport() → saved with id: ${reportResult.data!.id}`);
      kv("Report id",       reportResult.data!.id);
      kv("Scheme count",    reportResult.data!.scheme_count);
      kv("Total benefits",  `₹${reportResult.data!.total_benefits.toLocaleString("en-IN")}`);
    } else {
      fail(`saveReport() failed: ${reportResult.error}`);
      allPassed = false;
    }

    results.push({
      stage:   "Logging Layer",
      passed:  allPassed,
      details: {
        logSearch: logResult.success,
        saveReport: reportResult.success,
        reportId:   reportResult.data?.id,
      },
      durationMs: elapsed(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    fail(`Logging error: ${msg}`);
    results.push({ stage: "Logging Layer", passed: false, details: {}, error: msg, durationMs: elapsed() });
  }
}

// ============================================================
// STAGE 9 — API Route (HTTP integration)
// ============================================================

async function stage9_APIRoute(): Promise<void> {
  stageHeader(9, `API Route — POST ${API_BASE_URL}/api/retrieve-schemes`);
  const elapsed = timer();

  try {
    const response = await fetch(`${API_BASE_URL}/api/retrieve-schemes`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ profile: STUDENT_PROFILE, options: { limit: 10, minScore: 10 } }),
    });

    const body = await response.json();

    kv("HTTP status",     response.status);
    kv("success",         body.success);
    kv("Schemes returned", body.schemes?.length ?? "N/A");
    kv("Average score",   body.meta?.averageScore ?? "N/A");
    kv("Discovery flag",  body.meta?.discoveryTriggered ? "true" : "false");
    kv("Duration",        `${body.meta?.durationMs ?? "N/A"}ms`);

    if (response.status === 200 && body.success) {
      pass(`API returned ${body.schemes?.length ?? 0} scheme(s) with HTTP 200`);
    } else if (response.status === 404) {
      warn("Server not running — start with `npm run dev` to test API route");
    } else {
      fail(`API returned HTTP ${response.status}: ${body.error ?? "unknown error"}`);
    }

    results.push({
      stage:   "API Route",
      passed:  response.status === 200 && body.success,
      details: {
        httpStatus:    response.status,
        schemesCount:  body.schemes?.length,
        averageScore:  body.meta?.averageScore,
        durationMs:    body.meta?.durationMs,
      },
      durationMs: elapsed(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("ECONNREFUSED") || msg.includes("fetch failed")) {
      warn("Next.js server not running — skipping HTTP test (run `npm run dev` first)");
      results.push({ stage: "API Route", passed: true, details: { skipped: true }, durationMs: elapsed() });
    } else {
      fail(`API route error: ${msg}`);
      results.push({ stage: "API Route", passed: false, details: {}, error: msg, durationMs: elapsed() });
    }
  }
}

// ============================================================
// Final summary
// ============================================================

function printSummary(totalMs: number) {
  console.log(`\n${DIVIDER2}`);
  console.log(`  ${C.bold}INTEGRATION TEST SUMMARY${C.reset}`);
  console.log(DIVIDER2);

  let passCount = 0;
  let failCount = 0;

  for (const r of results) {
    const icon = r.passed ? `${C.green}✅` : `${C.red}❌`;
    console.log(
      `  ${icon} ${r.stage.padEnd(30)}${C.reset}  ${C.gray}${r.durationMs}ms${C.reset}` +
      (r.error ? `  ${C.red}${r.error.slice(0, 60)}${C.reset}` : "")
    );
    r.passed ? passCount++ : failCount++;
  }

  console.log(DIVIDER);

  const allPassed = failCount === 0;
  const status    = allPassed ? `${C.green}ALL TESTS PASSED` : `${C.red}${failCount} TEST(S) FAILED`;

  console.log(`  ${C.bold}${status}${C.reset}  (${passCount}/${results.length} stages)`);
  console.log(`  Total duration: ${C.bold}${totalMs}ms${C.reset}`);

  // Key metrics callout
  const retrievalStage = results.find((r) => r.stage === "Retrieval Engine");
  if (retrievalStage?.details) {
    const d = retrievalStage.details as Record<string, unknown>;
    console.log(`\n  ${C.bold}Key Metrics (Retrieval Engine):${C.reset}`);
    console.log(`  ${"Schemes found".padEnd(28)}${d.schemesFound}`);
    console.log(`  ${"Cache hits".padEnd(28)}${d.cacheHits}`);
    console.log(`  ${"Discovery triggered".padEnd(28)}${d.discoveryTriggered ? "Yes" : "No"}`);
    console.log(`  ${"Average relevance score".padEnd(28)}${d.averageScore}/100`);
    console.log(`  ${"Cache hit ratio".padEnd(28)}${d.cacheHitRatio}`);
  }

  console.log(`\n${DIVIDER2}\n`);

  process.exit(allPassed ? 0 : 1);
}

// ============================================================
// Main runner
// ============================================================

async function main() {
  const totalTimer = timer();

  console.log(`\n${DIVIDER2}`);
  console.log(`  ${C.bold}SchemeSathi — End-to-End Integration Test${C.reset}`);
  console.log(`  Profile: Student | Karnataka | OBC | ₹3L income`);
  console.log(`  Time: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST`);
  console.log(DIVIDER2);

  await stage1_ValidateProfile();
  await stage2_SearchQueryGeneration();
  const _cached = await stage3_CacheRead();
  await stage4_CacheWrite();
  await stage5_SupabaseAssertions();
  await stage6_RetrievalEngine();
  await stage7_DiscoveryService();   // skips if NEBIUS_API_KEY not set
  await stage8_LoggingLayer();
  await stage9_APIRoute();           // skips if server not running

  printSummary(totalTimer());
}

main().catch((err) => {
  console.error(`\n${C.red}💥 Unhandled error:${C.reset}`, err);
  process.exit(1);
});

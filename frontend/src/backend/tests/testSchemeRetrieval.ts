// ============================================================
// SchemeSathi — Retrieval Service Test Script
// backend/tests/testSchemeRetrieval.ts
//
// Run with:
//   npx ts-node --project tsconfig.json backend/tests/testSchemeRetrieval.ts
// Or if using Next.js:
//   npx tsx backend/tests/testSchemeRetrieval.ts
// ============================================================

import "dotenv/config"; // loads .env automatically

import {
  retrieveRelevantSchemes,
  type RetrievalResult,
} from "../services/SchemeRetrievalService";
import type { UserProfile } from "../types";

// ============================================================
// Mock Profiles
// ============================================================

const PROFILES: Array<{ label: string; profile: UserProfile }> = [
  // 1. Student — Karnataka, OBC, ₹3 lakh income
  {
    label: "1. Student (Karnataka, OBC, ₹3L income)",
    profile: {
      age: 21,
      gender: "Male",
      state: "Karnataka",
      occupation: "Student",
      income: 300_000,
      category: "OBC",
      education: "12th Pass",
      business_type: "None",
      turnover: 0,
      land_holding: 0,
    },
  },

  // 2. Farmer — Tamil Nadu, 2 acres
  {
    label: "2. Farmer (Tamil Nadu, 2 acres land)",
    profile: {
      age: 45,
      gender: "Male",
      state: "Tamil Nadu",
      occupation: "Farmer",
      income: 120_000,
      category: "General",
      education: "10th Pass",
      business_type: "None",
      turnover: 0,
      land_holding: 2,
    },
  },

  // 3. Woman Entrepreneur — Maharashtra
  {
    label: "3. Woman Entrepreneur (Maharashtra)",
    profile: {
      age: 34,
      gender: "Female",
      state: "Maharashtra",
      occupation: "Business Owner",
      income: 600_000,
      category: "General",
      education: "Graduate",
      business_type: "Micro",
      turnover: 1_500_000,
      land_holding: 0,
    },
  },

  // 4. MSME Manufacturing Owner — 15 employees, ₹40L turnover
  {
    label: "4. MSME Manufacturing Owner (₹40L turnover, 15 employees)",
    profile: {
      age: 42,
      gender: "Male",
      state: "Gujarat",
      occupation: "Business Owner",
      income: 1_200_000,
      category: "General",
      education: "Graduate",
      business_type: "Small",
      turnover: 4_000_000,
      land_holding: 0,
    },
  },
];

// ============================================================
// Display helpers
// ============================================================

const DIVIDER = "═".repeat(65);
const SUB_DIV = "─".repeat(65);

function fmt(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}

function printHeader(label: string) {
  console.log(`\n${DIVIDER}`);
  console.log(`  🔍 PROFILE: ${label}`);
  console.log(DIVIDER);
}

function printScheme(
  index: number,
  scheme: RetrievalResult["schemes"][number],
  fromCache: boolean
) {
  const { scheme: s, relevanceScore, scoreBreakdown } = scheme;

  const badge =
    relevanceScore >= 70 ? "🟢" : relevanceScore >= 40 ? "🟡" : "🔴";

  console.log(`\n  ${badge} [${index + 1}] ${s.scheme_name}`);
  console.log(`      Category  : ${s.category ?? "N/A"}`);
  console.log(`      Ministry  : ${s.ministry ?? "N/A"}`);
  console.log(`      States    : ${(s.states ?? []).join(", ") || "All India"}`);
  console.log(`      Benefit   : ${fmt(s.benefit_value ?? 0)}`);
  console.log(`      Source    : ${fromCache ? "💾 cache" : "🌐 discovery"}`);
  console.log(`      ┌─ Relevance Score: ${relevanceScore}/100`);
  console.log(`      │   Occupation : ${scoreBreakdown.occupationScore}/30`);
  console.log(`      │   State      : ${scoreBreakdown.stateScore}/25`);
  console.log(`      │   Category   : ${scoreBreakdown.categoryScore}/20`);
  console.log(`      │   Tags       : ${scoreBreakdown.tagsScore}/15`);
  console.log(`      └─  Income     : ${scoreBreakdown.incomeScore}/10`);
}

function printSummary(label: string, result: RetrievalResult) {
  const cacheHitRatio =
    result.totalFound > 0
      ? ((result.fromCache / result.totalFound) * 100).toFixed(1)
      : "0.0";

  console.log(`\n${SUB_DIV}`);
  console.log(`  📊 SUMMARY — ${label}`);
  console.log(SUB_DIV);
  console.log(`  Total schemes found   : ${result.totalFound}`);
  console.log(`  Average relevance     : ${result.averageScore}/100`);
  console.log(`  From Supabase cache   : ${result.fromCache}`);
  console.log(`  From discovery        : ${result.fromDiscovery}`);
  console.log(`  Cache hit ratio       : ${cacheHitRatio}%`);
  console.log(`  Discovery triggered   : ${result.discoveryTriggered ? "✅ Yes" : "❌ No"}`);
}

// ============================================================
// Core test runner
// ============================================================

async function runProfileTest(
  label: string,
  profile: UserProfile
): Promise<void> {
  printHeader(label);

  let result: RetrievalResult;

  try {
    const start = Date.now();
    result = await retrieveRelevantSchemes(profile, {
      limit: 10,
      minScore: 10,
    });
    const elapsed = Date.now() - start;
    console.log(`\n  ⏱  Completed in ${elapsed}ms`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\n  ❌ FAILED: ${msg}`);
    return;
  }

  if (result.totalFound === 0) {
    console.log("\n  ⚠️  No schemes found for this profile.");
  } else {
    console.log(`\n  📋 TOP ${result.schemes.length} SCHEMES:`);
    result.schemes.forEach((s, i) => {
      const fromCache = i < result.fromCache;
      printScheme(i, s, fromCache);
    });
  }

  printSummary(label, result);
}

// ============================================================
// Main
// ============================================================

async function main() {
  console.log(`\n${"█".repeat(65)}`);
  console.log("  SchemeSathi — Scheme Retrieval Service Test");
  console.log(`  Running ${PROFILES.length} profile tests against Supabase`);
  console.log(`  Time: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST`);
  console.log(`${"█".repeat(65)}`);

  for (const { label, profile } of PROFILES) {
    await runProfileTest(label, profile);
    // Small delay between tests to avoid rate limiting
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\n${"═".repeat(65)}`);
  console.log("  ✅ All tests completed.");
  console.log(`${"═".repeat(65)}\n`);
}

main().catch((err) => {
  console.error("\n💥 Unhandled error:", err);
  process.exit(1);
});

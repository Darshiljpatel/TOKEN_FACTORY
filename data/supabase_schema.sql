-- ============================================================
-- SchemeSathi — Supabase PostgreSQL Schema
-- Generated: 2026-06-20
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. scheme_cache
--    Stores cached government scheme data fetched from sources.
-- ============================================================

CREATE TABLE IF NOT EXISTS scheme_cache (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    scheme_name   TEXT          NOT NULL UNIQUE,
    category      TEXT,
    description   TEXT,
    eligibility   TEXT,
    benefits      TEXT,
    benefit_value BIGINT        DEFAULT 0,
    source_url    TEXT,
    states        TEXT[]        DEFAULT '{}',
    tags          TEXT[]        DEFAULT '{}',
    ministry      TEXT,
    fetched_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_scheme_cache_category   ON scheme_cache (category);
CREATE INDEX IF NOT EXISTS idx_scheme_cache_ministry   ON scheme_cache (ministry);
CREATE INDEX IF NOT EXISTS idx_scheme_cache_states     ON scheme_cache USING GIN (states);
CREATE INDEX IF NOT EXISTS idx_scheme_cache_tags       ON scheme_cache USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_scheme_cache_fetched_at ON scheme_cache (fetched_at DESC);

-- ============================================================
-- 2. search_logs
--    Tracks user search activity for analytics and auditing.
-- ============================================================

CREATE TABLE IF NOT EXISTS search_logs (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    profile       JSONB         DEFAULT '{}',
    search_query  TEXT,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_search_logs_created_at  ON search_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_logs_profile     ON search_logs USING GIN (profile);

-- ============================================================
-- 3. generated_reports
--    Stores metadata for AI-generated eligibility reports.
-- ============================================================

CREATE TABLE IF NOT EXISTS generated_reports (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    profile         JSONB         DEFAULT '{}',
    scheme_count    INTEGER       DEFAULT 0,
    total_benefits  BIGINT        DEFAULT 0,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_generated_reports_created_at ON generated_reports (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_reports_profile    ON generated_reports USING GIN (profile);

-- ============================================================
-- Row Level Security (RLS)
-- Enable RLS on all tables. Policies should be added based
-- on your auth strategy (anon key, service role, etc.).
-- ============================================================

ALTER TABLE scheme_cache       ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_reports  ENABLE ROW LEVEL SECURITY;

-- Allow public read access to scheme_cache (schemes are public data)
CREATE POLICY "Allow public read access on scheme_cache"
    ON scheme_cache
    FOR SELECT
    USING (true);

-- Allow authenticated inserts into search_logs
CREATE POLICY "Allow anon insert on search_logs"
    ON search_logs
    FOR INSERT
    WITH CHECK (true);

-- Allow authenticated inserts into generated_reports
CREATE POLICY "Allow anon insert on generated_reports"
    ON generated_reports
    FOR INSERT
    WITH CHECK (true);

-- Allow public read on generated_reports (users view their reports)
CREATE POLICY "Allow public read on generated_reports"
    ON generated_reports
    FOR SELECT
    USING (true);

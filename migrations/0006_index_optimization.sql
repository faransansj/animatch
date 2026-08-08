-- Index optimization migration
-- This migration adds indexes to improve query performance for analysis logs and feedback.

-- 1. Index on analysis_logs.language for filtering queries by language
CREATE INDEX IF NOT EXISTS idx_analysis_language ON analysis_logs(language);

-- 2. Index on match_feedback.ab_variant for A/B test analysis
CREATE INDEX IF NOT EXISTS idx_feedback_ab_variant ON match_feedback(ab_variant);

-- 3. Composite index for trending queries (recent activity sorted by character and anime)
CREATE INDEX IF NOT EXISTS idx_analysis_logs_recent ON analysis_logs(created_at, matched_character, matched_anime);

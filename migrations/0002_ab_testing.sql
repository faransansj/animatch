-- A/B testing support: add variant tracking to analysis_logs
ALTER TABLE analysis_logs ADD COLUMN ab_variant TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_analysis_ab_variant ON analysis_logs(ab_variant);

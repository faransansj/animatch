-- match_feedback table for rating/A-B test data
-- Previously defined only in schema.sql, never applied to D1
CREATE TABLE IF NOT EXISTS match_feedback (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  orientation       TEXT NOT NULL,
  matched_character TEXT NOT NULL,
  matched_anime     TEXT NOT NULL,
  similarity_score  REAL,
  ab_variant        TEXT NOT NULL DEFAULT '',
  rating            TEXT CHECK(rating IN ('up', 'down')),
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_feedback_created_at  ON match_feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_rating      ON match_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_feedback_orientation ON match_feedback(orientation);

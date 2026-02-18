-- AniMatch analytics schema
CREATE TABLE IF NOT EXISTS analysis_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orientation TEXT NOT NULL,
  matched_character TEXT NOT NULL,
  matched_anime TEXT NOT NULL,
  similarity_score REAL NOT NULL,
  confidence TEXT NOT NULL,
  dual_matching INTEGER NOT NULL DEFAULT 0,
  language TEXT NOT NULL DEFAULT 'ko',
  user_agent TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_analysis_created_at ON analysis_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_analysis_character ON analysis_logs(matched_character);
CREATE INDEX IF NOT EXISTS idx_analysis_anime ON analysis_logs(matched_anime);

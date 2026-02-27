-- ============================================================
-- AniMatch Character Database Schema
-- Cloudflare D1 Compatible (SQLite)
-- Version: 1.1.0  (2026-02-27 — synced with migrations/)
-- ============================================================
-- NOTE: This file is a reference document only.
--       All changes must also be applied via a numbered migration in migrations/.
-- ============================================================

-- 작품 테이블
CREATE TABLE IF NOT EXISTS animes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title_ko      TEXT NOT NULL,           -- 한국어 제목
  title_jp      TEXT,                    -- 일본어 제목
  title_en      TEXT,                    -- 영어 제목
  genre         TEXT NOT NULL,           -- 장르 (JSON 배열)
  genre_en      TEXT,                    -- 영문 장르 (JSON 배열)
  orientation   TEXT NOT NULL CHECK(orientation IN ('male', 'female')),
  tier          INTEGER NOT NULL CHECK(tier IN (1, 2, 3)),  -- 1=인기, 2=발견, 3=트렌드
  mal_id        INTEGER,                 -- MyAnimeList ID
  anilist_id    INTEGER,                 -- AniList ID
  mal_members   INTEGER DEFAULT 0,       -- MAL 멤버 수
  image_url     TEXT,                    -- 작품 대표 이미지
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

-- 캐릭터 테이블
CREATE TABLE IF NOT EXISTS characters (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  anime_id      INTEGER NOT NULL REFERENCES animes(id),
  name_ko       TEXT NOT NULL,           -- 한국어 이름
  name_jp       TEXT,                    -- 일본어 이름
  name_en       TEXT,                    -- 영어 이름
  gender        TEXT NOT NULL CHECK(gender IN ('male', 'female')),
  role          TEXT NOT NULL CHECK(role IN ('protagonist', 'heroine')),
  partner_id    INTEGER REFERENCES characters(id),  -- 매칭 상대
  image_url     TEXT,                    -- 대표 이미지 URL
  personality   TEXT,                    -- 성격 설명 (JSON 배열)
  personality_en TEXT,                   -- 영문 성격 설명 (JSON 배열)
  charm_points  TEXT,                    -- 애인으로서의 매력 포인트
  charm_points_en TEXT,                  -- 영문 매력 포인트
  iconic_quote  TEXT,                    -- 명대사 (가챠 연출용)
  iconic_quote_en TEXT,                  -- 영문 명대사
  tags          TEXT,                    -- 캐릭터 태그 (JSON 배열)
  tags_en       TEXT,                    -- 영문 캐릭터 태그 (JSON 배열)
  color_primary TEXT,                    -- 캐릭터 테마 컬러 (CSS gradient)
  emoji         TEXT,                    -- 대표 이모지
  mal_favorites INTEGER DEFAULT 0,       -- MAL 즐겨찾기 수
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_characters_anime_id ON characters(anime_id);
CREATE INDEX IF NOT EXISTS idx_characters_role ON characters(role);
CREATE INDEX IF NOT EXISTS idx_characters_gender ON characters(gender);
CREATE INDEX IF NOT EXISTS idx_characters_partner ON characters(partner_id);
CREATE INDEX IF NOT EXISTS idx_animes_orientation ON animes(orientation);
CREATE INDEX IF NOT EXISTS idx_animes_tier ON animes(tier);

-- 분석 로그 테이블
-- Applied via: migrations/0001_initial.sql + 0002_ab_testing.sql
CREATE TABLE IF NOT EXISTS analysis_logs (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  orientation       TEXT NOT NULL,
  matched_character TEXT NOT NULL,
  matched_anime     TEXT NOT NULL,
  similarity_score  REAL NOT NULL,
  confidence        TEXT NOT NULL,
  dual_matching     INTEGER NOT NULL DEFAULT 0,
  language          TEXT NOT NULL DEFAULT 'ko',
  user_agent        TEXT NOT NULL DEFAULT '',
  ab_variant        TEXT NOT NULL DEFAULT '',  -- added in 0002_ab_testing.sql
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_analysis_created_at  ON analysis_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_analysis_character   ON analysis_logs(matched_character);
CREATE INDEX IF NOT EXISTS idx_analysis_anime       ON analysis_logs(matched_anime);
CREATE INDEX IF NOT EXISTS idx_analysis_ab_variant  ON analysis_logs(ab_variant);

-- 매칭 평가 피드백 테이블
-- Applied via: migrations/0003_match_feedback.sql
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

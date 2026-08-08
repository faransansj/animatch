-- Rebuild the legacy character tables with the canonical D1 schema.
-- SQLite does not support ALTER TABLE ... ADD CONSTRAINT.
-- 0004 created a partial OG-metadata schema; this migration completes its
-- columns and installs the final checks and foreign keys while preserving
-- legacy metadata columns.

-- Abort before changing tables if existing rows cannot satisfy the canonical
-- required metadata or foreign-key relationships. Seed data is applied after
-- migrations and is unaffected.
PRAGMA defer_foreign_keys = ON;

CREATE TABLE _migration_0007_required_metadata (
  valid INTEGER NOT NULL CHECK (valid = 1)
);

INSERT INTO _migration_0007_required_metadata (valid)
SELECT CASE WHEN EXISTS (
  SELECT 1
  FROM animes
  WHERE orientation IS NULL
     OR orientation NOT IN ('male', 'female')
     OR tier IS NULL
     OR tier NOT IN (1, 2, 3)
) OR EXISTS (
  SELECT 1
  FROM characters
  WHERE gender IS NULL
     OR gender NOT IN ('male', 'female')
     OR role IS NULL
     OR role NOT IN ('protagonist', 'heroine')
     OR NOT EXISTS (SELECT 1 FROM animes AS a WHERE a.id = characters.anime_id)
     OR (partner_id IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM characters AS p WHERE p.id = characters.partner_id
     ))
) THEN 0 ELSE 1 END;

DROP TABLE _migration_0007_required_metadata;

CREATE TABLE animes_new (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title_ko      TEXT NOT NULL,
  title_jp      TEXT,
  title_ja      TEXT,
  title_zh_tw   TEXT,
  title_en      TEXT,
  genre         TEXT NOT NULL,
  genre_en      TEXT,
  orientation   TEXT NOT NULL CHECK(orientation IN ('male', 'female')),
  tier          INTEGER NOT NULL CHECK(tier IN (1, 2, 3)),
  mal_id        INTEGER,
  anilist_id    INTEGER,
  mal_members   INTEGER DEFAULT 0,
  image_url     TEXT,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

INSERT INTO animes_new (
  id, title_ko, title_jp, title_ja, title_zh_tw, title_en, genre, genre_en,
  orientation, tier, mal_id, anilist_id, mal_members, image_url, created_at, updated_at
)
SELECT
  id,
  title_ko,
  title_jp,
  title_ja,
  title_zh_tw,
  title_en,
  COALESCE(genre, '[]'),
  genre_en,
  orientation,
  tier,
  mal_id,
  anilist_id,
  COALESCE(mal_members, 0),
  image_url,
  datetime('now'),
  datetime('now')
FROM animes;

CREATE TABLE characters_new (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  anime_id            INTEGER NOT NULL REFERENCES animes_new(id) ON DELETE CASCADE,
  name_ko             TEXT NOT NULL,
  name_jp             TEXT,
  name_ja             TEXT,
  name_zh_tw          TEXT,
  name_en             TEXT,
  gender              TEXT NOT NULL CHECK(gender IN ('male', 'female')),
  role                TEXT NOT NULL CHECK(role IN ('protagonist', 'heroine')),
  partner_id          INTEGER REFERENCES characters_new(id) ON DELETE SET NULL,
  image_url           TEXT,
  personality         TEXT,
  personality_en      TEXT,
  charm_points        TEXT,
  charm_en            TEXT,
  charm_points_en     TEXT,
  iconic_quote        TEXT,
  iconic_quote_en     TEXT,
  tags                TEXT,
  tags_en             TEXT,
  color_primary       TEXT,
  emoji               TEXT,
  mal_favorites       INTEGER DEFAULT 0,
  created_at          TEXT DEFAULT (datetime('now')),
  updated_at          TEXT DEFAULT (datetime('now')),
  heroine_id_original INTEGER
);

INSERT INTO characters_new (
  id, anime_id, name_ko, name_jp, name_ja, name_zh_tw, name_en, gender,
  role, partner_id, image_url, personality, personality_en, charm_points,
  charm_en, charm_points_en, iconic_quote, iconic_quote_en, tags, tags_en,
  color_primary, emoji, mal_favorites, created_at, updated_at,
  heroine_id_original
)
SELECT
  id,
  anime_id,
  name_ko,
  name_jp,
  name_ja,
  name_zh_tw,
  name_en,
  gender,
  role,
  partner_id,
  image_url,
  personality,
  personality_en,
  charm_points,
  charm_en,
  charm_points_en,
  iconic_quote,
  iconic_quote_en,
  tags,
  tags_en,
  color_primary,
  emoji,
  COALESCE(mal_favorites, 0),
  datetime('now'),
  datetime('now'),
  heroine_id_original
FROM characters;

-- Keep 0004's legacy metadata columns so this rebuild does not discard data.
-- New API consumers use characters.id, which is the identifier in embeddings.json.
DROP TABLE characters;
DROP TABLE animes;
ALTER TABLE animes_new RENAME TO animes;
ALTER TABLE characters_new RENAME TO characters;

CREATE INDEX IF NOT EXISTS idx_characters_anime_id ON characters(anime_id);
CREATE INDEX IF NOT EXISTS idx_characters_role ON characters(role);
CREATE INDEX IF NOT EXISTS idx_characters_gender ON characters(gender);
CREATE INDEX IF NOT EXISTS idx_characters_partner ON characters(partner_id);
CREATE INDEX IF NOT EXISTS idx_characters_heroine_id ON characters(heroine_id_original);
CREATE INDEX IF NOT EXISTS idx_animes_orientation ON animes(orientation);
CREATE INDEX IF NOT EXISTS idx_animes_tier ON animes(tier);

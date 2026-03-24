-- Tables for dynamic OG metadata in _middleware.ts
CREATE TABLE IF NOT EXISTS animes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title_ko TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_ja TEXT,
  title_zh_tw TEXT
);

CREATE TABLE IF NOT EXISTS characters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  anime_id INTEGER NOT NULL REFERENCES animes(id),
  name_ko TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_ja TEXT,
  name_zh_tw TEXT,
  image_url TEXT NOT NULL,
  personality_en TEXT,
  charm_en TEXT,
  tags_en TEXT,
  heroine_id_original INTEGER NOT NULL -- ID from embeddings.json
);

CREATE INDEX IF NOT EXISTS idx_characters_heroine_id ON characters(heroine_id_original);

-- Add the columns required by db/schema.sql to the partial tables created by 0004.
-- 0007 rebuilds both tables to apply NOT NULL, CHECK, and foreign-key constraints.

-- 1. Update animes table
ALTER TABLE animes ADD COLUMN title_jp TEXT;
ALTER TABLE animes ADD COLUMN genre TEXT;
ALTER TABLE animes ADD COLUMN genre_en TEXT;
ALTER TABLE animes ADD COLUMN orientation TEXT;
ALTER TABLE animes ADD COLUMN tier INTEGER;
ALTER TABLE animes ADD COLUMN mal_id INTEGER;
ALTER TABLE animes ADD COLUMN anilist_id INTEGER;
ALTER TABLE animes ADD COLUMN mal_members INTEGER DEFAULT 0;
ALTER TABLE animes ADD COLUMN image_url TEXT;

-- 2. Update characters table
ALTER TABLE characters ADD COLUMN name_jp TEXT;
ALTER TABLE characters ADD COLUMN gender TEXT;
ALTER TABLE characters ADD COLUMN role TEXT;
ALTER TABLE characters ADD COLUMN partner_id INTEGER;
ALTER TABLE characters ADD COLUMN personality TEXT;
-- ALTER TABLE characters ADD COLUMN personality_en TEXT; -- Already exists in 0004
ALTER TABLE characters ADD COLUMN charm_points TEXT;
ALTER TABLE characters ADD COLUMN charm_points_en TEXT;
ALTER TABLE characters ADD COLUMN iconic_quote TEXT;
ALTER TABLE characters ADD COLUMN iconic_quote_en TEXT;
ALTER TABLE characters ADD COLUMN tags TEXT;
-- ALTER TABLE characters ADD COLUMN tags_en TEXT; -- Already exists in 0004
ALTER TABLE characters ADD COLUMN color_primary TEXT;
ALTER TABLE characters ADD COLUMN emoji TEXT;
ALTER TABLE characters ADD COLUMN mal_favorites INTEGER DEFAULT 0;

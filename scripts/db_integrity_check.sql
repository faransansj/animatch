-- Database integrity checks for SQLite / Cloudflare D1.
-- Each query returns zero rows when the check passes.

-- 1. Foreign-key integrity: every character belongs to an anime.
SELECT 'ORPHANED_CHARACTER' AS issue, c.id, c.name_ko, c.anime_id
FROM characters AS c
WHERE c.anime_id IS NULL
   OR NOT EXISTS (SELECT 1 FROM animes AS a WHERE a.id = c.anime_id);

-- 2. Foreign-key integrity: every partner exists.
SELECT 'INVALID_PARTNER_ID' AS issue, c.id, c.name_ko, c.partner_id
FROM characters AS c
WHERE c.partner_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM characters AS p WHERE p.id = c.partner_id);

-- 3. Matching pairs must point at each other.
SELECT 'NON_RECIPROCAL_PARTNER' AS issue,
       c1.id AS char1_id,
       c1.name_ko AS char1_name,
       c2.id AS char2_id,
       c2.name_ko AS char2_name
FROM characters AS c1
JOIN characters AS c2 ON c1.partner_id = c2.id
WHERE c2.partner_id IS NULL OR c2.partner_id <> c1.id;

-- 4. Enumerated anime fields.
SELECT 'INVALID_ORIENTATION' AS issue, id, title_ko, orientation
FROM animes
WHERE orientation IS NOT NULL AND orientation NOT IN ('male', 'female');

SELECT 'INVALID_TIER' AS issue, id, title_ko, tier
FROM animes
WHERE tier IS NOT NULL AND tier NOT IN (1, 2, 3);

-- 5. Enumerated character fields.
SELECT 'INVALID_GENDER' AS issue, id, name_ko, gender
FROM characters
WHERE gender IS NOT NULL AND gender NOT IN ('male', 'female');

SELECT 'INVALID_ROLE' AS issue, id, name_ko, role
FROM characters
WHERE role IS NOT NULL AND role NOT IN ('protagonist', 'heroine');

-- 6. Required fields that SQLite should enforce in the canonical schema.
SELECT 'MISSING_TITLE_KO' AS issue, id FROM animes WHERE title_ko IS NULL;
SELECT 'MISSING_GENRE' AS issue, id FROM animes WHERE genre IS NULL;
SELECT 'MISSING_ORIENTATION' AS issue, id FROM animes WHERE orientation IS NULL;
SELECT 'MISSING_TIER' AS issue, id FROM animes WHERE tier IS NULL;
SELECT 'MISSING_NAME_KO' AS issue, id FROM characters WHERE name_ko IS NULL;
SELECT 'MISSING_GENDER' AS issue, id FROM characters WHERE gender IS NULL;
SELECT 'MISSING_ROLE' AS issue, id FROM characters WHERE role IS NULL;

-- 7. JSON array fields. CASE prevents json_type from parsing malformed JSON.
SELECT 'INVALID_GENRE_JSON' AS issue, id, genre
FROM animes
WHERE genre IS NOT NULL
  AND json_type(CASE WHEN json_valid(genre) THEN genre END) IS NOT 'array';

SELECT 'INVALID_GENRE_EN_JSON' AS issue, id, genre_en
FROM animes
WHERE genre_en IS NOT NULL
  AND json_type(CASE WHEN json_valid(genre_en) THEN genre_en END) IS NOT 'array';

SELECT 'INVALID_PERSONALITY_JSON' AS issue, id, personality
FROM characters
WHERE personality IS NOT NULL
  AND json_type(CASE WHEN json_valid(personality) THEN personality END) IS NOT 'array';

SELECT 'INVALID_PERSONALITY_EN_JSON' AS issue, id, personality_en
FROM characters
WHERE personality_en IS NOT NULL
  AND json_type(CASE WHEN json_valid(personality_en) THEN personality_en END) IS NOT 'array';

SELECT 'INVALID_TAGS_JSON' AS issue, id, tags
FROM characters
WHERE tags IS NOT NULL
  AND json_type(CASE WHEN json_valid(tags) THEN tags END) IS NOT 'array';

SELECT 'INVALID_TAGS_EN_JSON' AS issue, id, tags_en
FROM characters
WHERE tags_en IS NOT NULL
  AND json_type(CASE WHEN json_valid(tags_en) THEN tags_en END) IS NOT 'array';

-- 8. Duplicate business keys.
SELECT 'DUPLICATE_ANIME' AS issue, title_ko, COUNT(*) AS duplicate_count
FROM animes
GROUP BY title_ko
HAVING COUNT(*) > 1;

SELECT 'DUPLICATE_CHARACTER' AS issue, name_ko, anime_id, COUNT(*) AS duplicate_count
FROM characters
GROUP BY name_ko, anime_id
HAVING COUNT(*) > 1;

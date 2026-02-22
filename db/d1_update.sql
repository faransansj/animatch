-- Create temp table to hold new values
CREATE TABLE IF NOT EXISTS temp_animes_update (id INTEGER PRIMARY KEY, genre_en TEXT);
CREATE TABLE IF NOT EXISTS temp_chars_update (
  id INTEGER PRIMARY KEY, 
  tags_en TEXT, 
  personality_en TEXT, 
  charm_points_en TEXT, 
  iconic_quote_en TEXT
);

#!/usr/bin/env python3
"""
AniMatch — Seed Sync Script
Exports the current SQLite database (animes, characters) to db/seed.sql
so that new characters added via add_character.py are persisted in the baseline seed.

Usage:
  python ml/sync_seed.py
"""

import sqlite3
import os
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(SCRIPT_DIR, '..', 'db', 'animatch.db')
SEED_PATH = os.path.join(SCRIPT_DIR, '..', 'db', 'seed.sql')

def escape_sql(value):
    if value is None:
        return 'NULL'
    if isinstance(value, str):
        escaped = value.replace("'", "''")
        return f"'{escaped}'"
    if isinstance(value, (int, float)):
        return str(value)
    return f"'{str(value)}'"

def main():
    if not os.path.exists(DB_PATH):
        print(f"❌ Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Get animes
    cursor.execute("SELECT id, title_ko, title_jp, title_en, genre, genre_en, orientation, tier FROM animes ORDER BY id")
    animes = cursor.fetchall()
    
    # Get characters
    cursor.execute("SELECT id, anime_id, name_ko, name_jp, name_en, gender, role, image_url, personality, personality_en, charm_points, charm_points_en, iconic_quote, iconic_quote_en, tags, tags_en, color_primary, emoji, partner_id FROM characters ORDER BY id")
    characters = cursor.fetchall()

    now_str = datetime.utcnow().isoformat()[:-3] + "Z"
    
    with open(SEED_PATH, 'w', encoding='utf-8') as f:
        f.write("-- AniMatch Seed Data\n")
        f.write(f"-- Generated: {now_str}\n")
        f.write(f"-- Total: {len(animes)} works, {len(characters)} characters\n\n")

        f.write("-- === ANIMES ===\n")
        for a in animes:
            cols = "id, title_ko, title_jp, title_en, genre, genre_en, orientation, tier"
            vals = ", ".join([escape_sql(a[c]) for c in ["id", "title_ko", "title_jp", "title_en", "genre", "genre_en", "orientation", "tier"]])
            f.write(f"INSERT INTO animes ({cols}) VALUES ({vals});\n")

        f.write("\n-- === CHARACTERS ===\n")
        for c in characters:
            cols = "id, anime_id, name_ko, name_jp, name_en, gender, role, image_url, personality, personality_en, charm_points, charm_points_en, iconic_quote, iconic_quote_en, tags, tags_en, color_primary, emoji"
            vals_list = []
            for col in ["id", "anime_id", "name_ko", "name_jp", "name_en", "gender", "role", "image_url", "personality", "personality_en", "charm_points", "charm_points_en", "iconic_quote", "iconic_quote_en", "tags", "tags_en", "color_primary", "emoji"]:
                vals_list.append(escape_sql(c[col]))
            vals = ", ".join(vals_list)
            f.write(f"INSERT INTO characters ({cols}) VALUES ({vals});\n")

        f.write("\n-- === PARTNER LINKS ===\n")
        for c in characters:
            if c['partner_id'] is not None:
                f.write(f"UPDATE characters SET partner_id = {c['partner_id']} WHERE id = {c['id']};\n")

    conn.close()
    
    kb = os.path.getsize(SEED_PATH) / 1024
    print(f"✅ Generated {SEED_PATH} ({kb:.1f} KB)")
    print(f"   Exported {len(animes)} animes and {len(characters)} characters.")

if __name__ == '__main__':
    main()

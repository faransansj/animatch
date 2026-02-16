#!/usr/bin/env python3
"""
AniMatch — Enrich embeddings.json with genre data from DB.
Adds anime genre info that was missing from the initial embedding generation.

Usage:
  python enrich_embeddings.py
"""

import json
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'db', 'animatch.db')
EMBED_PATH = os.path.join(os.path.dirname(__file__), '..', 'public', 'embeddings.json')


def main():
    print("🎌 AniMatch — Enriching embeddings with genre data")

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    with open(EMBED_PATH, encoding='utf-8') as f:
        data = json.load(f)

    enriched = 0
    for char in data['characters']:
        cur = conn.execute("""
            SELECT a.genre FROM animes a
            JOIN characters c ON c.anime_id = a.id
            WHERE c.id = ?
        """, (char['protagonist_id'],))
        row = cur.fetchone()
        if row and row['genre']:
            char['genre'] = json.loads(row['genre'])
            enriched += 1
        else:
            char['genre'] = []

    conn.close()

    with open(EMBED_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=None)

    print(f"  ✅ Enriched {enriched}/{len(data['characters'])} characters with genre info")
    print(f"  📁 Saved to: {EMBED_PATH}")


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""
Export animatch.db characters into public/embeddings.json including new ja and zh-TW columns.
"""

import sqlite3
import json
import gzip
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(SCRIPT_DIR, '..', 'db', 'animatch.db')
EMBEDDINGS_PATH = os.path.join(SCRIPT_DIR, '..', 'public', 'embeddings.json')
EMBEDDINGS_GZ_PATH = EMBEDDINGS_PATH + '.gz'

def load_json(json_str, default=None):
    if default is None:
        default = []
    if not json_str:
        return default
    try:
        return json.loads(json_str)
    except json.JSONDecodeError:
        return default

def main():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Load existing embeddings file to preserve the actual embedding vectors
    # because DB only stores metadata, not the 512d vectors
    if not os.path.exists(EMBEDDINGS_PATH):
        print("Error: public/embeddings.json not found! Cannot merge without vectors.")
        return

    with open(EMBEDDINGS_PATH, 'r', encoding='utf-8') as f:
        existing_data = json.load(f)

    # Fast lookup for existing embeddings
    emb_lookup = {}
    for entry in existing_data['characters']:
        emb_lookup[entry['heroine_id']] = {
            'embedding': entry.get('embedding'),
            'arcface_embedding': entry.get('arcface_embedding')
        }

    # Query all characters with their anime metadata
    cursor.execute("""
        SELECT c.*, a.title_ko, a.title_jp, a.title_en, a.title_zh_tw, a.genre, a.genre_ja, a.genre_en, a.genre_zh_tw, a.orientation, a.tier,
               p.name_ko as p_name_ko, p.name_en as p_name_en
        FROM characters c
        JOIN animes a ON c.anime_id = a.id
        LEFT JOIN characters p ON c.partner_id = p.id
        WHERE c.role = 'heroine'
    """)
    rows = cursor.fetchall()
    
    new_characters = []
    
    for row in rows:
        h_id = row['id']
        vectors = emb_lookup.get(h_id)
        if not vectors or not vectors.get('embedding'):
            print(f"Skipping {row['name_ko']} (no embedding vector found in JSON)")
            continue
            
        entry = {
            'protagonist_id': row['partner_id'],
            'protagonist_name': row['p_name_ko'],
            'protagonist_name_en': row['p_name_en'],
            'protagonist_en': row['p_name_en'], # legacy alias
            'orientation': row['orientation'],
            'tier': row['tier'],
            
            'anime': row['title_ko'],
            'anime_en': row['title_en'] or '',
            'anime_ja': row['title_jp'] or '',
            'anime_zh_tw': row['title_zh_tw'] or '',
            
            'genre': load_json(row['genre']),
            'genre_en': load_json(row['genre_en']),
            'genre_ja': load_json(row['genre_ja']),
            'genre_zh_tw': load_json(row['genre_zh_tw']),
            
            'heroine_id': h_id,
            'heroine_name': row['name_ko'],
            'heroine_name_en': row['name_en'] or '',
            'heroine_name_ja': row['name_jp'] or '',
            'heroine_name_zh_tw': row['name_zh_tw'] or '',
            
            'heroine_image': row['image_url'] or '',
            
            'heroine_personality': load_json(row['personality']),
            'heroine_personality_en': load_json(row['personality_en']),
            'heroine_personality_ja': load_json(row['personality_ja']),
            'heroine_personality_zh_tw': load_json(row['personality_zh_tw']),
            
            'heroine_charm': row['charm_points'] or '',
            'heroine_charm_en': row['charm_points_en'] or '',
            'heroine_charm_ja': row['charm_points_ja'] or '',
            'heroine_charm_zh_tw': row['charm_points_zh_tw'] or '',
            
            'heroine_quote': row['iconic_quote'] or '',
            'heroine_quote_en': row['iconic_quote_en'] or '',
            'heroine_quote_ja': row['iconic_quote_ja'] or '',
            'heroine_quote_zh_tw': row['iconic_quote_zh_tw'] or '',
            
            'heroine_tags': load_json(row['tags']),
            'heroine_tags_en': load_json(row['tags_en']),
            'heroine_tags_ja': load_json(row['tags_ja']),
            'heroine_tags_zh_tw': load_json(row['tags_zh_tw']),
            
            'heroine_color': row['color_primary'] or 'linear-gradient(135deg, #667eea, #764ba2)',
            'heroine_emoji': row['emoji'] or '💫',
            
            'embedding': vectors['embedding']
        }
        
        if vectors.get('arcface_embedding'):
            entry['arcface_embedding'] = vectors['arcface_embedding']
            
        new_characters.append(entry)

    existing_data['characters'] = new_characters
    existing_data['count'] = len(new_characters)

    json_str = json.dumps(existing_data, ensure_ascii=False, separators=(',', ':'))

    with open(EMBEDDINGS_PATH, 'w', encoding='utf-8') as f:
        f.write(json_str)

    with gzip.open(EMBEDDINGS_GZ_PATH, 'wt', encoding='utf-8', compresslevel=9) as f:
        f.write(json_str)

    json_kb = os.path.getsize(EMBEDDINGS_PATH) / 1024
    gz_kb = os.path.getsize(EMBEDDINGS_GZ_PATH) / 1024
    print(f"Exported {len(new_characters)} characters successfully!")
    print(f"JSON: {json_kb:.1f} KB | Gzip: {gz_kb:.1f} KB")

if __name__ == "__main__":
    main()

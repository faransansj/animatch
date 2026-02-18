import sqlite3
import json
import os

DB_PATH = '/Users/midori/Develop/test/db/animatch.db'
JSON_PATH = '/Users/midori/Develop/test/public/embeddings.json'

def main():
    if not os.path.exists(JSON_PATH):
        print(f"Error: {JSON_PATH} not found")
        return

    # Load existing embeddings
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Load ALL English data from characters table
    cursor.execute("""
        SELECT c.id, c.name_en, c.personality_en, c.charm_points_en, c.iconic_quote_en, c.tags_en,
               a.title_en, a.genre_en, c.name_ko
        FROM characters c
        JOIN animes a ON c.anime_id = a.id
    """)
    # Create name-based mapping as backup for ID mismatches
    db_chars_by_id = {row['id']: row for row in cursor.fetchall()}
    cursor.execute("SELECT c.id, c.name_ko, c.name_en, c.personality_en, c.charm_points_en, c.iconic_quote_en, c.tags_en, a.title_en, a.genre_en FROM characters c JOIN animes a ON c.anime_id = a.id")
    db_chars_by_name = {row['name_ko']: row for row in cursor.fetchall()}

    updated_count = 0
    total_chars = len(data['characters'])
    print(f"Checking {total_chars} characters in embeddings.json...")
    
    for entry in data['characters']:
        h_id = entry.get('heroine_id')
        h_name = entry.get('heroine_name')
        
        row = db_chars_by_id.get(h_id) or db_chars_by_name.get(h_name)
        
        if row:
            print(f"  Matched: {h_name} (ID: {h_id}) -> {row['name_en']}")
            entry['heroine_name_en'] = row['name_en']
            entry['heroine_personality_en'] = json.loads(row['personality_en']) if row['personality_en'] else []
            entry['heroine_charm_en'] = row['charm_points_en']
            entry['heroine_quote_en'] = row['iconic_quote_en']
            entry['heroine_tags_en'] = json.loads(row['tags_en']) if row['tags_en'] else []
            
            # Map protagonist name backup
            p_id = entry.get('protagonist_id')
            p_name = entry.get('protagonist_name')
            p_row = db_chars_by_id.get(p_id) or db_chars_by_name.get(p_name)
            if p_row:
                entry['protagonist_name_en'] = p_row['name_en']
                entry['protagonist_en'] = p_row['name_en']
            
            # Map anime and genre
            entry['anime_en'] = row['title_en']
            entry['genre_en'] = json.loads(row['genre_en']) if row['genre_en'] else []
            
            updated_count += 1
        else:
            print(f"  FAILED to match: {h_name} (ID: {h_id})")

    # Save updated JSON
    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)

    conn.close()
    print(f"Successfully patched {updated_count} / {total_chars} characters in embeddings.json")

if __name__ == "__main__":
    main()

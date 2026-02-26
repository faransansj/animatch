#!/usr/bin/env python3
"""
Translate animatch.db text fields to Japanese (ja) and Traditional Chinese (zh-TW).
"""

import sqlite3
import json
import os
from deep_translator import GoogleTranslator
from concurrent.futures import ThreadPoolExecutor

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(SCRIPT_DIR, '..', 'db', 'animatch.db')

def translate_str(text, dest_lang):
    if not text:
        return text
    try:
        return GoogleTranslator(source='ko', target=dest_lang).translate(text)
    except Exception as e:
        print(f"Error translating '{text}' to {dest_lang}: {e}")
        return text

def translate_json(json_str, dest_lang):
    if not json_str or len(json_str) <= 2: # '[]', '', or None
        return json_str
    try:
        arr = json.loads(json_str)
        if not isinstance(arr, list):
            return json_str
        translated_arr = []
        for item in arr:
            translated_arr.append(translate_str(item, dest_lang))
        return json.dumps(translated_arr, ensure_ascii=False)
    except Exception:
        return translate_str(json_str, dest_lang)

def process_character(row):
    char_id, name_ko, personality, charm_points, iconic_quote, tags, name_zh_tw = row
    if name_zh_tw:
        return None
        
    print(f"Starting {name_ko}...", flush=True)
    
    # Run in parallel using a smaller thread pool just for this character's fields
    try:
        name_ja = translate_str(name_ko, 'ja')
        personality_ja = translate_json(personality, 'ja')
        charm_ja = translate_str(charm_points, 'ja')
        quote_ja = translate_str(iconic_quote, 'ja')
        tags_ja = translate_json(tags, 'ja')
        
        name_zh = translate_str(name_ko, 'zh-TW')
        personality_zh = translate_json(personality, 'zh-TW')
        charm_zh = translate_str(charm_points, 'zh-TW')
        quote_zh = translate_str(iconic_quote, 'zh-TW')
        tags_zh = translate_json(tags, 'zh-TW')
        
        return (
            name_ja, name_zh,
            personality_ja, personality_zh,
            charm_ja, charm_zh,
            quote_ja, quote_zh,
            tags_ja, tags_zh,
            char_id, name_ko
        )
    except Exception as e:
        print(f"Error on {name_ko}: {e}", flush=True)
        return None

def main():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("\nTranslating Characters...", flush=True)
    cursor.execute("""
        SELECT id, name_ko, personality, charm_points, iconic_quote, tags, name_zh_tw
        FROM characters
    """)
    chars = cursor.fetchall()

    tasks = []
    with ThreadPoolExecutor(max_workers=10) as executor:
        for val in executor.map(process_character, chars):
            if val is not None:
                cursor.execute("""
                    UPDATE characters
                    SET name_jp = ?, name_zh_tw = ?,
                        personality_ja = ?, personality_zh_tw = ?,
                        charm_points_ja = ?, charm_points_zh_tw = ?,
                        iconic_quote_ja = ?, iconic_quote_zh_tw = ?,
                        tags_ja = ?, tags_zh_tw = ?
                    WHERE id = ?
                """, val[:-1])
                conn.commit()
                print(f"Finished {val[-1]}", flush=True)

    print("Database translation completed successfully!")

if __name__ == "__main__":
    main()

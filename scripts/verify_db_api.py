#!/usr/bin/env python3
"""
Verify DB API integration by loading public/embeddings.json and printing sample data.
"""

import json
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
EMBEDDINGS_PATH = os.path.join(SCRIPT_DIR, '..', 'public', 'embeddings.json')

def print_lang_set(char, lang_suffix=""):
    sfx = f"_{lang_suffix}" if lang_suffix else ""
    return (
        f"  Name:     {char.get(f'heroine_name{sfx}', 'MISSING')}\n"
        f"  Anime:    {char.get(f'anime{sfx}', 'MISSING')}\n"
        f"  Tags:     {', '.join(char.get(f'heroine_tags{sfx}') or [])}\n"
        f"  Charm:    {char.get(f'heroine_charm{sfx}', 'MISSING')}\n"
        f"  Quote:    {char.get(f'heroine_quote{sfx}', 'MISSING')}"
    )

def main():
    if not os.path.exists(EMBEDDINGS_PATH):
        print(f"Error: {EMBEDDINGS_PATH} not found!")
        return

    with open(EMBEDDINGS_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    chars = data.get('characters', [])
    print(f"✅ Loaded API Payload (count: {len(chars)})\n")

    if not chars:
        return

    # Print first 3 entries for verification
    for i in range(min(3, len(chars))):
        c = chars[i]
        print(f"--- Character {i+1} Verification ---")
        print("🇰🇷 [KO - Native]")
        print(print_lang_set(c, ""))
        print("\n🇺🇸 [EN - English]")
        print(print_lang_set(c, "en"))
        print("\n🇯🇵 [JA - Japanese]")
        print(print_lang_set(c, "ja"))
        print("\n🇹🇼 [ZH - Traditional Chinese]")
        print(print_lang_set(c, "zh_tw"))
        print("=" * 50 + "\n")

if __name__ == "__main__":
    main()

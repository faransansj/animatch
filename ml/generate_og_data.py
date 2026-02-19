"""Generate TypeScript character data constant for Cloudflare middleware OG tags.

Usage:
    python ml/generate_og_data.py

Reads public/embeddings.json and outputs a TypeScript constant with character
names and anime titles for all 47 characters.
"""

import json
import sys
from pathlib import Path

def main():
    embeddings_path = Path(__file__).parent.parent / "public" / "embeddings.json"

    with open(embeddings_path, encoding="utf-8") as f:
        data = json.load(f)

    characters = data["characters"]

    print("const CHARACTER_DATA: Record<number, { name: string; name_en: string; anime: string; anime_en: string }> = {")
    for c in characters:
        hid = c["heroine_id"]
        name = c["heroine_name"].replace("'", "\\'")
        name_en = c["heroine_name_en"].replace("'", "\\'")
        anime = c["anime"].replace("'", "\\'")
        anime_en = c["anime_en"].replace("'", "\\'")
        print(f"  {hid}: {{ name: '{name}', name_en: '{name_en}', anime: '{anime}', anime_en: '{anime_en}' }},")
    print("};")

if __name__ == "__main__":
    main()

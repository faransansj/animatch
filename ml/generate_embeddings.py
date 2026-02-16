#!/usr/bin/env python3
"""
AniMatch — Character Embedding Generator
Generates CLIP embeddings for all protagonist characters
and exports them as a JSON file for browser-side matching.

Usage:
  python generate_embeddings.py
"""

import json
import sqlite3
import sys
import os
import numpy as np
from io import BytesIO

import requests
from PIL import Image
import torch
import open_clip

# Config
DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'db', 'animatch.db')
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), '..', 'public', 'embeddings.json')
MODEL_NAME = 'ViT-B-32'
PRETRAINED = 'openai'

def load_image_from_url(url, timeout=10):
    """Download and preprocess an image from URL."""
    try:
        resp = requests.get(url, timeout=timeout, headers={
            'User-Agent': 'AniMatch/1.0 (Character Embedding Generator)'
        })
        resp.raise_for_status()
        img = Image.open(BytesIO(resp.content)).convert('RGB')
        return img
    except Exception as e:
        print(f"  ⚠️ Failed to load image: {e}")
        return None

def main():
    print("🎌 AniMatch — Character Embedding Generator")
    print(f"  Model: {MODEL_NAME} ({PRETRAINED})")
    print()

    # Load CLIP model
    print("📦 Loading CLIP model...")
    device = 'cuda' if torch.cuda.is_available() else 'mps' if torch.backends.mps.is_available() else 'cpu'
    print(f"  Device: {device}")
    
    model, _, preprocess = open_clip.create_model_and_transforms(
        MODEL_NAME, pretrained=PRETRAINED, device=device
    )
    model.eval()
    print("  ✅ Model loaded\n")

    # Connect to DB
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Get all protagonist characters with their anime info
    cursor.execute("""
        SELECT c.id, c.name_ko, c.name_en, c.image_url, c.partner_id,
               c.gender, c.role,
               a.orientation, a.title_ko, a.tier, a.genre
        FROM characters c
        JOIN animes a ON c.anime_id = a.id
        WHERE c.role = 'protagonist'
        AND c.image_url IS NOT NULL
        ORDER BY a.orientation, a.tier, a.id
    """)
    protagonists = cursor.fetchall()
    print(f"📋 Found {len(protagonists)} protagonists to embed\n")

    embeddings_data = []
    success_count = 0

    for prot in protagonists:
        print(f"  🔎 [{prot['id']}] {prot['name_ko']} ({prot['orientation']}, T{prot['tier']})")
        
        # Load image
        img = load_image_from_url(prot['image_url'])
        if img is None:
            print(f"     ❌ Skipped (image load failed)")
            continue

        # Preprocess and embed
        with torch.no_grad():
            image_tensor = preprocess(img).unsqueeze(0).to(device)
            embedding = model.encode_image(image_tensor)
            # Normalize
            embedding = embedding / embedding.norm(dim=-1, keepdim=True)
            embedding_list = embedding.cpu().numpy()[0].tolist()

        # Get heroine info
        cursor.execute("""
            SELECT c.id, c.name_ko, c.name_en, c.image_url,
                   c.personality, c.charm_points, c.iconic_quote,
                   c.tags, c.color_primary, c.emoji
            FROM characters c
            WHERE c.id = ?
        """, (prot['partner_id'],))
        heroine = cursor.fetchone()

        if not heroine:
            print(f"     ⚠️ No heroine found for partner_id={prot['partner_id']}")
            continue

        embeddings_data.append({
            'protagonist_id': prot['id'],
            'protagonist_name': prot['name_ko'],
            'protagonist_name_en': prot['name_en'],
            'orientation': prot['orientation'],
            'tier': prot['tier'],
            'anime': prot['title_ko'],
            'genre': json.loads(prot['genre']) if prot['genre'] else [],
            'heroine_id': heroine['id'],
            'heroine_name': heroine['name_ko'],
            'heroine_name_en': heroine['name_en'],
            'heroine_image': heroine['image_url'],
            'heroine_personality': json.loads(heroine['personality']) if heroine['personality'] else [],
            'heroine_charm': heroine['charm_points'],
            'heroine_quote': heroine['iconic_quote'],
            'heroine_tags': json.loads(heroine['tags']) if heroine['tags'] else [],
            'heroine_color': heroine['color_primary'],
            'heroine_emoji': heroine['emoji'],
            'embedding': embedding_list
        })
        success_count += 1
        print(f"     ✅ Embedded ({len(embedding_list)}d)")

    conn.close()

    # Save embeddings
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    
    output = {
        'model': MODEL_NAME,
        'pretrained': PRETRAINED,
        'embedding_dim': len(embeddings_data[0]['embedding']) if embeddings_data else 0,
        'count': len(embeddings_data),
        'characters': embeddings_data
    }

    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=None)
    
    file_size = os.path.getsize(OUTPUT_PATH) / 1024
    print(f"\n{'='*50}")
    print(f"✅ Generated {success_count} embeddings")
    print(f"📁 Saved to: {OUTPUT_PATH} ({file_size:.1f} KB)")
    print(f"📊 Embedding dimension: {output['embedding_dim']}")

if __name__ == '__main__':
    main()

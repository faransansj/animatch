#!/usr/bin/env python3
"""
AniMatch — Unified Character Addition Pipeline

Single CLI to add new anime characters:
  1. INSERT anime + protagonist + heroine into animatch.db
  2. Generate CLIP embedding (512d) from protagonist image
  3. Generate ArcFace embedding (512d) — skip if no face detected
  4. Update embeddings.json + embeddings.json.gz
  5. Validate against existing characters (duplicate check)

Usage:
  # Single character
  python ml/add_character.py \
    --title-ko "최애의 아이" --title-en "Oshi no Ko" \
    --genre '["드라마","미스터리"]' \
    --orientation male --tier 3 \
    --protagonist-ko "호시노 아쿠아마린" --protagonist-en "Aquamarine Hoshino" \
    --protagonist-image "https://..." \
    --heroine-ko "쿠로카와 아카네" --heroine-en "Akane Kurokawa" \
    --heroine-image "https://..." \
    --heroine-emoji "🎭" --heroine-color "linear-gradient(135deg, #ff6b6b, #ee5a24)" \
    --heroine-tags '["연기파","진지"]' --heroine-personality '["분석적","열정적"]' \
    --heroine-charm "완벽한 연기력" --heroine-quote "나는 쿠로카와 아카네니까"

  # Batch from JSON
  python ml/add_character.py --batch ml/new_characters.json

  # Dry run (no DB/file changes)
  python ml/add_character.py --dry-run --batch ml/new_characters.json
"""

import argparse
import json
import gzip
import os
import sqlite3
import sys
from io import BytesIO

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(SCRIPT_DIR, '..', 'db', 'animatch.db')
EMBEDDINGS_PATH = os.path.join(SCRIPT_DIR, '..', 'public', 'embeddings.json')
EMBEDDINGS_GZ_PATH = EMBEDDINGS_PATH + '.gz'
ARCFACE_MODEL_PATH = os.path.join(SCRIPT_DIR, 'models', 'mobilefacenet.onnx')

# Constants
MODEL_NAME = 'ViT-B-32'
PRETRAINED = 'openai'
EMBEDDING_PRECISION = 6
DUPLICATE_COSINE_THRESH = 0.95


def load_image_from_url(url, timeout=10):
    """Download and preprocess an image from URL."""
    import requests
    from PIL import Image
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


def truncate_embedding(embedding_list, precision=EMBEDDING_PRECISION):
    """Truncate embedding values to reduce JSON file size."""
    return [round(x, precision) for x in embedding_list]


def is_audience_pov(name_ko):
    """Check if protagonist is an audience viewpoint character."""
    return '관객' in (name_ko or '') or '시점' in (name_ko or '')


def generate_clip_embedding(img, model, preprocess, device):
    """Generate CLIP embedding from PIL Image."""
    import torch
    with torch.no_grad():
        image_tensor = preprocess(img).unsqueeze(0).to(device)
        embedding = model.encode_image(image_tensor)
        embedding = embedding / embedding.norm(dim=-1, keepdim=True)
        return embedding.cpu().numpy()[0].tolist()


def generate_arcface_embedding(img, session):
    """Generate ArcFace embedding from PIL Image. Returns None on failure."""
    import numpy as np
    from PIL import Image
    try:
        input_name = session.get_inputs()[0].name

        # Center crop to square
        w, h = img.size
        min_dim = min(w, h)
        left = (w - min_dim) // 2
        top = (h - min_dim) // 2
        img = img.crop((left, top, left + min_dim, top + min_dim))

        # Resize to 112x112
        img = img.resize((112, 112), Image.LANCZOS)

        # Normalize: (pixel / 255 - 0.5) / 0.5
        img_array = np.array(img).astype(np.float32)
        img_array = (img_array / 255.0 - 0.5) / 0.5

        # NCHW format
        img_array = img_array.transpose(2, 0, 1)
        img_array = np.expand_dims(img_array, axis=0)

        result = session.run(None, {input_name: img_array})
        embedding = result[0].flatten()

        # L2 normalize
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm

        return [round(float(x), EMBEDDING_PRECISION) for x in embedding]
    except Exception as e:
        print(f"  ⚠️ ArcFace embedding failed: {e}")
        return None


def cosine_similarity(a, b):
    """Compute cosine similarity between two vectors."""
    import numpy as np
    a = np.array(a)
    b = np.array(b)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


def check_duplicates(new_embedding, existing_characters):
    """Check for duplicate characters by cosine similarity."""
    duplicates = []
    for char in existing_characters:
        sim = cosine_similarity(new_embedding, char['embedding'])
        if sim > DUPLICATE_COSINE_THRESH:
            duplicates.append({
                'name': char.get('protagonist_name', 'unknown'),
                'anime': char.get('anime', 'unknown'),
                'similarity': round(sim, 4),
            })
    return duplicates


def insert_character_to_db(conn, char_data, dry_run=False):
    """Insert anime + protagonist + heroine into DB. Returns (anime_id, protagonist_id, heroine_id)."""
    cursor = conn.cursor()

    if dry_run:
        # Simulate IDs
        cursor.execute("SELECT MAX(id) FROM animes")
        max_anime = cursor.fetchone()[0] or 0
        cursor.execute("SELECT MAX(id) FROM characters")
        max_char = cursor.fetchone()[0] or 0
        return max_anime + 1, max_char + 1, max_char + 2

    # Insert anime
    cursor.execute("""
        INSERT INTO animes (title_ko, title_en, genre, orientation, tier)
        VALUES (?, ?, ?, ?, ?)
    """, (
        char_data['title_ko'],
        char_data['title_en'],
        json.dumps(char_data.get('genre', []), ensure_ascii=False),
        char_data['orientation'],
        char_data.get('tier', 2),
    ))
    anime_id = cursor.lastrowid

    # Insert protagonist
    cursor.execute("""
        INSERT INTO characters (anime_id, name_ko, name_en, role, gender, image_url)
        VALUES (?, ?, ?, 'protagonist', ?, ?)
    """, (
        anime_id,
        char_data['protagonist_ko'],
        char_data['protagonist_en'],
        char_data.get('protagonist_gender', 'male'),
        char_data['protagonist_image'],
    ))
    protagonist_id = cursor.lastrowid

    # Insert heroine
    cursor.execute("""
        INSERT INTO characters (anime_id, name_ko, name_en, role, gender, image_url,
                                emoji, color_primary, tags, personality,
                                charm_points, iconic_quote, partner_id)
        VALUES (?, ?, ?, 'heroine', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        anime_id,
        char_data['heroine_ko'],
        char_data['heroine_en'],
        char_data.get('heroine_gender', 'female'),
        char_data.get('heroine_image'),
        char_data.get('heroine_emoji', '💫'),
        char_data.get('heroine_color', 'linear-gradient(135deg, #667eea, #764ba2)'),
        json.dumps(char_data.get('heroine_tags', []), ensure_ascii=False),
        json.dumps(char_data.get('heroine_personality', []), ensure_ascii=False),
        char_data.get('heroine_charm', ''),
        char_data.get('heroine_quote', ''),
        protagonist_id,
    ))
    heroine_id = cursor.lastrowid

    # Set protagonist's partner_id
    cursor.execute("UPDATE characters SET partner_id = ? WHERE id = ?", (heroine_id, protagonist_id))

    conn.commit()
    return anime_id, protagonist_id, heroine_id


def build_embedding_entry(char_data, protagonist_id, heroine_id, clip_emb, arcface_emb):
    """Build an embeddings.json character entry."""
    entry = {
        'protagonist_id': protagonist_id,
        'protagonist_name': char_data['protagonist_ko'],
        'protagonist_name_en': char_data['protagonist_en'],
        'protagonist_en': char_data['protagonist_en'],
        'orientation': char_data['orientation'],
        'tier': char_data.get('tier', 2),
        'anime': char_data['title_ko'],
        'anime_en': char_data['title_en'],
        'genre': char_data.get('genre', []),
        'genre_en': char_data.get('genre', []),
        'heroine_id': heroine_id,
        'heroine_name': char_data['heroine_ko'],
        'heroine_name_en': char_data['heroine_en'],
        'heroine_image': char_data.get('heroine_image', ''),
        'heroine_personality': char_data.get('heroine_personality', []),
        'heroine_personality_en': char_data.get('heroine_personality', []),
        'heroine_charm': char_data.get('heroine_charm', ''),
        'heroine_charm_en': char_data.get('heroine_charm', ''),
        'heroine_quote': char_data.get('heroine_quote', ''),
        'heroine_quote_en': char_data.get('heroine_quote', ''),
        'heroine_tags': char_data.get('heroine_tags', []),
        'heroine_tags_en': char_data.get('heroine_tags', []),
        'heroine_color': char_data.get('heroine_color', 'linear-gradient(135deg, #667eea, #764ba2)'),
        'heroine_emoji': char_data.get('heroine_emoji', '💫'),
        'embedding': clip_emb,
    }
    if arcface_emb:
        entry['arcface_embedding'] = arcface_emb
    return entry


def save_embeddings(data):
    """Write embeddings.json and embeddings.json.gz."""
    json_str = json.dumps(data, ensure_ascii=False, separators=(',', ':'))

    with open(EMBEDDINGS_PATH, 'w', encoding='utf-8') as f:
        f.write(json_str)

    with gzip.open(EMBEDDINGS_GZ_PATH, 'wt', encoding='utf-8', compresslevel=9) as f:
        f.write(json_str)

    json_kb = os.path.getsize(EMBEDDINGS_PATH) / 1024
    gz_kb = os.path.getsize(EMBEDDINGS_GZ_PATH) / 1024
    print(f"  📁 JSON: {json_kb:.1f} KB | Gzip: {gz_kb:.1f} KB")


def parse_single_args(args):
    """Convert CLI args to a character data dict."""
    return {
        'title_ko': args.title_ko,
        'title_en': args.title_en,
        'genre': json.loads(args.genre) if args.genre else [],
        'orientation': args.orientation,
        'tier': args.tier,
        'protagonist_ko': args.protagonist_ko,
        'protagonist_en': args.protagonist_en,
        'protagonist_image': args.protagonist_image,
        'protagonist_gender': args.protagonist_gender,
        'heroine_ko': args.heroine_ko,
        'heroine_en': args.heroine_en,
        'heroine_image': args.heroine_image,
        'heroine_gender': args.heroine_gender,
        'heroine_emoji': args.heroine_emoji,
        'heroine_color': args.heroine_color,
        'heroine_tags': json.loads(args.heroine_tags) if args.heroine_tags else [],
        'heroine_personality': json.loads(args.heroine_personality) if args.heroine_personality else [],
        'heroine_charm': args.heroine_charm or '',
        'heroine_quote': args.heroine_quote or '',
    }


def process_character(char_data, clip_model, clip_preprocess, clip_device, arcface_session, embeddings_data, conn, dry_run=False):
    """Process a single character through the full pipeline. Returns True on success."""
    title = char_data['title_ko']
    protag = char_data['protagonist_ko']
    print(f"\n{'='*50}")
    print(f"🎌 {title} — {protag}")

    # 1. DB insert
    print("  📝 DB insert...")
    anime_id, protag_id, heroine_id = insert_character_to_db(conn, char_data, dry_run)
    print(f"     anime_id={anime_id}, protagonist_id={protag_id}, heroine_id={heroine_id}")

    # 2. Download protagonist image
    img_url = char_data['protagonist_image']
    if is_audience_pov(char_data['protagonist_ko']):
        print(f"  ⏭️ Skipped (audience POV)")
        return False

    print(f"  🖼️ Downloading image...")
    img = load_image_from_url(img_url)
    if img is None:
        print(f"  ❌ Image download failed — skipping")
        return False

    # 3. CLIP embedding
    print(f"  🔎 Generating CLIP embedding...")
    clip_emb = generate_clip_embedding(img, clip_model, clip_preprocess, clip_device)
    clip_emb = truncate_embedding(clip_emb)
    print(f"     ✅ CLIP: {len(clip_emb)}d")

    # 4. ArcFace embedding (optional)
    arcface_emb = None
    if arcface_session:
        print(f"  🔎 Generating ArcFace embedding...")
        arcface_emb = generate_arcface_embedding(img, arcface_session)
        if arcface_emb:
            print(f"     ✅ ArcFace: {len(arcface_emb)}d")
        else:
            print(f"     ⚠️ ArcFace: skipped (no face detected or error)")

    # 5. Duplicate check
    duplicates = check_duplicates(clip_emb, embeddings_data['characters'])
    if duplicates:
        print(f"  ⚠️ DUPLICATE WARNING:")
        for dup in duplicates:
            print(f"     - {dup['name']} ({dup['anime']}) sim={dup['similarity']}")

    # 6. Add to embeddings data
    entry = build_embedding_entry(char_data, protag_id, heroine_id, clip_emb, arcface_emb)

    if not dry_run:
        embeddings_data['characters'].append(entry)
        embeddings_data['count'] = len(embeddings_data['characters'])
    else:
        print(f"  🏜️ Dry run — skipping embeddings.json update")

    print(f"  ✅ Done!")
    return True


def main():
    parser = argparse.ArgumentParser(
        description='AniMatch — Unified Character Addition Pipeline',
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    # Mode selection
    parser.add_argument('--batch', type=str, help='Path to JSON file with character array')
    parser.add_argument('--dry-run', action='store_true', help='Validate without DB/file changes')

    # Single character args
    parser.add_argument('--title-ko', type=str, help='Anime title (Korean)')
    parser.add_argument('--title-en', type=str, help='Anime title (English)')
    parser.add_argument('--genre', type=str, default='[]', help='Genre JSON array')
    parser.add_argument('--orientation', type=str, choices=['male', 'female'], default='male')
    parser.add_argument('--tier', type=int, choices=[1, 2, 3], default=2)

    parser.add_argument('--protagonist-ko', type=str, help='Protagonist name (Korean)')
    parser.add_argument('--protagonist-en', type=str, help='Protagonist name (English)')
    parser.add_argument('--protagonist-image', type=str, help='Protagonist image URL')
    parser.add_argument('--protagonist-gender', type=str, default='male')

    parser.add_argument('--heroine-ko', type=str, help='Heroine name (Korean)')
    parser.add_argument('--heroine-en', type=str, help='Heroine name (English)')
    parser.add_argument('--heroine-image', type=str, default='', help='Heroine image URL')
    parser.add_argument('--heroine-gender', type=str, default='female')
    parser.add_argument('--heroine-emoji', type=str, default='💫')
    parser.add_argument('--heroine-color', type=str, default='linear-gradient(135deg, #667eea, #764ba2)')
    parser.add_argument('--heroine-tags', type=str, default='[]', help='Tags JSON array')
    parser.add_argument('--heroine-personality', type=str, default='[]', help='Personality JSON array')
    parser.add_argument('--heroine-charm', type=str, default='')
    parser.add_argument('--heroine-quote', type=str, default='')

    args = parser.parse_args()

    # Determine character list
    if args.batch:
        with open(args.batch, 'r', encoding='utf-8') as f:
            characters = json.load(f)
        if not isinstance(characters, list):
            characters = [characters]
        print(f"📦 Batch mode: {len(characters)} characters from {args.batch}")
    elif args.title_ko and args.protagonist_ko and args.heroine_ko:
        characters = [parse_single_args(args)]
        print(f"📦 Single mode: {args.title_ko}")
    else:
        parser.print_help()
        print("\n❌ Provide either --batch or required single-character args (--title-ko, --protagonist-ko, --heroine-ko, --protagonist-image)")
        sys.exit(1)

    if args.dry_run:
        print("🏜️ DRY RUN — no DB or file changes will be made\n")

    # Load models
    import torch
    import open_clip

    print("📦 Loading CLIP model...")
    device = 'cuda' if torch.cuda.is_available() else 'mps' if torch.backends.mps.is_available() else 'cpu'
    print(f"  Device: {device}")
    model, _, preprocess = open_clip.create_model_and_transforms(MODEL_NAME, pretrained=PRETRAINED, device=device)
    model.eval()
    print("  ✅ CLIP loaded")

    arcface_session = None
    if os.path.exists(ARCFACE_MODEL_PATH):
        import onnxruntime as ort
        arcface_session = ort.InferenceSession(ARCFACE_MODEL_PATH, providers=['CPUExecutionProvider'])
        print("  ✅ ArcFace loaded")
    else:
        print("  ⚠️ ArcFace model not found — skipping face embeddings")

    # Load existing embeddings
    if os.path.exists(EMBEDDINGS_PATH):
        with open(EMBEDDINGS_PATH, 'r', encoding='utf-8') as f:
            embeddings_data = json.load(f)
        print(f"  📋 Existing embeddings: {embeddings_data['count']} characters")
    else:
        embeddings_data = {
            'model': MODEL_NAME,
            'pretrained': PRETRAINED,
            'embedding_dim': 512,
            'count': 0,
            'characters': [],
        }
        print("  📋 No existing embeddings — starting fresh")

    # Connect to DB
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    # Process characters
    success = 0
    failed = 0

    for char_data in characters:
        try:
            ok = process_character(
                char_data, model, preprocess, device,
                arcface_session, embeddings_data, conn, args.dry_run,
            )
            if ok:
                success += 1
            else:
                failed += 1
        except Exception as e:
            print(f"  ❌ Error: {e}")
            failed += 1

    conn.close()

    # Save updated embeddings
    if not args.dry_run and success > 0:
        print(f"\n💾 Saving embeddings...")
        save_embeddings(embeddings_data)

    print(f"\n{'='*50}")
    print(f"✅ Complete: {success} added, {failed} failed")
    if args.dry_run:
        print("🏜️ (Dry run — no actual changes)")


if __name__ == '__main__':
    main()

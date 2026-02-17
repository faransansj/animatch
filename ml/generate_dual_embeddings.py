"""
Generate dual embeddings (CLIP + ArcFace) for all protagonist characters.

Downloads protagonist images from AniList URLs in DB, generates ArcFace embeddings,
and extends embeddings.json with `arcface_embedding` field.

Usage:
    python ml/generate_dual_embeddings.py
"""

import json
import os
import gzip
import sqlite3
import time
import numpy as np


def generate_arcface_embeddings():
    import onnxruntime as ort
    from PIL import Image
    import urllib.request

    script_dir = os.path.dirname(__file__)
    model_path = os.path.join(script_dir, 'models', 'mobilefacenet.onnx')
    db_path = os.path.join(script_dir, '..', 'db', 'animatch.db')
    embeddings_path = os.path.join(script_dir, '..', 'public', 'embeddings.json')
    gz_path = embeddings_path + '.gz'
    cache_dir = os.path.join(script_dir, 'images', 'protagonists')
    os.makedirs(cache_dir, exist_ok=True)

    if not os.path.exists(model_path):
        raise FileNotFoundError(
            f"ArcFace model not found: {model_path}\n"
            "Run export_arcface_onnx.py first."
        )

    # Load existing embeddings
    with open(embeddings_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"Loaded {data['count']} characters")

    # Load protagonist image URLs from DB
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute('SELECT id, name_en, image_url FROM characters WHERE role="protagonist"')
    db_images = {row[0]: (row[1], row[2]) for row in cur.fetchall()}
    conn.close()
    print(f"DB protagonists with images: {sum(1 for v in db_images.values() if v[1])}")

    # Load ArcFace model
    session = ort.InferenceSession(model_path, providers=['CPUExecutionProvider'])
    input_name = session.get_inputs()[0].name
    print(f"ArcFace model loaded")

    success_count = 0
    fail_count = 0

    for char in data['characters']:
        pid = char['protagonist_id']
        name_en = char.get('protagonist_name_en', '') or db_images.get(pid, ('unknown', ''))[0]

        # Get image URL from DB
        _, image_url = db_images.get(pid, (None, None))
        if not image_url:
            print(f"  ⚠️  No image URL for ID:{pid} ({name_en})")
            fail_count += 1
            continue

        # Download image (with cache)
        ext = os.path.splitext(image_url)[1] or '.jpg'
        cache_path = os.path.join(cache_dir, f"{pid}{ext}")

        if not os.path.exists(cache_path):
            try:
                req = urllib.request.Request(image_url, headers={
                    'User-Agent': 'Mozilla/5.0 (compatible; AniMatch/1.0)'
                })
                with urllib.request.urlopen(req, timeout=15) as resp:
                    with open(cache_path, 'wb') as f:
                        f.write(resp.read())
                time.sleep(0.3)  # Rate limiting
            except Exception as e:
                print(f"  ❌ Download failed for ID:{pid} ({name_en}): {e}")
                fail_count += 1
                continue

        # Load and preprocess image for ArcFace
        try:
            img = Image.open(cache_path).convert('RGB')

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

            # Run inference
            result = session.run(None, {input_name: img_array})
            embedding = result[0].flatten()

            # L2 normalize
            norm = np.linalg.norm(embedding)
            if norm > 0:
                embedding = embedding / norm

            char['arcface_embedding'] = [round(float(x), 6) for x in embedding]
            success_count += 1
            print(f"  ✅ ID:{pid} {name_en}: embedding generated ({len(embedding)}d)")

        except Exception as e:
            print(f"  ❌ Processing failed for ID:{pid} ({name_en}): {e}")
            fail_count += 1
            continue

    print(f"\nResults: {success_count} success, {fail_count} failed")

    # Save updated embeddings
    with open(embeddings_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)
    print(f"Saved to: {embeddings_path}")

    # Generate gzip version
    with open(embeddings_path, 'rb') as f_in:
        with gzip.open(gz_path, 'wb', compresslevel=9) as f_out:
            f_out.write(f_in.read())

    json_size = os.path.getsize(embeddings_path) / 1024
    gz_size = os.path.getsize(gz_path) / 1024
    print(f"JSON: {json_size:.0f} KB, gzip: {gz_size:.0f} KB ({(1 - gz_size/json_size)*100:.0f}% compression)")
    print(f"\n✅ Dual embeddings generated for {success_count}/{data['count']} characters!")


if __name__ == '__main__':
    generate_arcface_embeddings()

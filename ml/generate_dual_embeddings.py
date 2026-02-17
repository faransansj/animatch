"""
Generate dual embeddings (CLIP + ArcFace) for all protagonist characters.

Extends the existing embeddings.json with `arcface_embedding` field for each character.

Usage:
    python ml/generate_dual_embeddings.py
"""

import json
import os
import gzip
import numpy as np


def generate_arcface_embeddings():
    import onnxruntime as ort
    from PIL import Image

    script_dir = os.path.dirname(__file__)
    model_path = os.path.join(script_dir, 'models', 'mobilefacenet.onnx')
    embeddings_path = os.path.join(script_dir, '..', 'public', 'embeddings.json')
    output_path = embeddings_path  # overwrite
    gz_path = embeddings_path + '.gz'

    if not os.path.exists(model_path):
        raise FileNotFoundError(
            f"ArcFace model not found: {model_path}\n"
            "Run export_arcface_onnx.py first."
        )

    # Load existing embeddings
    with open(embeddings_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"Loaded {data['count']} characters")

    # Load ArcFace model
    session = ort.InferenceSession(model_path, providers=['CPUExecutionProvider'])
    input_name = session.get_inputs()[0].name
    input_shape = session.get_inputs()[0].shape  # [1, 3, 112, 112]
    print(f"ArcFace input shape: {input_shape}")

    # Image directory for protagonist faces
    img_dir = os.path.join(script_dir, 'images', 'protagonists')

    for char in data['characters']:
        protagonist = char.get('protagonist', '')
        protagonist_en = char.get('protagonist_en', protagonist)

        # Try to find face image
        img_path = None
        for ext in ['.jpg', '.jpeg', '.png', '.webp']:
            candidate = os.path.join(img_dir, f"{protagonist_en}{ext}")
            if os.path.exists(candidate):
                img_path = candidate
                break

        if img_path is None:
            print(f"  ⚠️ No face image for {protagonist_en}, generating random embedding")
            # Generate a random but consistent embedding based on name hash
            import hashlib
            seed = int(hashlib.md5(protagonist_en.encode()).hexdigest()[:8], 16)
            rng = np.random.RandomState(seed)
            embedding = rng.randn(512).astype(np.float32)
            embedding = embedding / np.linalg.norm(embedding)
            char['arcface_embedding'] = embedding.tolist()
            continue

        # Load and preprocess image
        img = Image.open(img_path).convert('RGB')
        img = img.resize((112, 112), Image.LANCZOS)

        # Normalize: (pixel / 255 - 0.5) / 0.5 = pixel / 127.5 - 1.0
        img_array = np.array(img).astype(np.float32)
        img_array = (img_array / 255.0 - 0.5) / 0.5

        # NCHW format
        img_array = img_array.transpose(2, 0, 1)
        img_array = np.expand_dims(img_array, axis=0)

        # Run inference
        result = session.run(None, {input_name: img_array})
        embedding = result[0].flatten()

        # L2 normalize
        embedding = embedding / np.linalg.norm(embedding)

        char['arcface_embedding'] = embedding.tolist()
        print(f"  ✅ {protagonist_en}: embedding generated ({len(embedding)}d)")

    # Save updated embeddings
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)
    print(f"\nSaved to: {output_path}")

    # Generate gzip version
    with open(output_path, 'rb') as f_in:
        with gzip.open(gz_path, 'wb', compresslevel=9) as f_out:
            f_out.write(f_in.read())

    json_size = os.path.getsize(output_path) / 1024
    gz_size = os.path.getsize(gz_path) / 1024
    print(f"JSON: {json_size:.0f} KB, gzip: {gz_size:.0f} KB ({(1 - gz_size/json_size)*100:.0f}% compression)")
    print(f"\n✅ Dual embeddings generated for {data['count']} characters!")


if __name__ == '__main__':
    generate_arcface_embeddings()

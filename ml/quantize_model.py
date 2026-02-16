#!/usr/bin/env python3
"""
AniMatch — CLIP ONNX Model Quantization
Quantizes the CLIP image encoder to INT8 for browser deployment.
Reduces model size from ~335MB to ~85MB.

Usage:
  python quantize_model.py
"""

import os
import numpy as np
import onnx
from onnxruntime.quantization import quantize_dynamic, QuantType

MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'models')
INPUT_MODEL = os.path.join(MODEL_DIR, 'clip-image-encoder.onnx')
OUTPUT_MODEL = os.path.join(MODEL_DIR, 'clip-image-encoder-q8.onnx')


def main():
    print("🎌 AniMatch — CLIP Model Quantization")
    print(f"  Input:  {INPUT_MODEL}")
    print(f"  Output: {OUTPUT_MODEL}")
    print()

    # Check if input exists
    if not os.path.exists(INPUT_MODEL):
        print("❌ Input model not found. Run export_clip_onnx.py first.")
        return

    input_size = os.path.getsize(INPUT_MODEL) / (1024 * 1024)
    print(f"📦 Input model size: {input_size:.1f} MB")

    # Load model to check and potentially consolidate external data
    print("📦 Loading ONNX model...")
    model = onnx.load(INPUT_MODEL)
    onnx.checker.check_model(model)
    print("  ✅ Model validated")

    # Save as consolidated single file (handles external data format)
    temp_path = os.path.join(MODEL_DIR, '_temp_consolidated.onnx')
    print("📦 Consolidating to single file...")
    onnx.save(
        model,
        temp_path,
        save_as_external_data=False,
        all_tensors_to_one_file=True,
        size_threshold=0,
    )
    del model  # Free memory
    print("  ✅ Consolidated")

    # Dynamic INT8 quantization
    print("⚡ Quantizing to INT8 (dynamic)...")
    quantize_dynamic(
        temp_path,
        OUTPUT_MODEL,
        weight_type=QuantType.QUInt8,
    )

    # Cleanup temp file
    os.remove(temp_path)

    output_size = os.path.getsize(OUTPUT_MODEL) / (1024 * 1024)
    reduction = (1 - output_size / input_size) * 100
    print(f"\n{'='*50}")
    print(f"✅ Quantization complete!")
    print(f"📊 {input_size:.1f} MB → {output_size:.1f} MB ({reduction:.0f}% reduction)")

    # Verify quantized model
    print("\n🔍 Verifying quantized model...")
    import onnxruntime as ort
    session = ort.InferenceSession(OUTPUT_MODEL)
    input_name = session.get_inputs()[0].name
    dummy = np.random.randn(1, 3, 224, 224).astype(np.float32)
    result = session.run(None, {input_name: dummy})
    print(f"  ✅ Output shape: {result[0].shape}")
    print(f"  ✅ Embedding dim: {result[0].shape[1]}")

    # Compare with original
    original_session = ort.InferenceSession(INPUT_MODEL)
    original_result = original_session.run(None, {input_name: dummy})
    diff = np.abs(original_result[0] - result[0]).max()
    cos_sim = np.dot(original_result[0][0], result[0][0]) / (
        np.linalg.norm(original_result[0][0]) * np.linalg.norm(result[0][0])
    )
    print(f"  📊 Max diff (fp32 vs INT8): {diff:.6f}")
    print(f"  📊 Cosine similarity: {cos_sim:.6f}")
    print(f"\n📁 Saved to: {OUTPUT_MODEL}")


if __name__ == '__main__':
    main()

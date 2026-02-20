#!/usr/bin/env python3
"""
AniMatch — CLIP ONNX Model Quantization (INT4)
Quantizes the CLIP image encoder to UINT4 for lightweight mobile deployment.

Usage:
  cd ml && source .venv/bin/activate
  python quantize_clip_q4.py
"""

import os
import numpy as np
from onnxruntime.quantization import quantize_dynamic, QuantType

MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'models')
# Use the FULL fp32 model as input for best Q4 quality (if available),
# otherwise fall back to Q8 as input.
FP32_MODEL = os.path.join(MODEL_DIR, 'clip-image-encoder.onnx')
Q8_MODEL = os.path.join(MODEL_DIR, 'clip-image-encoder-q8.onnx')
OUTPUT_MODEL = os.path.join(MODEL_DIR, 'clip-image-encoder-q4.onnx')


def main():
    print("🎌 AniMatch — CLIP Model Quantization (UINT4)")
    print()

    # Choose the best available source model
    if os.path.exists(FP32_MODEL):
        input_model = FP32_MODEL
        print(f"  Using FP32 source: {input_model}")
    elif os.path.exists(Q8_MODEL):
        input_model = Q8_MODEL
        print(f"  Using Q8 source: {input_model}")
    else:
        print("❌ No source model found.")
        return

    input_size = os.path.getsize(input_model) / (1024 * 1024)
    print(f"📦 Input model size: {input_size:.1f} MB")

    # Dynamic UINT4 quantization
    print("⚡ Quantizing to UINT4 (dynamic)...")
    quantize_dynamic(
        input_model,
        OUTPUT_MODEL,
        weight_type=QuantType.QUInt4,
    )

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

    # Compare with source
    original_session = ort.InferenceSession(input_model)
    original_result = original_session.run(None, {input_name: dummy})
    diff = np.abs(original_result[0] - result[0]).max()
    cos_sim = np.dot(original_result[0][0], result[0][0]) / (
        np.linalg.norm(original_result[0][0]) * np.linalg.norm(result[0][0])
    )
    print(f"  📊 Max diff: {diff:.6f}")
    print(f"  📊 Cosine similarity: {cos_sim:.6f}")
    print(f"\n📁 Saved to: {OUTPUT_MODEL}")


if __name__ == '__main__':
    main()

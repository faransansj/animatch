"""
Quantize MobileFaceNet ONNX model to INT8 for browser deployment.

Target: public/models/mobilefacenet-q8.onnx < 15MB

Usage:
    python ml/quantize_arcface.py
"""

import os
import numpy as np


def quantize_model():
    from onnxruntime.quantization import quantize_dynamic, QuantType
    import onnxruntime as ort

    script_dir = os.path.dirname(__file__)
    input_path = os.path.join(script_dir, 'models', 'mobilefacenet.onnx')
    output_path = os.path.join(script_dir, '..', 'public', 'models', 'mobilefacenet-q8.onnx')

    if not os.path.exists(input_path):
        raise FileNotFoundError(
            f"Source model not found: {input_path}\n"
            "Run export_arcface_onnx.py first."
        )

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    print(f"Input: {input_path}")
    print(f"Input size: {os.path.getsize(input_path) / 1024 / 1024:.1f} MB")

    # Dynamic INT8 quantization
    quantize_dynamic(
        input_path,
        output_path,
        weight_type=QuantType.QInt8,
    )

    output_size = os.path.getsize(output_path) / 1024 / 1024
    input_size = os.path.getsize(input_path) / 1024 / 1024
    print(f"\nOutput: {output_path}")
    print(f"Output size: {output_size:.1f} MB")
    print(f"Compression: {(1 - output_size / input_size) * 100:.0f}% reduction")

    # Verify quality
    verify_quality(input_path, output_path)


def verify_quality(fp32_path: str, int8_path: str):
    """Compare FP32 vs INT8 model outputs."""
    import onnxruntime as ort

    session_fp32 = ort.InferenceSession(fp32_path, providers=['CPUExecutionProvider'])
    session_int8 = ort.InferenceSession(int8_path, providers=['CPUExecutionProvider'])

    input_name = session_fp32.get_inputs()[0].name
    input_shape = session_fp32.get_inputs()[0].shape

    # Test with multiple random inputs
    similarities = []
    for _ in range(10):
        dummy = np.random.randn(*input_shape).astype(np.float32)
        out_fp32 = session_fp32.run(None, {input_name: dummy})[0].flatten()
        out_int8 = session_int8.run(None, {input_name: dummy})[0].flatten()

        # Cosine similarity
        cos_sim = np.dot(out_fp32, out_int8) / (np.linalg.norm(out_fp32) * np.linalg.norm(out_int8))
        similarities.append(cos_sim)

    avg_sim = np.mean(similarities)
    print(f"\nFP32 vs INT8 cosine similarity: {avg_sim:.4f}")

    if avg_sim > 0.98:
        print("✅ Excellent quality — minimal degradation")
    elif avg_sim > 0.95:
        print("⚠️ Good quality — minor degradation")
    else:
        print("❌ Significant quality loss — consider higher precision")


if __name__ == '__main__':
    quantize_model()
    print("\n✅ ArcFace quantization complete!")

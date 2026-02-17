"""
Export MobileFaceNet (ArcFace) model to ONNX format.
Downloads buffalo_sc recognition model from insightface releases.

Input: [1, 3, 112, 112] (RGB, normalized)
Output: [1, 512] (face embedding)

Usage:
    python ml/export_arcface_onnx.py
"""

import os
import numpy as np


def download_mobilefacenet():
    """Download MobileFaceNet from insightface buffalo_sc release."""
    import onnx
    import urllib.request
    import zipfile
    import tempfile

    model_dir = os.path.join(os.path.dirname(__file__), 'models')
    os.makedirs(model_dir, exist_ok=True)

    output_path = os.path.join(model_dir, 'mobilefacenet.onnx')

    if os.path.exists(output_path):
        print(f"Model already exists: {output_path}")
        return output_path

    # buffalo_sc: lightweight face recognition model from insightface
    # Contains: det_500m.onnx (detector) + w600k_mbf.onnx (MobileFaceNet recognizer)
    url = "https://github.com/deepinsight/insightface/releases/download/v0.7/buffalo_sc.zip"
    print(f"Downloading buffalo_sc from: {url}")

    with tempfile.TemporaryDirectory() as tmpdir:
        zip_path = os.path.join(tmpdir, 'buffalo_sc.zip')
        urllib.request.urlretrieve(url, zip_path)
        print(f"Downloaded: {os.path.getsize(zip_path) / 1024 / 1024:.1f} MB")

        with zipfile.ZipFile(zip_path, 'r') as zf:
            # Find the recognition model (w600k_mbf.onnx)
            rec_files = [f for f in zf.namelist() if 'w600k' in f and f.endswith('.onnx')]
            if not rec_files:
                # Fallback: look for any .onnx that's not det_
                rec_files = [f for f in zf.namelist() if f.endswith('.onnx') and 'det_' not in f]

            if not rec_files:
                raise RuntimeError(f"No recognition model found in zip. Contents: {zf.namelist()}")

            rec_file = rec_files[0]
            print(f"Extracting: {rec_file}")
            with zf.open(rec_file) as src, open(output_path, 'wb') as dst:
                dst.write(src.read())

    print(f"Saved to: {output_path}")
    print(f"Size: {os.path.getsize(output_path) / 1024 / 1024:.1f} MB")
    return output_path


def verify_model(model_path: str):
    """Verify the ONNX model structure."""
    import onnx
    import onnxruntime as ort

    model = onnx.load(model_path)
    print(f"\nModel: {model_path}")
    print(f"IR version: {model.ir_version}")
    print(f"Opset: {model.opset_import[0].version}")

    # Check input/output
    for inp in model.graph.input:
        shape = [d.dim_value for d in inp.type.tensor_type.shape.dim]
        print(f"Input: {inp.name} → {shape}")

    for out in model.graph.output:
        shape = [d.dim_value for d in out.type.tensor_type.shape.dim]
        print(f"Output: {out.name} → {shape}")

    # Test inference
    session = ort.InferenceSession(model_path, providers=['CPUExecutionProvider'])
    input_name = session.get_inputs()[0].name
    input_shape = session.get_inputs()[0].shape
    # Replace dynamic dims (str/0) with 1
    input_shape = [1 if isinstance(d, str) or d == 0 else d for d in input_shape]

    dummy = np.random.randn(*input_shape).astype(np.float32)
    result = session.run(None, {input_name: dummy})
    print(f"Test output shape: {result[0].shape}")
    print(f"Model file size: {os.path.getsize(model_path) / 1024 / 1024:.1f} MB")


if __name__ == '__main__':
    model_path = download_mobilefacenet()
    verify_model(model_path)
    print("\n✅ MobileFaceNet ONNX export complete!")

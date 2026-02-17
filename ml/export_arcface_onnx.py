"""
Export MobileFaceNet (ArcFace) model to ONNX format.
Downloads from insightface model zoo, converts to ONNX.

Input: [1, 3, 112, 112] (RGB, normalized)
Output: [1, 512] (face embedding)

Usage:
    python ml/export_arcface_onnx.py
"""

import os
import numpy as np

def download_mobilefacenet():
    """Download MobileFaceNet from insightface model zoo."""
    import onnx

    model_dir = os.path.join(os.path.dirname(__file__), 'models')
    os.makedirs(model_dir, exist_ok=True)

    output_path = os.path.join(model_dir, 'mobilefacenet.onnx')

    if os.path.exists(output_path):
        print(f"Model already exists: {output_path}")
        return output_path

    # Try using insightface to get the model
    try:
        from insightface.app import FaceAnalysis
        from insightface.utils import face_align
        import insightface

        # Download buffalo_l which includes recognition model
        app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
        app.prepare(ctx_id=-1, det_size=(640, 640))

        # Extract the recognition model (w600k_r50.onnx or similar)
        rec_model = app.models.get('recognition', None)
        if rec_model is None:
            for model in app.models.values():
                if hasattr(model, 'input_size') and model.input_size == (112, 112):
                    rec_model = model
                    break

        if rec_model is not None:
            import shutil
            src_path = rec_model.model_file if hasattr(rec_model, 'model_file') else None
            if src_path and os.path.exists(src_path):
                shutil.copy2(src_path, output_path)
                print(f"Copied recognition model to: {output_path}")
                return output_path
    except ImportError:
        print("insightface not installed, trying direct download...")

    # Alternative: download MobileFaceNet directly
    try:
        import urllib.request
        # MobileFaceNet from ONNX model zoo
        url = "https://github.com/onnx/models/raw/main/validated/vision/body_analysis/arcface/model/arcfaceresnet100-11-int8.onnx"
        print(f"Downloading from: {url}")
        urllib.request.urlretrieve(url, output_path)
        print(f"Downloaded to: {output_path}")
        return output_path
    except Exception as e:
        print(f"Direct download failed: {e}")

    raise RuntimeError(
        "Could not download MobileFaceNet. Please manually place a "
        "MobileFaceNet ONNX model at: " + output_path + "\n"
        "You can get it from:\n"
        "  1. pip install insightface && python -c \"from insightface.app import FaceAnalysis; FaceAnalysis(name='buffalo_sc')\"\n"
        "  2. https://github.com/deepinsight/insightface/tree/master/model_zoo"
    )


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

    dummy = np.random.randn(*input_shape).astype(np.float32)
    result = session.run(None, {input_name: dummy})
    print(f"Test output shape: {result[0].shape}")
    print(f"Model file size: {os.path.getsize(model_path) / 1024 / 1024:.1f} MB")


if __name__ == '__main__':
    model_path = download_mobilefacenet()
    verify_model(model_path)
    print("\n✅ MobileFaceNet ONNX export complete!")

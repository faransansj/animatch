#!/usr/bin/env python3
"""
AniMatch — CLIP Image Encoder ONNX Export
Exports the CLIP ViT-B/32 image encoder to ONNX format
for browser-side inference via ONNX Runtime Web.

Usage:
  python export_clip_onnx.py
"""

import os
import torch
import numpy as np
import open_clip

MODEL_NAME = 'ViT-B-32'
PRETRAINED = 'openai'
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'models')
ONNX_PATH = os.path.join(OUTPUT_DIR, 'clip-image-encoder.onnx')

class CLIPImageEncoder(torch.nn.Module):
    """Wrapper that only exposes the image encoder portion of CLIP."""
    def __init__(self, clip_model):
        super().__init__()
        self.visual = clip_model.visual
    
    def forward(self, image):
        features = self.visual(image)
        # Normalize
        features = features / features.norm(dim=-1, keepdim=True)
        return features

def main():
    print("🎌 AniMatch — CLIP ONNX Export")
    print(f"  Model: {MODEL_NAME} ({PRETRAINED})")
    print()

    # Load model
    print("📦 Loading CLIP model...")
    model, _, preprocess = open_clip.create_model_and_transforms(
        MODEL_NAME, pretrained=PRETRAINED, device='cpu'
    )
    model.eval()
    print("  ✅ Model loaded")

    # Wrap image encoder
    encoder = CLIPImageEncoder(model)
    encoder.eval()

    # Create dummy input (224x224 RGB image, batch=1)
    dummy_input = torch.randn(1, 3, 224, 224)

    # Export to ONNX
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"\n📤 Exporting to ONNX: {ONNX_PATH}")
    
    torch.onnx.export(
        encoder,
        dummy_input,
        ONNX_PATH,
        export_params=True,
        opset_version=18,
        do_constant_folding=True,
        input_names=['image'],
        output_names=['embedding'],
        dynamo=False,
    )

    # Verify
    import onnx
    onnx_model = onnx.load(ONNX_PATH)
    onnx.checker.check_model(onnx_model)
    
    file_size = os.path.getsize(ONNX_PATH) / (1024 * 1024)
    print(f"  ✅ ONNX model exported ({file_size:.1f} MB)")

    # Verify with ONNX Runtime
    import onnxruntime as ort
    session = ort.InferenceSession(ONNX_PATH)
    input_name = session.get_inputs()[0].name
    result = session.run(None, {input_name: dummy_input.numpy()})
    
    print(f"  ✅ ONNX Runtime verification passed")
    print(f"  📊 Output shape: {result[0].shape}")
    print(f"  📊 Embedding dim: {result[0].shape[1]}")

    # Compare with PyTorch output
    with torch.no_grad():
        torch_output = encoder(dummy_input).numpy()
    
    diff = np.abs(torch_output - result[0]).max()
    print(f"  📊 Max diff (PyTorch vs ONNX): {diff:.6f}")

    # Also save preprocessing config
    config_path = os.path.join(OUTPUT_DIR, 'preprocess_config.json')
    import json
    config = {
        'input_size': 224,
        'mean': [0.48145466, 0.4578275, 0.40821073],
        'std': [0.26862954, 0.26130258, 0.27577711],
        'interpolation': 'bicubic'
    }
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)
    print(f"  ✅ Preprocessing config saved: {config_path}")

    print(f"\n{'='*50}")
    print(f"✅ Export complete!")
    print(f"📁 Model: {ONNX_PATH} ({file_size:.1f} MB)")
    print(f"📁 Config: {config_path}")

if __name__ == '__main__':
    main()

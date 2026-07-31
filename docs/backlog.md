# Backlog

## MobileCLIP migration

**Status:** Backlog

Replace CLIP ViT-B/32 Q4 with a smaller MobileCLIP image encoder when Q4 download size or inference latency becomes a measured bottleneck.

Before release:
- regenerate every character embedding with the replacement model;
- compare matching accuracy against the current Q4 baseline;
- verify ONNX Runtime Web support on desktop and mobile;
- ship only if model size and latency improve without unacceptable accuracy loss.

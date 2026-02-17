export const PREPROCESS = {
  size: 224,
  mean: [0.48145466, 0.4578275, 0.40821073] as const,
  std: [0.26862954, 0.26130258, 0.27577711] as const,
};

export const MODEL_PATHS = [
  '/models/clip-image-encoder-q8.onnx',
  '/models/clip-image-encoder.onnx',
] as const;

import { PREPROCESS } from './types';

export function preprocessImage(imageDataURL: string): Promise<Float32Array> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = PREPROCESS.size;
      canvas.height = PREPROCESS.size;
      const ctx = canvas.getContext('2d')!;

      // Center crop to square, then resize to 224x224
      const shorter = Math.min(img.width, img.height);
      const sx = (img.width - shorter) / 2;
      const sy = (img.height - shorter) / 2;
      ctx.drawImage(img, sx, sy, shorter, shorter, 0, 0, PREPROCESS.size, PREPROCESS.size);

      const imageData = ctx.getImageData(0, 0, PREPROCESS.size, PREPROCESS.size);
      const pixels = imageData.data;

      // Convert to NCHW float32 with CLIP normalization
      const float32 = new Float32Array(3 * PREPROCESS.size * PREPROCESS.size);
      for (let y = 0; y < PREPROCESS.size; y++) {
        for (let x = 0; x < PREPROCESS.size; x++) {
          const srcIdx = (y * PREPROCESS.size + x) * 4;
          for (let c = 0; c < 3; c++) {
            const dstIdx = c * PREPROCESS.size * PREPROCESS.size + y * PREPROCESS.size + x;
            float32[dstIdx] = (pixels[srcIdx + c]! / 255 - PREPROCESS.mean[c as 0 | 1 | 2]) / PREPROCESS.std[c as 0 | 1 | 2];
          }
        }
      }

      resolve(float32);
    };
    img.onerror = () => reject(new Error('CLIP preprocessing: image load failed'));
    img.src = imageDataURL;
  });
}

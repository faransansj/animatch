/**
 * Lightweight anime-style filter using Canvas operations.
 * Applies edge detection + color quantization + saturation boost.
 * No ML model needed — pure Canvas 2D processing.
 */

export function applyAnimeFilter(imageDataURL: string, strength = 0.7): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // Work at reduced resolution for performance
      const maxSize = 512;
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);

      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;

      // Step 1: Color quantization (reduce color palette for cel-shading look)
      const levels = Math.round(4 + (1 - strength) * 8); // 4-12 levels
      const step = 255 / levels;
      for (let i = 0; i < data.length; i += 4) {
        data[i]! = Math.round(data[i]! / step) * step;     // R
        data[i + 1]! = Math.round(data[i + 1]! / step) * step; // G
        data[i + 2]! = Math.round(data[i + 2]! / step) * step; // B
      }

      // Step 2: Saturation boost
      const satBoost = 1 + strength * 0.4;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]!, g = data[i + 1]!, b = data[i + 2]!;
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        data[i] = clamp(gray + (r - gray) * satBoost);
        data[i + 1] = clamp(gray + (g - gray) * satBoost);
        data[i + 2] = clamp(gray + (b - gray) * satBoost);
      }

      ctx.putImageData(imageData, 0, 0);

      // Step 3: Subtle edge overlay using Sobel-like detection
      const edgeCanvas = document.createElement('canvas');
      edgeCanvas.width = w;
      edgeCanvas.height = h;
      const edgeCtx = edgeCanvas.getContext('2d')!;
      edgeCtx.drawImage(img, 0, 0, w, h);
      const edgeData = edgeCtx.getImageData(0, 0, w, h);
      const edges = detectEdges(edgeData);

      // Blend edges onto the quantized image
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = strength * 0.5;
      const edgeImageData = ctx.createImageData(w, h);
      for (let i = 0; i < edges.length; i++) {
        const v = 255 - edges[i]! * 255;
        edgeImageData.data[i * 4] = v;
        edgeImageData.data[i * 4 + 1] = v;
        edgeImageData.data[i * 4 + 2] = v;
        edgeImageData.data[i * 4 + 3] = 255;
      }
      edgeCtx.putImageData(edgeImageData, 0, 0);
      ctx.drawImage(edgeCanvas, 0, 0);

      // Step 4: Slight blur for smoothness
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.filter = `blur(${Math.round(strength * 0.5)}px)`;
      ctx.drawImage(canvas, 0, 0);
      ctx.filter = 'none';

      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.src = imageDataURL;
  });
}

function detectEdges(imageData: ImageData): Float32Array {
  const { width, height, data } = imageData;
  const gray = new Float32Array(width * height);

  // Convert to grayscale
  for (let i = 0; i < gray.length; i++) {
    gray[i] = (data[i * 4]! * 0.299 + data[i * 4 + 1]! * 0.587 + data[i * 4 + 2]! * 0.114) / 255;
  }

  // Simple Sobel edge detection
  const edges = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const gx =
        -gray[(y - 1) * width + (x - 1)]! + gray[(y - 1) * width + (x + 1)]! +
        -2 * gray[y * width + (x - 1)]! + 2 * gray[y * width + (x + 1)]! +
        -gray[(y + 1) * width + (x - 1)]! + gray[(y + 1) * width + (x + 1)]!;

      const gy =
        -gray[(y - 1) * width + (x - 1)]! - 2 * gray[(y - 1) * width + x]! - gray[(y - 1) * width + (x + 1)]! +
        gray[(y + 1) * width + (x - 1)]! + 2 * gray[(y + 1) * width + x]! + gray[(y + 1) * width + (x + 1)]!;

      edges[idx] = Math.min(1, Math.sqrt(gx * gx + gy * gy) * 2);
    }
  }

  return edges;
}

function clamp(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

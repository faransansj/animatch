import type { FeedbackItem } from '@/types/common';

export function resizeImage(dataURL: string, maxDim: number = 1080): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let drawW = img.width;
      let drawH = img.height;

      // If image is already smaller than max dimensions, return original data URL
      if (drawW <= maxDim && drawH <= maxDim) {
        resolve(dataURL);
        return;
      }

      const scale = maxDim / Math.max(drawW, drawH);
      drawW = Math.round(drawW * scale);
      drawH = Math.round(drawH * scale);

      const canvas = document.createElement('canvas');
      canvas.width = drawW;
      canvas.height = drawH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataURL); // Fallback
        return;
      }

      ctx.drawImage(img, 0, 0, drawW, drawH);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = () => resolve(dataURL);
    img.src = dataURL;
  });
}

export function runGuidelineCheck(imageData: string): Promise<FeedbackItem[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const MAX_DIM = 2048;
      let drawW = img.width;
      let drawH = img.height;
      if (drawW > MAX_DIM || drawH > MAX_DIM) {
        const scale = MAX_DIM / Math.max(drawW, drawH);
        drawW = Math.round(drawW * scale);
        drawH = Math.round(drawH * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = drawW;
      canvas.height = drawH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve([]);
        return;
      }
      ctx.drawImage(img, 0, 0, drawW, drawH);
      const data = ctx.getImageData(0, 0, drawW, drawH).data;

      // Check brightness
      let totalBrightness = 0;
      const sampleStep = 40;
      let sampleCount = 0;
      for (let i = 0; i < data.length; i += 4 * sampleStep) {
        totalBrightness += ((data[i] ?? 0) * 0.299 + (data[i + 1] ?? 0) * 0.587 + (data[i + 2] ?? 0) * 0.114);
        sampleCount++;
      }
      const avgBrightness = totalBrightness / sampleCount;
      const isBright = avgBrightness > 60;

      // Check aspect ratio (use original dimensions for accuracy)
      const ratio = img.width / img.height;
      const isPortrait = ratio < 1.5;

      // Check resolution (use original dimensions)
      const isHighRes = img.width >= 200 && img.height >= 200;

      // Center region skin-tone analysis
      const cx = Math.floor(drawW / 2);
      const cy = Math.floor(drawH / 3);
      const checkRadius = Math.floor(Math.min(drawW, drawH) * 0.15);
      let skinPixels = 0;
      let totalChecked = 0;
      for (let y = cy - checkRadius; y < cy + checkRadius; y += 3) {
        for (let x = cx - checkRadius; x < cx + checkRadius; x += 3) {
          if (x < 0 || y < 0 || x >= drawW || y >= drawH) continue;
          const idx = (y * drawW + x) * 4;
          const r = data[idx] ?? 0, g = data[idx + 1] ?? 0, b = data[idx + 2] ?? 0;
          if (r > 80 && g > 50 && b > 30 && r > g && r > b && (r - g) > 10) {
            skinPixels++;
          }
          totalChecked++;
        }
      }
      const hasFace = totalChecked > 0 && (skinPixels / totalChecked) > 0.15;

      resolve([
        { pass: isBright, passText: 'upload.feedbackBright', failText: 'upload.feedbackDark' },
        { pass: isPortrait, passText: 'upload.feedbackGoodRatio', failText: 'upload.feedbackWideRatio' },
        { pass: isHighRes, passText: 'upload.feedbackHighRes', failText: 'upload.feedbackLowRes' },
        { pass: hasFace, passText: 'upload.feedbackFaceFound', failText: 'upload.feedbackNoFace' },
      ]);
    };
    img.src = imageData;
  });
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

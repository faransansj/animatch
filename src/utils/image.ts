import type { FeedbackItem } from '@/types/common';

export function runGuidelineCheck(imageData: string): Promise<FeedbackItem[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

      // Check brightness
      let totalBrightness = 0;
      const sampleStep = 40;
      let sampleCount = 0;
      for (let i = 0; i < data.length; i += 4 * sampleStep) {
        totalBrightness += (data[i]! * 0.299 + data[i + 1]! * 0.587 + data[i + 2]! * 0.114);
        sampleCount++;
      }
      const avgBrightness = totalBrightness / sampleCount;
      const isBright = avgBrightness > 60;

      // Check aspect ratio
      const ratio = img.width / img.height;
      const isPortrait = ratio < 1.5;

      // Check resolution
      const isHighRes = img.width >= 200 && img.height >= 200;

      // Center region skin-tone analysis
      const cx = Math.floor(img.width / 2);
      const cy = Math.floor(img.height / 3);
      const checkRadius = Math.floor(Math.min(img.width, img.height) * 0.15);
      let skinPixels = 0;
      let totalChecked = 0;
      for (let y = cy - checkRadius; y < cy + checkRadius; y += 3) {
        for (let x = cx - checkRadius; x < cx + checkRadius; x += 3) {
          if (x < 0 || y < 0 || x >= img.width || y >= img.height) continue;
          const idx = (y * img.width + x) * 4;
          const r = data[idx]!, g = data[idx + 1]!, b = data[idx + 2]!;
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

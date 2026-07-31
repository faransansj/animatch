import type { FeedbackItem } from '@/types/common';
import {
  MAX_IMAGE_DIMENSIONS,
  MIN_IMAGE_DIMENSIONS,
  sanitizeImageData,
} from './fileValidation';

function loadImage(dataURL: string): Promise<{ image: HTMLImageElement; sanitizedData: string }> {
  const sanitizedData = sanitizeImageData(dataURL);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ image, sanitizedData });
    image.onerror = () => reject(new Error('Failed to load image'));
    image.src = sanitizedData;
  });
}

function validateDimensions(image: HTMLImageElement): void {
  const { width, height } = image;
  if (width > MAX_IMAGE_DIMENSIONS.width || height > MAX_IMAGE_DIMENSIONS.height) {
    throw new Error(`Image dimensions (${width}x${height}) exceed the maximum limit (${MAX_IMAGE_DIMENSIONS.width}x${MAX_IMAGE_DIMENSIONS.height}).`);
  }
  if (width < MIN_IMAGE_DIMENSIONS.width || height < MIN_IMAGE_DIMENSIONS.height) {
    throw new Error(`Image dimensions (${width}x${height}) are too small for face detection.`);
  }
}

function drawToCanvas(image: HTMLImageElement, maxDim: number): HTMLCanvasElement {
  const scale = Math.min(1, maxDim / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Failed to get canvas context');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function analyzeCanvas(canvas: HTMLCanvasElement, originalWidth: number, originalHeight: number): FeedbackItem[] {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Failed to get canvas context');
  const data = context.getImageData(0, 0, canvas.width, canvas.height).data;

  let totalBrightness = 0;
  let sampleCount = 0;
  const sampleStep = Math.max(1, Math.floor(data.length / 4 / 1000));
  for (let i = 0; i < data.length; i += 4 * sampleStep) {
    totalBrightness += (data[i] ?? 0) * 0.299
      + (data[i + 1] ?? 0) * 0.587
      + (data[i + 2] ?? 0) * 0.114;
    sampleCount++;
  }

  const centerX = Math.floor(canvas.width / 2);
  const centerY = Math.floor(canvas.height / 3);
  const radius = Math.floor(Math.min(canvas.width, canvas.height) * 0.15);
  let skinPixels = 0;
  let checkedPixels = 0;
  for (let y = centerY - radius; y < centerY + radius; y += 3) {
    for (let x = centerX - radius; x < centerX + radius; x += 3) {
      if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) continue;
      const index = (y * canvas.width + x) * 4;
      const red = data[index] ?? 0;
      const green = data[index + 1] ?? 0;
      const blue = data[index + 2] ?? 0;
      if (red > 80 && green > 50 && blue > 30 && red > green && red > blue && red - green > 10) {
        skinPixels++;
      }
      checkedPixels++;
    }
  }

  return [
    { pass: totalBrightness / sampleCount > 60, passText: 'upload.feedbackBright', failText: 'upload.feedbackDark' },
    { pass: originalWidth / originalHeight < 1.5, passText: 'upload.feedbackGoodRatio', failText: 'upload.feedbackWideRatio' },
    { pass: originalWidth >= 200 && originalHeight >= 200, passText: 'upload.feedbackHighRes', failText: 'upload.feedbackLowRes' },
    { pass: checkedPixels > 0 && skinPixels / checkedPixels > 0.15, passText: 'upload.feedbackFaceFound', failText: 'upload.feedbackNoFace' },
  ];
}

export async function processImage(dataURL: string, maxDim = 1080): Promise<{
  dataURL: string;
  feedback: FeedbackItem[];
}> {
  const { image, sanitizedData } = await loadImage(dataURL);
  validateDimensions(image);
  const canvas = drawToCanvas(image, maxDim);
  return {
    dataURL: image.width <= maxDim && image.height <= maxDim
      ? sanitizedData
      : canvas.toDataURL('image/jpeg', 0.92),
    feedback: analyzeCanvas(canvas, image.width, image.height),
  };
}

export async function resizeImage(dataURL: string, maxDim = 1080): Promise<string> {
  const { image, sanitizedData } = await loadImage(dataURL);
  validateDimensions(image);
  if (image.width <= maxDim && image.height <= maxDim) return sanitizedData;
  return drawToCanvas(image, maxDim).toDataURL('image/jpeg', 0.92);
}

export async function runGuidelineCheck(imageData: string): Promise<FeedbackItem[]> {
  const { image } = await loadImage(imageData);
  const canvas = drawToCanvas(image, 2048);
  return analyzeCanvas(canvas, image.width, image.height);
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

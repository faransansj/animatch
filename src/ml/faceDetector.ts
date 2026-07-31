import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';
import type { DetectedFace } from '@/types/common';

let faceDetector: FaceDetector | null = null;

export async function initFaceDetector(
  maxRetries: number = 3,
  onProgress?: (progress: number) => void,
): Promise<boolean> {
  const wasmUrl = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      onProgress?.(10 + (attempt * 15));
      console.log(`[FaceDetector] Attempt ${attempt}/${maxRetries} to initialize`);

      const vision = await FilesetResolver.forVisionTasks(wasmUrl);

      // Try GPU first, fallback to CPU if fails
      try {
        faceDetector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
            delegate: 'GPU',
          },
          runningMode: 'IMAGE',
          minDetectionConfidence: 0.5,
        });

        // Test the detector with a dummy canvas to ensure GPU works
        const testCanvas = document.createElement('canvas');
        testCanvas.width = 100;
        testCanvas.height = 100;
        faceDetector.detect(testCanvas);

        console.log(`[FaceDetector] GPU initialization successful on attempt ${attempt}`);
        return true;

      } catch (gpuError) {
        console.warn(`[FaceDetector] GPU failed on attempt ${attempt}, trying CPU:`, (gpuError as Error).message);

        // Fallback to CPU
        faceDetector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
            delegate: 'CPU',
          },
          runningMode: 'IMAGE',
          minDetectionConfidence: 0.5,
        });

        console.log(`[FaceDetector] CPU fallback successful on attempt ${attempt}`);
        return true;
      }

    } catch (e) {
      console.warn(`[FaceDetector] Attempt ${attempt}/${maxRetries} failed:`, (e as Error).message);

      if (attempt === maxRetries) {
        console.error(`[FaceDetector] Failed to initialize after ${maxRetries} attempts`);
        return false;
      }

      // Exponential backoff with jitter
      const delay = Math.min(1000 * Math.pow(2, attempt - 1) + Math.random() * 1000, 5000);
      console.log(`[FaceDetector] Retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return false;
}

export function isFaceDetectorReady(): boolean {
  return faceDetector !== null;
}

export function detectFaces(imageElement: HTMLImageElement | HTMLCanvasElement): DetectedFace[] {
  if (!faceDetector) return [];

  let input: HTMLImageElement | HTMLCanvasElement = imageElement;
  let scaleX = 1;
  let scaleY = 1;
  if (imageElement instanceof HTMLImageElement && (imageElement.naturalWidth > 1024 || imageElement.naturalHeight > 1024)) {
    const scale = 1024 / Math.max(imageElement.naturalWidth, imageElement.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = imageElement.naturalWidth * scale;
    canvas.height = imageElement.naturalHeight * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
    input = canvas;
    scaleX = imageElement.naturalWidth / canvas.width;
    scaleY = imageElement.naturalHeight / canvas.height;
  }

  const result = faceDetector.detect(input);

  return result.detections.map(d => {
    const bbox = d.boundingBox!;
    return {
      x: bbox.originX * scaleX,
      y: bbox.originY * scaleY,
      width: bbox.width * scaleX,
      height: bbox.height * scaleY,
      confidence: d.categories[0]?.score ?? 0,
    };
  });
}

export function cropFaceFromImage(
  imageDataURL: string,
  face: DetectedFace,
  padding = 0.3,
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // Expand bounding box with padding
      const padX = face.width * padding;
      const padY = face.height * padding;
      const x = Math.max(0, face.x - padX);
      const y = Math.max(0, face.y - padY);
      const w = Math.min(img.width - x, face.width + padX * 2);
      const h = Math.min(img.height - y, face.height + padY * 2);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.src = imageDataURL;
  });
}

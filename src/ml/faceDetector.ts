import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';
import type { DetectedFace } from '@/types/common';

let faceDetector: FaceDetector | null = null;

export async function initFaceDetector(): Promise<boolean> {
  try {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm'
    );
    faceDetector = await FaceDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
        delegate: 'GPU',
      },
      runningMode: 'IMAGE',
      minDetectionConfidence: 0.5,
    });
    // For iOS Safari, GPU can sometimes crash. If it initializes but fails during first use,
    // we already have a fallback in catch, but we might want to proactively check or limit.
    return true;
  } catch (e) {
    console.warn('Face detector init failed, trying CPU:', (e as Error).message);
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm'
      );
      faceDetector = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
          delegate: 'CPU',
        },
        runningMode: 'IMAGE',
        minDetectionConfidence: 0.5,
      });
      return true;
    } catch (e2) {
      console.error('Face detector init failed completely:', (e2 as Error).message);
      return false;
    }
  }
}

export function isFaceDetectorReady(): boolean {
  return faceDetector !== null;
}

export function detectFaces(imageElement: HTMLImageElement | HTMLCanvasElement): DetectedFace[] {
  if (!faceDetector) return [];

  // If input is a large image, we should probably downscale it first for stability
  let input: HTMLImageElement | HTMLCanvasElement = imageElement;
  if (imageElement instanceof HTMLImageElement && (imageElement.naturalWidth > 1024 || imageElement.naturalHeight > 1024)) {
    const scale = 1024 / Math.max(imageElement.naturalWidth, imageElement.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = imageElement.naturalWidth * scale;
    canvas.height = imageElement.naturalHeight * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
    input = canvas;
  }

  const result = faceDetector.detect(input);
  // If we downscaled, we need to rescale coordinates back to original image
  const scaleX = imageElement instanceof HTMLImageElement ? imageElement.naturalWidth / (input as HTMLCanvasElement).width : 1;
  const scaleY = imageElement instanceof HTMLImageElement ? imageElement.naturalHeight / (input as HTMLCanvasElement).height : 1;

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

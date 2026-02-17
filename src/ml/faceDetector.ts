import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';
import type { DetectedFace } from '@/types/common';

let faceDetector: FaceDetector | null = null;

export async function initFaceDetector(): Promise<boolean> {
  try {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );
    faceDetector = await FaceDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
        delegate: 'GPU',
      },
      runningMode: 'IMAGE',
      minDetectionConfidence: 0.5,
    });
    return true;
  } catch (e) {
    console.warn('Face detector init failed, trying CPU:', (e as Error).message);
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
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

export function detectFaces(imageElement: HTMLImageElement): DetectedFace[] {
  if (!faceDetector) return [];

  const result = faceDetector.detect(imageElement);
  return result.detections.map(d => {
    const bbox = d.boundingBox!;
    return {
      x: bbox.originX,
      y: bbox.originY,
      width: bbox.width,
      height: bbox.height,
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

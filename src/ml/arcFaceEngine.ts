import { sendWorkerRequest } from './workerClient';

const ARCFACE_SIZE = 112;
const ARCFACE_MEAN = 0.5;
const ARCFACE_STD = 0.5;

let arcfaceReady = false;

export async function initArcFace(): Promise<boolean> {
  if (arcfaceReady) return true;
  try {
    await sendWorkerRequest('INIT_ARCFACE');
    arcfaceReady = true;
    return true;
  } catch (e) {
    console.warn('ArcFace model load failed in worker:', (e as Error).message);
    return false;
  }
}

export async function releaseArcFace(): Promise<void> {
  if (arcfaceReady) {
    arcfaceReady = false;
  }
}

export function isArcFaceReady(): boolean {
  return arcfaceReady;
}

export async function getArcFaceEmbedding(imageDataURL: string): Promise<number[]> {
  if (!arcfaceReady) throw new Error('ArcFace model not loaded');

  const preprocessed = await preprocessArcFace(imageDataURL);

  const embedding = await sendWorkerRequest<Float32Array>(
    'RUN_ARCFACE',
    preprocessed,
    [preprocessed.buffer]
  );

  return Array.from(embedding);
}

function preprocessArcFace(imageDataURL: string): Promise<Float32Array> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = ARCFACE_SIZE;
      canvas.height = ARCFACE_SIZE;
      const ctx = canvas.getContext('2d')!;

      // Center crop to square, resize to 112x112
      const shorter = Math.min(img.width, img.height);
      const sx = (img.width - shorter) / 2;
      const sy = (img.height - shorter) / 2;
      ctx.drawImage(img, sx, sy, shorter, shorter, 0, 0, ARCFACE_SIZE, ARCFACE_SIZE);

      const imageData = ctx.getImageData(0, 0, ARCFACE_SIZE, ARCFACE_SIZE);
      const pixels = imageData.data;

      // NCHW float32, normalized (pixel/255 - 0.5) / 0.5
      const float32 = new Float32Array(3 * ARCFACE_SIZE * ARCFACE_SIZE);
      for (let y = 0; y < ARCFACE_SIZE; y++) {
        for (let x = 0; x < ARCFACE_SIZE; x++) {
          const srcIdx = (y * ARCFACE_SIZE + x) * 4;
          for (let c = 0; c < 3; c++) {
            const dstIdx = c * ARCFACE_SIZE * ARCFACE_SIZE + y * ARCFACE_SIZE + x;
            float32[dstIdx] = (pixels[srcIdx + c]! / 255 - ARCFACE_MEAN) / ARCFACE_STD;
          }
        }
      }

      resolve(float32);
    };
    img.src = imageDataURL;
  });
}

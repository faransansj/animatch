import * as ort from 'onnxruntime-web';

const ARCFACE_SIZE = 112;
const ARCFACE_MEAN = 0.5;
const ARCFACE_STD = 0.5;

let arcfaceSession: ort.InferenceSession | null = null;

export async function initArcFace(): Promise<boolean> {
  try {
    arcfaceSession = await ort.InferenceSession.create('/models/mobilefacenet-q8.onnx', {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    });
    return true;
  } catch (e) {
    console.warn('ArcFace model load failed:', (e as Error).message);
    return false;
  }
}

export function isArcFaceReady(): boolean {
  return arcfaceSession !== null;
}

export async function getArcFaceEmbedding(imageDataURL: string): Promise<number[]> {
  if (!arcfaceSession) throw new Error('ArcFace model not loaded');

  const preprocessed = await preprocessArcFace(imageDataURL);
  const inputName = arcfaceSession.inputNames[0]!;
  const tensor = new ort.Tensor('float32', preprocessed, [1, 3, ARCFACE_SIZE, ARCFACE_SIZE]);
  const results = await arcfaceSession.run({ [inputName]: tensor });
  const outputName = arcfaceSession.outputNames[0]!;
  const raw = results[outputName]!.data as Float32Array;

  // L2 normalize
  let norm = 0;
  for (let i = 0; i < raw.length; i++) norm += raw[i]! * raw[i]!;
  norm = Math.sqrt(norm);

  const embedding: number[] = new Array(raw.length);
  for (let i = 0; i < raw.length; i++) embedding[i] = raw[i]! / norm;
  return embedding;
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

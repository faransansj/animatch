import * as ort from 'onnxruntime-web';
import { PREPROCESS, MODEL_PATHS } from './types';
import { preprocessImage } from './preprocessing';

let modelSession: ort.InferenceSession | null = null;

export async function initClipEngine(
  onProgress?: (progress: number) => void,
): Promise<boolean> {
  for (const modelPath of MODEL_PATHS) {
    try {
      onProgress?.(10);
      modelSession = await ort.InferenceSession.create(modelPath, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      });
      onProgress?.(100);
      return true;
    } catch (e) {
      console.warn(`Failed to load ${modelPath}:`, (e as Error).message);
    }
  }
  return false;
}

export function isClipReady(): boolean {
  return modelSession !== null;
}

export async function getImageEmbedding(imageDataURL: string): Promise<number[]> {
  if (!modelSession) throw new Error('CLIP model not loaded');

  const preprocessed = await preprocessImage(imageDataURL);
  const tensor = new ort.Tensor('float32', preprocessed, [1, 3, PREPROCESS.size, PREPROCESS.size]);
  const results = await modelSession.run({ image: tensor });
  const raw = results['embedding']!.data as Float32Array;

  // L2 normalize
  let norm = 0;
  for (let i = 0; i < raw.length; i++) norm += raw[i]! * raw[i]!;
  norm = Math.sqrt(norm);

  const embedding: number[] = new Array(raw.length);
  for (let i = 0; i < raw.length; i++) embedding[i] = raw[i]! / norm;
  return embedding;
}

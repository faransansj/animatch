import { PREPROCESS, getModelPath } from './types';
import { preprocessImage } from './preprocessing';
import { sendWorkerRequest } from './workerClient';

let clipReady = false;

export async function initClipEngine(
  onProgress?: (progress: number) => void,
  maxRetries: number = 3,
): Promise<boolean> {
  if (clipReady) {
    onProgress?.(100);
    return true;
  }

  const modelPath = getModelPath();
  console.log(`[CLIP] Loading model: ${modelPath}`);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      onProgress?.(10 + (attempt * 10));
      console.log(`[CLIP] Attempt ${attempt}/${maxRetries} to load model`);

      await sendWorkerRequest('INIT_CLIP', modelPath);
      clipReady = true;
      onProgress?.(100);
      console.log(`[CLIP] Model loaded successfully on attempt ${attempt}`);
      return true;
    } catch (e) {
      console.warn(`[CLIP] Attempt ${attempt}/${maxRetries} failed:`, (e as Error).message);

      if (attempt === maxRetries) {
        console.error(`[CLIP] Failed to load model after ${maxRetries} attempts`);
        return false;
      }

      // Exponential backoff with jitter
      const delay = Math.min(1000 * Math.pow(2, attempt - 1) + Math.random() * 1000, 5000);
      console.log(`[CLIP] Retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return false;
}

export async function releaseClipEngine(): Promise<void> {
  if (clipReady) {
    clipReady = false;
    try { await sendWorkerRequest('RELEASE'); } catch { /* worker may already be terminated */ }
  }
}

export function isClipReady(): boolean {
  return clipReady;
}

export async function getImageEmbedding(imageDataURL: string): Promise<number[]> {
  if (!clipReady) throw new Error('CLIP model not loaded');

  const preprocessed = await preprocessImage(imageDataURL);

  // Send the Float32Array directly through the worker message
  const embedding = await sendWorkerRequest<Float32Array>(
    'RUN_CLIP',
    preprocessed,
    [preprocessed.buffer]
  );

  return Array.from(embedding);
}

import { PREPROCESS, getModelPath } from './types';
import { preprocessImage } from './preprocessing';
import { sendWorkerRequest } from './workerClient';

let clipReady = false;

export async function initClipEngine(
  onProgress?: (progress: number) => void,
): Promise<boolean> {
  if (clipReady) {
    onProgress?.(100);
    return true;
  }
  try {
    onProgress?.(10);
    const modelPath = getModelPath();
    console.log(`[CLIP] Loading model: ${modelPath}`);
    await sendWorkerRequest('INIT_CLIP', modelPath);
    clipReady = true;
    onProgress?.(100);
    return true;
  } catch (e) {
    console.warn('Failed to load CLIP model in worker:', (e as Error).message);
    return false;
  }
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

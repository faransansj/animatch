export const PREPROCESS = {
  size: 224,
  mean: [0.48145466, 0.4578275, 0.40821073] as const,
  std: [0.26862954, 0.26130258, 0.27577711] as const,
};

export const MODEL_PATH = '/models/clip-image-encoder-q8.onnx';
export const MODEL_PATH_LITE = '/models/clip-image-encoder-q4.onnx';

/**
 * Detects whether the current device is a mobile/tablet or on cellular connection.
 * Used to select the lighter Q4 model to save data and prevent memory crashes.
 */
export function shouldUseLiteModel(): boolean {
  if (typeof navigator === 'undefined') return false;

  // Check for cellular connection (Network Information API)
  const conn = (navigator as any).connection;
  if (conn) {
    const type = conn.type || conn.effectiveType;
    if (type === 'cellular' || type === '2g' || type === '3g') return true;
    // Save-Data header preference
    if (conn.saveData) return true;
  }

  // Check device memory (< 4GB → use lite)
  const deviceMemory = (navigator as any).deviceMemory;
  if (deviceMemory && deviceMemory < 4) return true;

  // Check user agent for mobile
  const ua = navigator.userAgent;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  return isMobile;
}

/**
 * Returns the appropriate CLIP model path based on device capabilities.
 */
export function getModelPath(): string {
  return shouldUseLiteModel() ? MODEL_PATH_LITE : MODEL_PATH;
}

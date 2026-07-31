import { describe, expect, it } from 'vitest';
import { getModelPath } from '@/ml/types';

describe('CLIP model selection', () => {
  it('uses the Q4 model on every device', () => {
    expect(getModelPath()).toBe('/assets/models/clip-image-encoder-q4.onnx');
  });
});

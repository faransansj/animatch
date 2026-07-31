import { beforeEach, describe, expect, it } from 'vitest';
import { createMockCharacter } from '@/ml/__tests__/fixtures';
import { useResultStore } from '@/stores/resultStore';
import { useUploadStore } from '@/stores/uploadStore';

beforeEach(() => {
  useResultStore.getState().reset();
  useUploadStore.getState().reset();
});

describe('resultStore', () => {
  it('updates and resets result state', () => {
    const store = useResultStore.getState();
    const character = createMockCharacter({ embedding: [1, 0] });
    const result = {
      character,
      score: 0.9,
      percent: 90,
      confidence: 'high' as const,
      topN: [{ character, similarity: 0.9, percent: 90 }],
    };

    store.setMatchResult(result);
    store.setGachaStep('analyzing');
    store.setGachaProgress(50);
    store.setGachaRevealed(true);
    store.setQuoteText('Loading');

    expect(useResultStore.getState()).toMatchObject({
      matchResult: result,
      gachaStep: 'analyzing',
      gachaProgress: 50,
      gachaRevealed: true,
      quoteText: 'Loading',
    });

    useResultStore.getState().reset();
    expect(useResultStore.getState()).toMatchObject({
      matchResult: null,
      gachaStep: 'idle',
      gachaProgress: 0,
      gachaRevealed: false,
      quoteText: '',
    });
  });
});

describe('uploadStore', () => {
  it('updates and resets upload state', () => {
    const store = useUploadStore.getState();
    const faces = [{ x: 1, y: 2, width: 3, height: 4, confidence: 0.9 }];
    const feedback = [{ pass: true, passText: 'ok', failText: 'bad' }];

    store.setRawImageData('raw');
    store.setProcessedImageData('processed');
    store.setFeedbackItems(feedback);
    store.setCropModalOpen(true);
    store.setDetectedFaces(faces);
    store.setError('failed');

    expect(useUploadStore.getState()).toMatchObject({
      rawImageData: 'raw',
      processedImageData: 'processed',
      feedbackItems: feedback,
      cropModalOpen: true,
      detectedFaces: faces,
      error: 'failed',
    });

    store.clearError();
    expect(useUploadStore.getState().error).toBeNull();

    useUploadStore.getState().reset();
    expect(useUploadStore.getState()).toMatchObject({
      rawImageData: null,
      processedImageData: null,
      feedbackItems: [],
      cropModalOpen: false,
      detectedFaces: [],
      error: null,
    });
  });
});

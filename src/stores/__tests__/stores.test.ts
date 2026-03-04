import { describe, it, expect, beforeEach } from 'vitest';
import { useResultStore } from '@/stores/resultStore';
import { useUploadStore } from '@/stores/uploadStore';

// ── resultStore ───────────────────────────────────────────────────────────────

describe('resultStore', () => {
    beforeEach(() => {
        useResultStore.getState().reset();
    });

    it('has correct initial state', () => {
        const state = useResultStore.getState();
        expect(state.matchResult).toBeNull();
        expect(state.gachaStep).toBe('idle');
        expect(state.gachaProgress).toBe(0);
        expect(state.gachaRevealed).toBe(false);
        expect(state.quoteText).toBe('');
    });

    it('setters update correct fields', () => {
        const { setGachaStep, setGachaProgress, setGachaRevealed, setQuoteText } =
            useResultStore.getState();

        setGachaStep('analyzing');
        expect(useResultStore.getState().gachaStep).toBe('analyzing');

        setGachaProgress(75);
        expect(useResultStore.getState().gachaProgress).toBe(75);

        setGachaRevealed(true);
        expect(useResultStore.getState().gachaRevealed).toBe(true);

        setQuoteText('I love you');
        expect(useResultStore.getState().quoteText).toBe('I love you');
    });

    it('reset() restores all fields to initial values', () => {
        const store = useResultStore.getState();

        // Mutate everything
        store.setGachaStep('done');
        store.setGachaProgress(100);
        store.setGachaRevealed(true);
        store.setQuoteText('some quote');
        store.setMatchResult({
            character: {} as any,
            score: 0.95,
            percent: 90,
            confidence: 'high',
            topN: [],
        });

        // Reset
        useResultStore.getState().reset();

        const after = useResultStore.getState();
        expect(after.matchResult).toBeNull();
        expect(after.gachaStep).toBe('idle');
        expect(after.gachaProgress).toBe(0);
        expect(after.gachaRevealed).toBe(false);
        expect(after.quoteText).toBe('');
    });
});

// ── uploadStore ───────────────────────────────────────────────────────────────

describe('uploadStore', () => {
    beforeEach(() => {
        useUploadStore.getState().reset();
    });

    it('has correct initial state', () => {
        const state = useUploadStore.getState();
        expect(state.rawImageData).toBeNull();
        expect(state.processedImageData).toBeNull();
        expect(state.feedbackItems).toEqual([]);
        expect(state.cropModalOpen).toBe(false);
        expect(state.detectedFaces).toEqual([]);
    });

    it('setters update correct fields', () => {
        const { setRawImageData, setProcessedImageData, setCropModalOpen, setDetectedFaces } =
            useUploadStore.getState();

        setRawImageData('data:image/png;base64,abc');
        expect(useUploadStore.getState().rawImageData).toBe('data:image/png;base64,abc');

        setProcessedImageData('data:image/png;base64,def');
        expect(useUploadStore.getState().processedImageData).toBe('data:image/png;base64,def');

        setCropModalOpen(true);
        expect(useUploadStore.getState().cropModalOpen).toBe(true);

        const faces = [{ x: 10, y: 20, width: 100, height: 100, confidence: 0.95 }];
        setDetectedFaces(faces);
        expect(useUploadStore.getState().detectedFaces).toEqual(faces);
    });

    it('reset() clears all fields to initial values', () => {
        const store = useUploadStore.getState();

        // Mutate everything
        store.setRawImageData('raw-data');
        store.setProcessedImageData('processed-data');
        store.setFeedbackItems([{ pass: true, passText: 'ok', failText: 'fail' }]);
        store.setCropModalOpen(true);
        store.setDetectedFaces([{ x: 0, y: 0, width: 50, height: 50, confidence: 0.9 }]);

        // Reset
        useUploadStore.getState().reset();

        const after = useUploadStore.getState();
        expect(after.rawImageData).toBeNull();
        expect(after.processedImageData).toBeNull();
        expect(after.feedbackItems).toEqual([]);
        expect(after.cropModalOpen).toBe(false);
        expect(after.detectedFaces).toEqual([]);
    });
});

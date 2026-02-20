import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResultStore } from '@/stores/resultStore';
import { useMLStore } from '@/stores/mlStore';
import { useAppStore } from '@/stores/appStore';
import { useUploadStore } from '@/stores/uploadStore';
import { getImageEmbedding, isClipReady, initClipEngine, releaseClipEngine } from '@/ml/clipEngine';
import { getArcFaceEmbedding, isArcFaceReady, initArcFace, releaseArcFace } from '@/ml/arcFaceEngine';
import { findBestMatch, getRandomMatch } from '@/ml/matching';
import { findBestMatchDual } from '@/ml/dualEmbedding';
import { getActiveExperimentId, getVariantConfig, getActiveVariantLabel } from '@/ml/abTest';
import { sleep } from '@/utils/image';
import { logMatchResult } from '@/utils/analytics';
import type { MatchResult } from '@/types/match';

export function useGachaAnimation() {
  const navigate = useNavigate();
  const { orientation, language, showToast } = useAppStore();
  const { embeddingsData } = useMLStore();
  const { processedImageData, detectedFaces, setRawImageData, setProcessedImageData } = useUploadStore();
  const {
    setGachaStep, setGachaProgress, setMatchResult,
    setGachaRevealed, setQuoteText,
  } = useResultStore();

  const animateProgress = useCallback(async (from: number, to: number, duration: number) => {
    const startTime = performance.now();
    return new Promise<void>((resolve) => {
      function tick(now: number) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = from + (to - from) * eased;
        setGachaProgress(value);
        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          resolve();
        }
      }
      requestAnimationFrame(tick);
    });
  }, [setGachaProgress]);

  const typeQuote = useCallback(async (text: string, speed = 60) => {
    for (let i = 0; i <= text.length; i++) {
      setQuoteText(text.slice(0, i));
      await sleep(speed);
    }
  }, [setQuoteText]);

  const runMLSequence = useCallback(async (): Promise<MatchResult | null> => {
    if (!processedImageData || !embeddingsData) return null;

    // Phase 1: CLIP + ArcFace inference in parallel
    setGachaStep('analyzing');
    await animateProgress(50, 60, 400);

    let clipEmbedding: number[];
    let arcfaceEmbedding: number[] | null = null;

    try {
      // Run inference sequentially to keep memory usage low on mobile
      clipEmbedding = await getImageEmbedding(processedImageData);

      // Only run ArcFace if ready
      if (isArcFaceReady()) {
        try {
          arcfaceEmbedding = await getArcFaceEmbedding(processedImageData);
        } catch (e) {
          import('@sentry/react').then(Sentry => Sentry.captureException(e, { tags: { context: 'ArcFace_Inference' } }));
          console.warn('ArcFace inference failed:', e);
        }
      }
    } catch (err) {
      import('@sentry/react').then(Sentry => Sentry.captureException(err, { tags: { context: 'CLIP_Inference' } }));
      console.error('Inference failed:', err);
      return null;
    }

    await animateProgress(60, 75, 600);

    // Phase 2: Dual matching (falls back to CLIP-only if no ArcFace)
    setGachaStep('matching');
    const hasFace = detectedFaces.length > 0;
    const experimentId = getActiveExperimentId();
    const abConfig = experimentId ? getVariantConfig(experimentId) : undefined;
    const matchResult = arcfaceEmbedding
      ? findBestMatchDual(clipEmbedding, arcfaceEmbedding, orientation, embeddingsData, hasFace, abConfig)
      : findBestMatch(clipEmbedding, orientation, embeddingsData, hasFace, abConfig);
    await animateProgress(75, 85, 800);

    // Phase 3: Reveal
    setGachaStep('revealing');
    const quote = matchResult.character.heroine_quote || '...';
    await typeQuote(quote);
    await animateProgress(85, 95, 600);

    await sleep(400);
    setGachaRevealed(true);
    setGachaStep('done');
    await animateProgress(95, 100, 400);

    await sleep(600);
    return matchResult;
  }, [processedImageData, embeddingsData, orientation, detectedFaces, setGachaStep, animateProgress, typeQuote, setGachaRevealed]);

  const runFallbackSequence = useCallback(async (): Promise<MatchResult | null> => {
    if (!embeddingsData) {
      showToast('loading.noData');
      return null;
    }

    const matchResult = getRandomMatch(orientation, embeddingsData);

    setGachaStep('analyzing');
    await animateProgress(50, 65, 1200);

    setGachaStep('matching');
    await animateProgress(65, 80, 1200);

    setGachaStep('revealing');
    const quote = matchResult.character.heroine_quote || '...';
    await typeQuote(quote);
    await animateProgress(80, 95, 800);

    await sleep(500);
    setGachaRevealed(true);
    setGachaStep('done');
    await animateProgress(95, 100, 500);

    await sleep(800);
    return matchResult;
  }, [embeddingsData, orientation, showToast, setGachaStep, animateProgress, typeQuote, setGachaRevealed]);

  const waitForModel = useCallback((timeoutMs: number): Promise<boolean> => {
    return new Promise((resolve) => {
      if (isClipReady()) {
        resolve(true);
        return;
      }

      const timer = setTimeout(() => {
        unsub();
        resolve(false);
      }, timeoutMs);

      const unsub = useMLStore.subscribe((state) => {
        // Mirror clipProgress (0-100) into gachaProgress during preparing phase (scaled to 50%)
        setGachaProgress(state.clipProgress * 0.5);

        if (state.clipReady) {
          clearTimeout(timer);
          unsub();
          resolve(true);
        }
      });
    });
  }, [setGachaProgress]);

  const start = useCallback(async () => {
    // Reset
    setGachaProgress(0);
    setGachaRevealed(false);
    setQuoteText('');
    setGachaStep('idle');

    let clipReady = isClipReady();

    // Wait for model if not ready yet
    if (!clipReady) {
      setGachaStep('preparing');
      // Initialize CLIP; skip ArcFace on mobile to save memory
      try {
        await initClipEngine((p) => setGachaProgress(p * 0.4));
        // Only load ArcFace on desktop — mobile devices crash from memory pressure
        const { shouldUseLiteModel } = await import('@/ml/types');
        if (!shouldUseLiteModel()) {
          await initArcFace();
        } else {
          console.log('[ML] Skipping ArcFace on mobile to save memory');
        }
      } catch (err) {
        import('@sentry/react').then(Sentry => Sentry.captureException(err, { tags: { context: 'ML_Initialization' } }));
        console.error('ML Init failed', err);
      }
      clipReady = isClipReady();
    }

    let result: MatchResult | null = null;
    const usedDualMatching = clipReady && isArcFaceReady();

    if (clipReady) {
      setGachaProgress(50);
      result = await runMLSequence();
      if (!result) {
        result = await runFallbackSequence();
      }
    } else {
      setGachaProgress(50);
      result = await runFallbackSequence();
    }

    if (result) {
      // Proactively release memory before transitioning to Result page
      await releaseClipEngine();
      await releaseArcFace();

      setMatchResult(result);
      logMatchResult(result, orientation, language, usedDualMatching, getActiveVariantLabel());
      navigate('/result');
    }
  }, [navigate, orientation, language, setGachaProgress, setGachaRevealed, setQuoteText, setGachaStep, setMatchResult, runMLSequence, runFallbackSequence, waitForModel]);

  return { start };
}

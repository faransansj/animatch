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
import { getLocalizedChar } from '@/utils/localize';
import type { MatchResult } from '@/types/match';

/**
 * Polaroid-themed animation hook.
 * Same ML pipeline as useGachaAnimation but with polaroid-style step naming.
 * Steps: shaking → developing → forming → revealing → done
 */
export function usePolaroidAnimation() {
  const navigate = useNavigate();
  const { orientation, language, showToast } = useAppStore();
  const { embeddingsData } = useMLStore();
  const { processedImageData, detectedFaces } = useUploadStore();
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

  const typeQuote = useCallback(async (text: string, speed = 55) => {
    for (let i = 0; i <= text.length; i++) {
      setQuoteText(text.slice(0, i));
      await sleep(speed);
    }
  }, [setQuoteText]);

  const runMLSequence = useCallback(async (): Promise<MatchResult | null> => {
    if (!processedImageData || !embeddingsData) return null;

    // Phase 1: Analyzing — "shake the polaroid"
    setGachaStep('analyzing');
    await animateProgress(50, 60, 600);

    let clipEmbedding: number[];
    let arcfaceEmbedding: number[] | null = null;

    try {
      clipEmbedding = await getImageEmbedding(processedImageData);

      if (isArcFaceReady()) {
        try {
          arcfaceEmbedding = await getArcFaceEmbedding(processedImageData);
        } catch (e) {
          import('@sentry/react').then(Sentry => Sentry.captureException(e, { tags: { context: 'ArcFace_Polaroid' } }));
          console.warn('ArcFace inference failed:', e);
        }
      }
    } catch (err) {
      import('@sentry/react').then(Sentry => Sentry.captureException(err, { tags: { context: 'CLIP_Polaroid' } }));
      console.error('Inference failed:', err);
      return null;
    }

    await animateProgress(60, 75, 800);

    // Phase 2: Matching — "developing"
    setGachaStep('matching');
    const hasFace = detectedFaces.length > 0;
    const experimentId = getActiveExperimentId();
    const abConfig = experimentId ? getVariantConfig(experimentId) : undefined;
    const matchResult = arcfaceEmbedding
      ? findBestMatchDual(clipEmbedding, arcfaceEmbedding, orientation, embeddingsData, hasFace, abConfig)
      : findBestMatch(clipEmbedding, orientation, embeddingsData, hasFace, abConfig);
    await animateProgress(75, 88, 1000);

    // Phase 3: Revealing — "photo forming"
    setGachaStep('revealing');
    const quote = getLocalizedChar(matchResult.character, language).quote || '...';
    await typeQuote(quote);
    await animateProgress(88, 96, 600);

    await sleep(500);
    setGachaRevealed(true);
    setGachaStep('done');
    await animateProgress(96, 100, 400);

    await sleep(800);
    return matchResult;
  }, [processedImageData, embeddingsData, orientation, detectedFaces, language, setGachaStep, animateProgress, typeQuote, setGachaRevealed]);

  const runFallbackSequence = useCallback(async (): Promise<MatchResult | null> => {
    if (!embeddingsData) {
      showToast('loading.noData');
      return null;
    }

    const matchResult = getRandomMatch(orientation, embeddingsData);

    setGachaStep('analyzing');
    await animateProgress(50, 65, 1500);

    setGachaStep('matching');
    await animateProgress(65, 82, 1500);

    setGachaStep('revealing');
    const quote = getLocalizedChar(matchResult.character, language).quote || '...';
    await typeQuote(quote);
    await animateProgress(82, 96, 800);

    await sleep(600);
    setGachaRevealed(true);
    setGachaStep('done');
    await animateProgress(96, 100, 500);

    await sleep(800);
    return matchResult;
  }, [embeddingsData, orientation, language, showToast, setGachaStep, animateProgress, typeQuote, setGachaRevealed]);

  const start = useCallback(async () => {
    setGachaProgress(0);
    setGachaRevealed(false);
    setQuoteText('');
    setGachaStep('idle');

    let clipReady = isClipReady();

    if (!clipReady) {
      setGachaStep('preparing');
      try {
        await initClipEngine((p) => setGachaProgress(p * 0.4));
        const { shouldUseLiteModel } = await import('@/ml/types');
        if (!shouldUseLiteModel()) {
          await initArcFace();
        }
      } catch (err) {
        import('@sentry/react').then(Sentry => Sentry.captureException(err, { tags: { context: 'ML_Init_Polaroid' } }));
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
      await releaseClipEngine();
      await releaseArcFace();

      setMatchResult(result);
      logMatchResult(result, orientation, language, usedDualMatching, getActiveVariantLabel());
      navigate('/polaroid/result');
    }
  }, [navigate, orientation, language, setGachaProgress, setGachaRevealed, setQuoteText, setGachaStep, setMatchResult, runMLSequence, runFallbackSequence]);

  return { start };
}

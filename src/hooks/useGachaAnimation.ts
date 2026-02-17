import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResultStore } from '@/stores/resultStore';
import { useMLStore } from '@/stores/mlStore';
import { useAppStore } from '@/stores/appStore';
import { useUploadStore } from '@/stores/uploadStore';
import { getImageEmbedding, isClipReady } from '@/ml/clipEngine';
import { getArcFaceEmbedding, isArcFaceReady } from '@/ml/arcFaceEngine';
import { findBestMatch, getRandomMatch } from '@/ml/matching';
import { findBestMatchDual } from '@/ml/dualEmbedding';
import { sleep } from '@/utils/image';
import type { MatchResult } from '@/types/match';

export function useGachaAnimation() {
  const navigate = useNavigate();
  const { orientation, showToast } = useAppStore();
  const { embeddingsData } = useMLStore();
  const { processedImageData } = useUploadStore();
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
    await animateProgress(0, 15, 400);

    let clipEmbedding: number[];
    let arcfaceEmbedding: number[] | null = null;

    try {
      // Run CLIP and ArcFace in parallel for latency hiding
      const promises: [Promise<number[]>, Promise<number[] | null>] = [
        getImageEmbedding(processedImageData),
        isArcFaceReady()
          ? getArcFaceEmbedding(processedImageData).catch(() => null)
          : Promise.resolve(null),
      ];
      const [clip, arcface] = await Promise.all(promises);
      clipEmbedding = clip;
      arcfaceEmbedding = arcface;
    } catch (err) {
      console.error('Inference failed:', err);
      return null;
    }

    await animateProgress(15, 40, 600);

    // Phase 2: Dual matching (falls back to CLIP-only if no ArcFace)
    setGachaStep('matching');
    const matchResult = arcfaceEmbedding
      ? findBestMatchDual(clipEmbedding, arcfaceEmbedding, orientation, embeddingsData)
      : findBestMatch(clipEmbedding, orientation, embeddingsData);
    await animateProgress(40, 70, 800);

    // Phase 3: Reveal
    setGachaStep('revealing');
    const quote = matchResult.character.heroine_quote || '...';
    await typeQuote(quote);
    await animateProgress(70, 90, 600);

    await sleep(400);
    setGachaRevealed(true);
    setGachaStep('done');
    await animateProgress(90, 100, 400);

    await sleep(600);
    return matchResult;
  }, [processedImageData, embeddingsData, orientation, setGachaStep, animateProgress, typeQuote, setGachaRevealed]);

  const runFallbackSequence = useCallback(async (): Promise<MatchResult | null> => {
    if (!embeddingsData) {
      showToast('loading.noData');
      return null;
    }

    const matchResult = getRandomMatch(orientation, embeddingsData);

    setGachaStep('analyzing');
    await animateProgress(0, 35, 1200);

    setGachaStep('matching');
    await animateProgress(35, 70, 1200);

    setGachaStep('revealing');
    const quote = matchResult.character.heroine_quote || '...';
    await typeQuote(quote);
    await animateProgress(70, 90, 800);

    await sleep(500);
    setGachaRevealed(true);
    setGachaStep('done');
    await animateProgress(90, 100, 500);

    await sleep(800);
    return matchResult;
  }, [embeddingsData, orientation, showToast, setGachaStep, animateProgress, typeQuote, setGachaRevealed]);

  const start = useCallback(async () => {
    // Reset
    setGachaProgress(0);
    setGachaRevealed(false);
    setQuoteText('');
    setGachaStep('idle');

    let result: MatchResult | null = null;

    if (isClipReady()) {
      result = await runMLSequence();
      if (!result) {
        // Fallback on ML failure
        result = await runFallbackSequence();
      }
    } else {
      result = await runFallbackSequence();
    }

    if (result) {
      setMatchResult(result);
      navigate('/result');
    }
  }, [navigate, setGachaProgress, setGachaRevealed, setQuoteText, setGachaStep, setMatchResult, runMLSequence, runFallbackSequence]);

  return { start };
}

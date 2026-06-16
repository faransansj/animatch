import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useResultStore } from '@/stores/resultStore';
import { useUploadStore } from '@/stores/uploadStore';
import { useMLStore } from '@/stores/mlStore';
import { useAppStore } from '@/stores/appStore';
import RetroCameraViewfinder from '@/components/polaroid/RetroCameraViewfinder';
import DevelopingPhoto from '@/components/polaroid/DevelopingPhoto';
import PolaroidFrame from '@/components/polaroid/PolaroidFrame';
import { isClipReady, initClipEngine, getImageEmbedding, releaseClipEngine } from '@/ml/clipEngine';
import { isArcFaceReady, initArcFace, getArcFaceEmbedding, releaseArcFace } from '@/ml/arcFaceEngine';
import { shouldUseLiteModel } from '@/ml/types';
import { findBestMatch, getRandomMatch } from '@/ml/matching';
import { findBestMatchDual } from '@/ml/dualEmbedding';
import { getActiveExperimentId, getVariantConfig, getActiveVariantLabel } from '@/ml/abTest';
import { logMatchResult } from '@/utils/analytics';
import { getLocalizedChar } from '@/utils/localize';
import { sleep } from '@/utils/image';
import type { MatchResult } from '@/types/match';
import styles from './PolaroidDevelopScreen.module.css';

export default function PolaroidDevelopScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { processedImageData, detectedFaces } = useUploadStore();
  const { orientation, language } = useAppStore();
  const { embeddingsData } = useMLStore();
  
  const {
    matchResult, setMatchResult,
    gachaProgress, setGachaProgress,
    gachaRevealed, setGachaRevealed,
    quoteText, setQuoteText,
  } = useResultStore();

  const [cameraStatus, setCameraStatus] = useState<'processing' | 'ready' | 'error'>('processing');
  const [resolvedMatch, setResolvedMatch] = useState<MatchResult | null>(null);
  const [hasSnapped, setHasSnapped] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [showEject, setShowEject] = useState(false);

  const quoteTypedRef = useRef(false);

  // Redirect if missing source photo
  useEffect(() => {
    if (!processedImageData && location.pathname === '/polaroid/developing') {
      console.warn('[Polaroid] Missing processedImageData, redirecting');
      navigate('/polaroid', { replace: true });
    }
  }, [processedImageData, navigate, location.pathname]);

  // Run ML matching in the background on mount
  useEffect(() => {
    let active = true;
    async function runMatching() {
      if (!processedImageData || !embeddingsData) return;

      try {
        // Ensure CLIP is initialized
        let clipReady = isClipReady();
        if (!clipReady) {
          await initClipEngine();
          const useLite = shouldUseLiteModel();
          if (!useLite) {
            await initArcFace();
          }
          clipReady = isClipReady();
        }

        if (!active) return;

        let result: MatchResult | null = null;
        const usedDualMatching = clipReady && isArcFaceReady();

        if (clipReady) {
          const clipEmbedding = await getImageEmbedding(processedImageData);
          let arcfaceEmbedding: number[] | null = null;
          
          if (isArcFaceReady()) {
            try {
              arcfaceEmbedding = await getArcFaceEmbedding(processedImageData);
            } catch (e) {
              console.warn('ArcFace inference failed:', e);
            }
          }

          if (!active) return;

          const hasFace = detectedFaces.length > 0;
          const experimentId = getActiveExperimentId();
          const abConfig = experimentId ? getVariantConfig(experimentId) : undefined;
          
          result = arcfaceEmbedding
            ? findBestMatchDual(clipEmbedding, arcfaceEmbedding, orientation, embeddingsData, hasFace, abConfig)
            : findBestMatch(clipEmbedding, orientation, embeddingsData, hasFace, abConfig);
        }

        if (!active) return;

        if (!result) {
          result = getRandomMatch(orientation, embeddingsData);
        }

        if (result && active) {
          setResolvedMatch(result);
          setMatchResult(result);
          setCameraStatus('ready');
          
          // Log analytics
          logMatchResult(result, orientation, language, usedDualMatching, getActiveVariantLabel());
        }
      } catch (err) {
        console.error('Inference error:', err);
        if (active) {
          setCameraStatus('error');
        }
      }
    }

    runMatching();

    return () => {
      active = false;
    };
  }, [processedImageData, embeddingsData, orientation, detectedFaces, language, setMatchResult]);

  // Auto-increment progress smoothly in the background (takes ~8 seconds if left untouched, but shaking accelerates it)
  useEffect(() => {
    if (!hasSnapped || gachaProgress >= 100) return;

    const interval = setInterval(() => {
      setGachaProgress(Math.min(100, gachaProgress + 1.25));
    }, 100);

    return () => clearInterval(interval);
  }, [hasSnapped, gachaProgress, setGachaProgress]);

  // Handle snapping of the destined character
  const handleShutter = () => {
    if (cameraStatus !== 'ready' || !resolvedMatch) return;

    setIsFlashing(true);
    setGachaProgress(0);
    setGachaRevealed(false);
    setQuoteText('');
    quoteTypedRef.current = false;

    // Snapping sequence
    setTimeout(() => {
      setIsFlashing(false);
      setHasSnapped(true);
      setShowEject(true);
    }, 400);
  };

  // Speed up progress when the user shakes the card
  const handleShake = (amount: number) => {
    if (gachaProgress >= 100) return;
    const newProgress = Math.min(100, gachaProgress + amount);
    setGachaProgress(newProgress);
  };

  // Type out the quote as the photo finishes developing
  const typeQuote = useCallback(async (text: string, speed = 40) => {
    if (quoteTypedRef.current) return;
    quoteTypedRef.current = true;
    for (let i = 0; i <= text.length; i++) {
      setQuoteText(text.slice(0, i));
      await sleep(speed);
    }
  }, [setQuoteText]);

  // Reveal image and text when progress gets high
  useEffect(() => {
    if (gachaProgress >= 70 && resolvedMatch && !quoteTypedRef.current) {
      const quote = getLocalizedChar(resolvedMatch.character, language).quote || '...';
      typeQuote(quote);
    }

    if (gachaProgress >= 100 && resolvedMatch && !gachaRevealed) {
      setGachaRevealed(true);
      // Clean up engine instances to free webgl context
      releaseClipEngine().catch(console.warn);
      releaseArcFace().catch(console.warn);
    }
  }, [gachaProgress, resolvedMatch, language, typeQuote, gachaRevealed, setGachaRevealed]);

  const handleProceed = () => {
    navigate('/polaroid/result');
  };



  const charName = resolvedMatch ? getLocalizedChar(resolvedMatch.character, language).name : 'Destiny';

  return (
    <motion.section
      className={styles.screen}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className={styles.bg}>
        <div className={styles.warmGlow} />
      </div>

      <main className={styles.content}>
        {/* Header */}
        <div className={styles.turnHeader}>
          <h2 className={styles.turnTitle}>{t('polaroid.myTurn')}</h2>
          <p className={styles.turnSubtitle}>
            {hasSnapped
              ? t('polaroid.developShake')
              : t('polaroid.myTurnSubtitle')}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!hasSnapped ? (
            <motion.div
              key="viewfinder"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.4 }}
              className={styles.cameraWrapper}
            >
              {/* Silhouette Viewfinder */}
              <RetroCameraViewfinder
                previewSrc={
                  resolvedMatch?.character.heroine_image
                    ? resolvedMatch.character.heroine_image
                    : undefined
                }
                flashing={isFlashing}
                onShutter={handleShutter}
                isReady={cameraStatus === 'ready'}
                videoElement={
                  // Custom styled silhouette div in viewfinder to show focusing outline
                  cameraStatus === 'ready' ? (
                    <div className={styles.focusingSilhouette}>
                      <span className={styles.glowTarget}>✨</span>
                      <span className={styles.focusLabel}>FOCUS LOCKED</span>
                    </div>
                  ) : (
                    <div className={styles.loadingSilhouette}>
                      <span className={styles.loaderIcon}>⏳</span>
                      <span className={styles.focusLabel}>MATCHING DESTINY...</span>
                    </div>
                  )
                }
              />
            </motion.div>
          ) : (
            <motion.div
              key="developing"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 80, damping: 12 }}
              className={styles.developWrapper}
            >
              {/* Interactive developing card */}
              <DevelopingPhoto
                progress={gachaProgress}
                imageSrc={resolvedMatch?.character.heroine_image ?? ''}
                caption={charName}
                onShake={handleShake}
              />

              {/* Typed speech bubble */}
              {quoteText && (
                <div className={styles.quoteBubble}>
                  <p className={styles.quoteText}>
                    ❝ {quoteText}
                    {gachaProgress < 100 && <span className={styles.quoteCursor}>|</span>}
                  </p>
                </div>
              )}

              {/* Proceed Button */}
              {gachaProgress >= 100 && (
                <motion.button
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className={styles.proceedBtn}
                  onClick={handleProceed}
                >
                  <span>{t('result.viewResult') || '결과 카드 보기'}</span>
                  <span>✨</span>
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Snap flash overlay */}
      {isFlashing && <div className={styles.shutterFlash} />}
    </motion.section>
  );
}

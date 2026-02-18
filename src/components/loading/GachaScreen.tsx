import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useResultStore } from '@/stores/resultStore';
import { useUploadStore } from '@/stores/uploadStore';
import { useGachaAnimation } from '@/hooks/useGachaAnimation';
import styles from './GachaScreen.module.css';

function LoadingParticles() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < 20; i++) {
      const p = document.createElement('div');
      p.className = styles.particle ?? '';
      p.style.left = Math.random() * 100 + '%';
      p.style.animationDuration = (4 + Math.random() * 6) + 's';
      p.style.animationDelay = Math.random() * 5 + 's';
      p.style.width = (2 + Math.random() * 3) + 'px';
      p.style.height = p.style.width;
      container.appendChild(p);
    }
  }, []);
  return <div ref={ref} className={styles.particles} />;
}

export default function GachaScreen() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { processedImageData } = useUploadStore();
  const { gachaStep, gachaProgress, gachaRevealed, quoteText, matchResult } = useResultStore();
  const { start } = useGachaAnimation();
  const startedRef = useRef(false);

  useEffect(() => {
    if (!processedImageData) {
      navigate('/upload', { replace: true });
      return;
    }
    if (!startedRef.current) {
      startedRef.current = true;
      start();
    }
  }, [processedImageData, navigate, start]);

  const stepStatus = (step: 'analyzing' | 'matching' | 'revealing' | 'done', target: string) => {
    const steps = ['analyzing', 'matching', 'revealing', 'done'];
    const current = steps.indexOf(gachaStep);
    const targetIdx = steps.indexOf(target);
    if (current > targetIdx) return 'done';
    if (current === targetIdx) return 'active';
    return '';
  };

  const progressText = () => {
    switch (gachaStep) {
      case 'preparing': return t('loading.preparing');
      case 'analyzing': return t('loading.analyzing');
      case 'matching': return t('loading.matching');
      case 'revealing': return t('loading.found');
      case 'done': return t('loading.complete');
      default: return t('loading.fallbackAnalyzing');
    }
  };

  return (
    <motion.section
      className={styles.screen}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className={styles.bg}>
        <LoadingParticles />
        <div className={styles.glow} />
      </div>

      <main className={styles.content}>
        {/* Steps */}
        <div className={styles.steps}>
          {gachaStep === 'preparing' ? (
            <div className={`${styles.step ?? ''} active`}>
              <div className={styles.stepDot} />
              <span>{t('loading.preparing')}</span>
            </div>
          ) : (
            <>
              <div className={`${styles.step ?? ''} ${stepStatus('analyzing', 'analyzing')}`}>
                <div className={styles.stepDot} />
                <span>{t('loading.step1')}</span>
              </div>
              <div className={`${styles.stepLine ?? ''} ${stepStatus('matching', 'analyzing') === 'done' ? styles.filling ?? '' : ''}`} />
              <div className={`${styles.step ?? ''} ${stepStatus('matching', 'matching')}`}>
                <div className={styles.stepDot} />
                <span>{t('loading.step2')}</span>
              </div>
              <div className={`${styles.stepLine ?? ''} ${stepStatus('revealing', 'matching') === 'done' ? styles.filling ?? '' : ''}`} />
              <div className={`${styles.step ?? ''} ${stepStatus('revealing', 'revealing')}`}>
                <div className={styles.stepDot} />
                <span>{t('loading.step3')}</span>
              </div>
            </>
          )}
        </div>

        {/* Gacha Stage */}
        <div className={styles.gachaStage}>
          <div className={`${styles.silhouette} ${gachaRevealed ? styles.reveal : ''}`}>
            <div className={styles.silhouetteGlow} />
            <div className={styles.silhouetteShape}>
              {gachaRevealed ? (matchResult?.character.heroine_emoji || '💕') : '?'}
            </div>
          </div>

          <div className={styles.quoteContainer}>
            <div className={styles.quoteMark}>❝</div>
            <p className={styles.quoteText}>{quoteText}</p>
            {!gachaRevealed && <span className={styles.quoteCursor}>|</span>}
          </div>
        </div>

        {/* Progress */}
        <div className={styles.loadingProgress}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${gachaProgress}%` }} />
          </div>
          <p className={styles.progressText}>{progressText()}</p>
        </div>
      </main>
    </motion.section>
  );
}

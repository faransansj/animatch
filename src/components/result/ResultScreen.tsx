import { useCallback, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import Header from '@/components/shared/Header';
import { useResultStore } from '@/stores/resultStore';
import { useUploadStore } from '@/stores/uploadStore';
import { useAppStore } from '@/stores/appStore';
import { shareToX, shareToBluesky, copyLink } from '@/utils/share';
import { getTarotImageUrl } from '@/utils/tarot';
import { generateResultCard } from '@/utils/resultCard';
import type { MatchCandidate, MatchResult } from '@/types/match';
import type { CharacterEmbedding } from '@/types/character';
import AdBanner from '@/components/shared/AdBanner';
import styles from './ResultScreen.module.css';

function useLocalizedChar(char: CharacterEmbedding) {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  return {
    name: isEn ? char.heroine_name_en : char.heroine_name,
    anime: isEn ? char.anime_en : char.anime,
    tags: isEn ? char.heroine_tags_en : char.heroine_tags,
    personality: isEn ? char.heroine_personality_en : char.heroine_personality,
    charm: isEn ? char.heroine_charm_en : char.heroine_charm,
    genre: isEn ? char.genre_en : char.genre,
  };
}

function HeroImage({ char, children }: { char: CharacterEmbedding; children: React.ReactNode }) {
  const [imgError, setImgError] = useState(false);
  const tarotUrl = getTarotImageUrl(char.heroine_id);
  const fallbackBg = char.heroine_color || 'linear-gradient(135deg, #f093fb, #f5576c)';

  return (
    <div className={styles.heroImg} style={imgError ? { background: fallbackBg } : undefined}>
      {!imgError ? (
        <img
          className={styles.heroTarotImg}
          src={tarotUrl}
          alt={char.heroine_name}
          onError={() => setImgError(true)}
        />
      ) : (
        <span className={styles.emojiLg}>{char.heroine_emoji || '💖'}</span>
      )}
      {children}
    </div>
  );
}

function RunnerUpImage({ char }: { char: CharacterEmbedding }) {
  const [imgError, setImgError] = useState(false);
  const tarotUrl = getTarotImageUrl(char.heroine_id);
  const fallbackBg = char.heroine_color || 'linear-gradient(135deg, #667eea, #764ba2)';

  if (imgError) {
    return (
      <div className={styles.runnerUpEmoji} style={{ background: fallbackBg }}>
        <span>{char.heroine_emoji || '💕'}</span>
      </div>
    );
  }

  return (
    <div className={styles.runnerUpEmoji}>
      <img
        className={styles.runnerUpTarotImg}
        src={tarotUrl}
        alt={char.heroine_name}
        onError={() => setImgError(true)}
      />
    </div>
  );
}



export default function ResultScreen() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { matchResult, setMatchResult } = useResultStore();
  const uploadReset = useUploadStore(s => s.reset);
  const resultReset = useResultStore(s => s.reset);
  const showToast = useAppStore(s => s.showToast);

  const handleRetry = useCallback(() => {
    uploadReset();
    resultReset();
    navigate('/upload');
  }, [navigate, uploadReset, resultReset]);

  const handleHome = useCallback(() => {
    uploadReset();
    resultReset();
    navigate('/');
  }, [navigate, uploadReset, resultReset]);

  const handleDownload = useCallback(async () => {
    if (!matchResult) return;
    const c = matchResult.character;
    const isEn = i18n.language === 'en';
    try {
      const blob = await generateResultCard({
        characterName: isEn ? c.heroine_name_en : c.heroine_name,
        animeName: isEn ? c.anime_en : c.anime,
        percent: matchResult.percent,
        heroineId: c.heroine_id,
        heroineEmoji: c.heroine_emoji,
        heroineColor: c.heroine_color,
        lang: isEn ? 'en' : 'ko',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `animatch-${c.heroine_name_en.toLowerCase().replace(/\s+/g, '-')}.png`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(t('result.downloadComplete'));
    } catch {
      showToast(t('result.downloadError'));
    }
  }, [matchResult, i18n.language, showToast, t]);

  const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  useEffect(() => {
    if (!matchResult) {
      console.warn('[Integrity] No matchResult found on mount, redirecting to /upload');
      navigate('/upload', { replace: true });
    } else {
      console.log('[Integrity] ResultScreen mounted successfully. Cleaning data.');

      // Aggressive cleanup: Clear high-res images immediately to free memory for the GPU
      useUploadStore.getState().setRawImageData(null);
      useUploadStore.getState().setProcessedImageData(null);
    }
  }, [matchResult, navigate]);

  if (!matchResult) {
    return null;
  }

  // Limit topN to save rendering memory on mobile
  const topN = isMobile ? matchResult.topN.slice(0, 2) : matchResult.topN;

  const char = matchResult.character;
  const localized = useLocalizedChar(char);

  const confidenceLabels: Record<string, string> = {
    high: t('result.confidenceHigh'),
    medium: t('result.confidenceMedium'),
    low: t('result.confidenceLow'),
  };

  const swapToRunnerUp = (entry: MatchCandidate) => {
    const newTopN = [entry, ...topN.filter(t => t !== entry)];
    setMatchResult({
      ...matchResult,
      character: entry.character,
      percent: entry.percent,
      score: entry.similarity,
      topN: newTopN,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <motion.section
      className={styles.screen}
      initial={isMobile ? { opacity: 0 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: isMobile ? 0.3 : 0.5 }}
    >
      <div className={styles.bg} />

      <Header backTo="/" backLabel={t('common.backToHome')} />

      <main className={styles.content}>
        {/* Heroine Card */}
        <motion.div
          className={styles.heroineCard}
          initial={isMobile ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: isMobile ? 0.5 : 0.8, delay: isMobile ? 0.1 : 0.3 }}
        >
          <div className={styles.cardGlow} />

          <HeroImage char={char}>
            <div className={styles.compatBadge}>
              <svg className={styles.percentageRing} viewBox="0 0 36 36">
                <path className={styles.ringBg} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className={styles.ringFill} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" strokeDasharray={`${matchResult.percent}, 100`} />
              </svg>
              <span className={styles.percentageText}>{matchResult.percent}%</span>
              <span className={styles.compatLabel}>{t('result.matchLabel')}</span>
            </div>

            {matchResult.confidence && (
              <span className={`${styles.confidenceLabel} ${styles[`confidence_${matchResult.confidence}`]}`}>
                {confidenceLabels[matchResult.confidence]}
              </span>
            )}
          </HeroImage>

          <div className={styles.infoPanel}>
            <div className={styles.cardHeader}>
              <span className={styles.cardBadge}>{t('result.badge')}</span>
            </div>

            <div className={styles.nameArea}>
              <h2 className={styles.heroineName}>{localized.name}</h2>
              <p className={styles.heroineAnime}>{localized.anime}</p>
              <div className={styles.tags}>
                {localized.tags?.map((tag, i) => (
                  <span key={i} className={styles.tag}>{tag}</span>
                ))}
              </div>
            </div>

            <div className={styles.details}>
              <div className={styles.detailSection}>
                <h3 className={styles.detailTitle}>{t('result.personalityTitle')}</h3>
                <ul className={styles.personalityList}>
                  {localized.personality?.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>

              <div className={`${styles.detailSection} ${styles.charm}`}>
                <h3 className={styles.detailTitle}>{t('result.charmTitle')}</h3>
                <p className={styles.charmText}>{localized.charm}</p>
              </div>

              <div className={styles.detailSection}>
                <h3 className={styles.detailTitle}>{t('result.animeTitle')}</h3>
                <div className={styles.animeInfo}>
                  <span className={styles.animeTitleText}>{localized.anime}</span>
                  <span className={styles.animeGenre}>{localized.genre?.join(' · ')}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Runner-ups */}
        {topN.length > 1 && (
          <motion.div
            className={styles.runnerUpSection}
            initial={isMobile ? { opacity: 0 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: isMobile ? 0.2 : 0.5 }}
          >
            <h3 className={styles.runnerUpTitle}>{t('result.runnerUpTitle')}</h3>
            <div className={styles.runnerUpGrid}>
              {topN.slice(1).map((entry, idx) => {
                const rc = entry.character;
                const isEn = i18n.language === 'en';
                return (
                  <div
                    key={idx}
                    className={styles.runnerUpCard}
                    onClick={() => swapToRunnerUp(entry)}
                  >
                    <div className={styles.runnerUpRank}>{t('result.rank', { rank: idx + 2 })}</div>
                    <RunnerUpImage char={rc} />
                    <div className={styles.runnerUpInfo}>
                      <span className={styles.runnerUpName}>{isEn ? rc.heroine_name_en : rc.heroine_name}</span>
                      <span className={styles.runnerUpAnime}>{isEn ? rc.anime_en : rc.anime}</span>
                    </div>
                    <div className={styles.runnerUpPercent}>{entry.percent}%</div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}



        {/* Share */}
        <motion.div
          className={styles.shareSection}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <h3 className={styles.shareTitle}>{t('result.shareTitle')}</h3>
          <div className={styles.shareButtons}>
            <button className={`${styles.shareBtn} ${styles.twitter}`} onClick={() => shareToX(char, matchResult.percent, i18n.language)}>
              <span className={styles.shareIcon}>𝕏</span>
              <span>{t('result.shareX')}</span>
            </button>
            <button className={`${styles.shareBtn} ${styles.bluesky}`} onClick={() => shareToBluesky(char, matchResult.percent, i18n.language)}>
              <span className={styles.shareIcon}>🦋</span>
              <span>{t('result.shareBluesky')}</span>
            </button>
            <button className={`${styles.shareBtn} ${styles.copy}`} onClick={() => copyLink(char.heroine_id, () => showToast(t('result.linkCopied')))}>
              <span className={styles.shareIcon}>🔗</span>
              <span>{t('result.shareCopy')}</span>
            </button>
            <button className={`${styles.shareBtn} ${styles.download}`} onClick={handleDownload}>
              <span className={styles.shareIcon}>⬇</span>
              <span>{t('result.shareDownload')}</span>
            </button>
          </div>
        </motion.div>

        <div className={styles.actionButtons}>
          <Link
            to="/"
            className={styles.homeBtn}
            onClick={() => {
              uploadReset();
              resultReset();
            }}
          >
            {t('common.backToHome')}
          </Link>
          <button className={styles.retryBtn} onClick={handleRetry}>
            {t('common.retry')}
          </button>
        </div>

        <AdBanner />
      </main>
    </motion.section>
  );
}

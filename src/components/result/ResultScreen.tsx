import { useCallback, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import SEO from '@/components/shared/SEO';
import Header from '@/components/shared/Header';
import { useResultStore } from '@/stores/resultStore';
import { useUploadStore } from '@/stores/uploadStore';
import { useAppStore } from '@/stores/appStore';
import { shareToX, shareToBluesky, copyLink } from '@/utils/share';
import { generateResultCard, generateStoryCard } from '@/utils/resultCard';
import { useLocalizedChar } from '@/hooks/useLocalizedChar';
import type { MatchCandidate, MatchResult } from '@/types/match';
import type { CharacterEmbedding } from '@/types/character';
import AdBanner from '@/components/shared/AdBanner';
import styles from './ResultScreen.module.css';

function HeroImage({ char, children }: { char: CharacterEmbedding; children: React.ReactNode }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [imgState, setImgState] = useState<'official' | 'emoji'>('official'); // Default to official illustration
  const fallbackBg = char.heroine_color || 'linear-gradient(135deg, #f093fb, #f5576c)';

  useEffect(() => {
    setIsFlipped(false);
    setImgState('official');
  }, [char.heroine_id]);

  return (
    <div
      className={`${styles.heroImg} ${isFlipped ? styles.isFlipped : ''}`}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div className={styles.flipInner}>
        {/* Front: Emoji Fallback (Shown first before flip) */}
        <div className={styles.flipFront} style={{ background: fallbackBg }}>
          <span className={styles.emojiLg}>{char.heroine_emoji || '💖'}</span>
        </div>
        {/* Back: Official Character Image */}
        <div className={styles.flipBack} style={{ background: fallbackBg }}>
          {imgState === 'official' && char.heroine_image && (
            <img
              className={styles.heroTarotImg}
              src={char.heroine_image}
              alt={'AniMatch character result: ' + char.heroine_name}
              style={{ objectFit: 'cover' }}
              referrerPolicy="no-referrer"
              onError={() => setImgState('emoji')}
            />
          )}
          {imgState === 'emoji' && (
            <span className={styles.emojiLg}>{char.heroine_emoji || '💖'}</span>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

function RunnerUpImage({ char }: { char: CharacterEmbedding }) {
  const [imgState, setImgState] = useState<'official' | 'emoji'>('official');
  const fallbackBg = char.heroine_color || 'linear-gradient(135deg, #667eea, #764ba2)';

  if (imgState === 'emoji' || !char.heroine_image) {
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
        src={char.heroine_image}
        alt={'AniMatch character runner-up: ' + char.heroine_name}
        style={{ objectFit: 'cover' }}
        referrerPolicy="no-referrer"
        onError={() => setImgState('emoji')}
      />
    </div>
  );
}



export default function ResultScreen() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { matchResult, setMatchResult } = useResultStore();
  const showToast = useAppStore(s => s.showToast);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleRetry = useCallback(() => {
    import('@/utils/telemetry').then(({ trackFunnelEvent }) => {
      trackFunnelEvent('Result Screen Retry Clicked');
    });
    navigate('/upload');
  }, [navigate]);

  const handleDownload = useCallback(async (format: 'basic' | 'story') => {
    if (!matchResult) return;
    const c = matchResult.character;
    const isKo = i18n.language?.startsWith('ko');
    setIsGenerating(true);

    try {
      let blob: Blob;
      let filename: string;

      const lang = i18n.language || 'en';
      const isJa = lang.startsWith('ja');
      const isZh = lang.startsWith('zh');
      const isKo = lang.startsWith('ko');

      let nativeName = isJa && c.heroine_name_ja ? c.heroine_name_ja :
        isZh && c.heroine_name_zh_tw ? c.heroine_name_zh_tw :
          isKo ? c.heroine_name : c.heroine_name_en;

      let nativeAnime = isJa && c.anime_ja ? c.anime_ja :
        isZh && c.anime_zh_tw ? c.anime_zh_tw :
          isKo && c.anime ? c.anime : c.anime_en;

      if (format === 'story') {
        blob = await generateStoryCard({
          characterName: nativeName,
          animeName: nativeAnime,
          percent: matchResult.percent,
          heroineId: c.heroine_id,
          heroineEmoji: c.heroine_emoji,
          heroineColor: c.heroine_color,
          lang: i18n.language,
          heroineImage: c.heroine_image,
        });
        filename = `animatch-story-${c.heroine_name_en.toLowerCase().replace(/\s+/g, '-')}.png`;

        // Try native share first for stories if on mobile
        if (navigator.share && navigator.canShare) {
          const file = new File([blob], filename, { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                files: [file],
                title: 'AniMatch Result',
                text: t('result.shareTextShort', { name: nativeName, anime: nativeAnime, percent: matchResult.percent }),
              });
              setIsGenerating(false);
              setIsSaveModalOpen(false);
              return;
            } catch (e: any) {
              if (e.name !== 'AbortError') {
                console.error('Share failed', e);
              }
            }
          }
        }
      } else {
        let nativeTags = isJa && c.heroine_tags_ja ? c.heroine_tags_ja :
          isZh && c.heroine_tags_zh_tw ? c.heroine_tags_zh_tw :
            isKo ? c.heroine_tags : c.heroine_tags_en;

        let nativeCharm = isJa && c.heroine_charm_ja ? c.heroine_charm_ja :
          isZh && c.heroine_charm_zh_tw ? c.heroine_charm_zh_tw :
            isKo ? c.heroine_charm : c.heroine_charm_en;

        blob = await generateResultCard({
          characterName: nativeName,
          animeName: nativeAnime,
          percent: matchResult.percent,
          heroineId: c.heroine_id,
          heroineEmoji: c.heroine_emoji,
          heroineColor: c.heroine_color,
          lang: i18n.language,
          heroineImage: c.heroine_image,
          tags: nativeTags,
          charm: nativeCharm,
        });
        filename = `animatch-${c.heroine_name_en.toLowerCase().replace(/\s+/g, '-')}.png`;
      }

      // Fallback/Desktop: Download the generated blob
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      showToast(t('result.downloadComplete'));

      import('@/utils/telemetry').then(({ trackFunnelEvent }) => {
        trackFunnelEvent('Result Saved', { format });
      });
    } catch {
      showToast(t('result.downloadError'));
    } finally {
      setIsGenerating(false);
      setIsSaveModalOpen(false);
    }
  }, [matchResult, i18n.language, showToast, t]);


  const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);


  useEffect(() => {
    const currentState = useResultStore.getState().matchResult;
    if (!currentState) {
      console.warn('[ResultScreen] Missing matchResult on mount, redirecting to /upload');
      navigate('/upload', { replace: true });
    } else {
      const lang = i18n.language || 'en';
      const c = currentState.character;

      const isJa = lang.startsWith('ja');
      const isZh = lang.startsWith('zh');
      const isKo = lang.startsWith('ko');

      let nativeName = isJa && c.heroine_name_ja ? c.heroine_name_ja :
        isZh && c.heroine_name_zh_tw ? c.heroine_name_zh_tw :
          isKo ? c.heroine_name : c.heroine_name_en;

      let nativeAnime = isJa && c.anime_ja ? c.anime_ja :
        isZh && c.anime_zh_tw ? c.anime_zh_tw :
          isKo && c.anime ? c.anime : c.anime_en;

      import('@/utils/telemetry').then(({ trackFunnelEvent }) => {
        trackFunnelEvent('Result Screen Viewed', {
          character: nativeName,
          anime: nativeAnime,
          score: currentState.score
        });
      });
    }

    // Smooth scroll to top when revealing results
    window.scrollTo({ top: 0, behavior: 'smooth' });

    return () => {
      // Intentionally not resetting stores here to prevent React 18 StrictMode double-mount bugs
      // The stores will be overwritten when starting a new analysis anyway.
    };
  }, [navigate]);

  if (!matchResult) {
    return null;
  }

  const char = matchResult.character;
  const localized = useLocalizedChar(char);

  const confidenceLabels: Record<string, string> = {
    high: t('result.confidenceHigh'),
    medium: t('result.confidenceMedium'),
    low: t('result.confidenceLow'),
  };

  const swapToRunnerUp = (entry: MatchCandidate) => {
    // Keep the entire topN list intact in state, just change the primary viewed character
    setMatchResult({
      ...matchResult,
      character: entry.character,
      percent: entry.percent,
      score: entry.similarity,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // The displayed runner-ups should be the top N characters EXCEPT the currently selected one
  const allCandidates = matchResult.topN;
  const runnerUps = allCandidates.filter((c) => c.character.heroine_id !== char.heroine_id);
  const displayRunnerUps = runnerUps;

  return (
    <motion.section
      className={styles.screen}
      initial={isMobile ? { opacity: 0 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: isMobile ? 0.3 : 0.5 }}
    >
      <SEO
        title={`${localized.name} - AniMatch ${t('result.badge')}`}
        description={`AniMatch Result: ${localized.name} from ${localized.anime}. ${localized.charm}`}
      />
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
        {displayRunnerUps.length > 0 && (
          <motion.div
            className={styles.runnerUpSection}
            initial={isMobile ? { opacity: 0 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: isMobile ? 0.2 : 0.5 }}
          >
            <h3 className={styles.runnerUpTitle}>{t('result.runnerUpTitle')}</h3>
            <div className={styles.runnerUpGrid}>
              {displayRunnerUps.map((entry) => {
                const rc = entry.character;
                const lang = i18n.language || 'en';
                const isJa = lang.startsWith('ja');
                const isZh = lang.startsWith('zh');
                const isKo = lang.startsWith('ko');

                let nativeName = isJa && rc.heroine_name_ja ? rc.heroine_name_ja :
                  isZh && rc.heroine_name_zh_tw ? rc.heroine_name_zh_tw :
                    isKo ? rc.heroine_name : rc.heroine_name_en;

                let nativeAnime = isJa && rc.anime_ja ? rc.anime_ja :
                  isZh && rc.anime_zh_tw ? rc.anime_zh_tw :
                    isKo && rc.anime ? rc.anime : rc.anime_en;

                // Find original rank from allCandidates
                const originalRank = allCandidates.findIndex((c) => c.character.heroine_id === rc.heroine_id) + 1;

                return (
                  <div
                    key={rc.heroine_id}
                    className={styles.runnerUpCard}
                    onClick={() => swapToRunnerUp(entry)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className={styles.runnerUpRank}>{t('result.rank', { rank: originalRank })}</div>
                    <RunnerUpImage char={rc} />
                    <div className={styles.runnerUpInfo}>
                      <span className={styles.runnerUpName}>{nativeName}</span>
                      <span className={styles.runnerUpAnime}>{nativeAnime}</span>
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
          <div className={styles.shareButtons} style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
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
            <button className={`${styles.shareBtn} ${styles.download}`} onClick={() => setIsSaveModalOpen(true)}>
              <span className={styles.shareIcon}>⬇</span>
              <span>{t('result.shareDownload')}</span>
            </button>
          </div>
        </motion.div>

        <div className={styles.actionButtons}>
          <Link to="/" className={styles.homeBtn}>
            {t('common.backToHome')}
          </Link>
          <button className={styles.retryBtn} onClick={handleRetry}>
            {t('common.retry')}
          </button>
        </div>

        <AdBanner />
      </main>

      {/* Save Modal */}
      {isSaveModalOpen && (
        <div className={styles.modalOverlay} onClick={() => !isGenerating && setIsSaveModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{t('result.saveModalTitle')}</h3>
            </div>
            <div className={styles.modalBody}>
              <button
                className={styles.modalOptionBtn}
                onClick={() => handleDownload('story')}
                disabled={isGenerating}
              >
                {t('result.saveModalStory')}
              </button>
              <button
                className={styles.modalOptionBtn}
                onClick={() => handleDownload('basic')}
                disabled={isGenerating}
              >
                {t('result.saveModalBasic')}
              </button>

              <button
                className={styles.modalCancelBtn}
                onClick={() => setIsSaveModalOpen(false)}
                disabled={isGenerating}
              >
                {isGenerating ? t('result.downloading') : t('result.saveModalCancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.section>
  );
}

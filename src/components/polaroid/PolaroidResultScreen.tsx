import { useCallback, useEffect, useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '@/components/shared/SEO';
import Header from '@/components/shared/Header';
import PolaroidFrame from '@/components/polaroid/PolaroidFrame';
import { useResultStore } from '@/stores/resultStore';
import { useUploadStore } from '@/stores/uploadStore';
import { shareToX, shareToBluesky, copyLink } from '@/utils/share';
import { generateStoryCard } from '@/utils/resultCard';
import { useLocalizedChar } from '@/hooks/useLocalizedChar';
import type { MatchCandidate } from '@/types/match';
import type { CharacterEmbedding } from '@/types/character';
import { useAppStore } from '@/stores/appStore';
import { getLocalizedChar } from '@/utils/localize';
import styles from './PolaroidResultScreen.module.css';

function CharImage({ char }: { char: CharacterEmbedding }) {
  const [imgState, setImgState] = useState<'loading' | 'official' | 'emoji'>('loading');
  const fallbackBg = char.heroine_color || 'linear-gradient(145deg, #D4A574, #E8C9A0)';

  useEffect(() => {
    let isMounted = true;
    if (!char.heroine_image) { setImgState('emoji'); return; }
    setImgState('loading');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => { if (isMounted) setImgState('official'); };
    img.onerror = () => { if (isMounted) setImgState('emoji'); };
    img.src = char.heroine_image;
    return () => { isMounted = false; };
  }, [char.heroine_id, char.heroine_image]);

  if (imgState === 'official' && char.heroine_image) {
    return (
      <img
        className={styles.charImage}
        src={char.heroine_image}
        alt={'AniMatch: ' + char.heroine_name}
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
        onError={() => setImgState('emoji')}
        draggable={false}
      />
    );
  }
  return (
    <div className={styles.charEmoji} style={{ background: fallbackBg }}>
      {char.heroine_emoji || '💕'}
    </div>
  );
}

export default function PolaroidResultScreen() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { matchResult, setMatchResult } = useResultStore();
  const showToast = useAppStore(s => s.showToast);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  useEffect(() => {
    const currentState = useResultStore.getState().matchResult;
    if (!currentState) {
      navigate('/polaroid', { replace: true });
    } else {
      const lang = i18n.language || 'en';
      const c = currentState.character;
      const localized = getLocalizedChar(c, lang);
      import('@/utils/telemetry').then(({ trackFunnelEvent }) => {
        trackFunnelEvent('polaroid_result_viewed', {
          character: localized.name,
          anime: localized.anime,
          score: currentState.score,
        });
      });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    useUploadStore.getState().reset();
  }, [navigate, i18n.language]);

  const fallbackChar = matchResult?.character ?? ({} as any);
  const localized = useLocalizedChar(fallbackChar);

  if (!matchResult) return null;

  const char = matchResult.character;

  const swapToCharacter = (entry: MatchCandidate) => {
    setMatchResult({
      ...matchResult,
      character: entry.character,
      percent: entry.percent,
      score: entry.similarity,
    });
  };

  const allCandidates = matchResult.topN;

  const handleRetry = () => {
    import('@/utils/telemetry').then(({ trackFunnelEvent }) => {
      trackFunnelEvent('Polaroid Retry Clicked');
    });
    navigate('/polaroid');
  };

  const handleDownload = async (format: 'basic' | 'story') => {
    if (!matchResult) return;
    const c = matchResult.character;
    setIsGenerating(true);

    try {
      const lang = i18n.language || 'en';
      const loc = getLocalizedChar(c, lang);
      let blob: Blob;
      let filename: string;

      if (format === 'story') {
        blob = await generateStoryCard({
          characterName: loc.name,
          animeName: loc.anime,
          percent: matchResult.percent,
          heroineId: c.heroine_id,
          heroineEmoji: c.heroine_emoji,
          heroineColor: c.heroine_color,
          lang: i18n.language,
          heroineImage: c.heroine_image,
        });
        filename = `animatch-polaroid-${c.heroine_name_en.toLowerCase().replace(/\s+/g, '-')}.webp`;
      } else {
        if (!cardRef.current) return;
        const canvas = await html2canvas(cardRef.current, {
          useCORS: true, scale: 2, backgroundColor: '#FFF8F0', logging: false,
        });
        blob = await new Promise((resolve, reject) => {
          canvas.toBlob((b) => (b ? resolve(b) : reject()), 'image/png');
        });
        filename = `animatch-polaroid-${c.heroine_name_en.toLowerCase().replace(/\s+/g, '-')}.png`;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to download card:', e);
    } finally {
      setIsGenerating(false);
      setIsSaveModalOpen(false);
    }
  };

  // Define static pinboard tilts for Rank 1 to 4 to scattered randomly
  const cardTilts = [-4, 3, -2, 5];
  const cardPushes = ['#e63946', '#38BDF8', '#C084FC', '#F59E0B'];

  return (
    <motion.section
      className={styles.screen}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: isMobile ? 0.3 : 0.5 }}
    >
      <SEO
        title={`${localized.name} - AniMatch ${t('result.badge')}`}
        description={`AniMatch Polaroid: ${localized.name} from ${localized.anime}`}
      />
      <div className={styles.bg} />
      <Header backTo="/" backLabel={t('common.backToHome')} />

      <main className={styles.content}>
        {/* Result header */}
        <motion.div
          className={styles.resultHeader}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h2 className={styles.resultTitle}>{t('polaroid.resultTitle')}</h2>
          <p className={styles.resultSubtitle}>{t('polaroid.resultCaption')}</p>
        </motion.div>

        {/* 📌 Retro Corkboard Pinboard Container */}
        <motion.div
          className={styles.pinboard}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          {/* Cork texture overlay */}
          <div className={styles.corkTexture} />

          {/* Left Side: Polaroid Collage */}
          <div className={styles.polaroidCollage}>
            {allCandidates.map((entry, index) => {
              const rc = entry.character;
              const isSelected = rc.heroine_id === char.heroine_id;
              const originalRank = index + 1;
              const lang = i18n.language || 'en';
              const rcLocalized = getLocalizedChar(rc, lang);
              const tilt = cardTilts[index % cardTilts.length];
              const pinColor = cardPushes[index % cardPushes.length];

              return (
                <div
                  key={rc.heroine_id}
                  className={`${styles.pinnedCard} ${styles[`cardRank${originalRank}`] || ''} ${isSelected ? styles.selectedCard : ''}`}
                  style={{
                    transform: `rotate(${tilt}deg)`,
                    zIndex: isSelected ? 10 : index + 2,
                  }}
                  onClick={() => swapToCharacter(entry)}
                  role="button"
                  tabIndex={0}
                >
                  {/* Pushpin at the top center */}
                  <div className={styles.pushpin} style={{ backgroundColor: pinColor }} />
                  
                  {/* Best Match Stamp on index 0 */}
                  {index === 0 && (
                    <div className={styles.bestMatchStamp}>
                      <span>BEST</span>
                    </div>
                  )}

                  {/* Wrapper specifically for download screenshot */}
                  <div ref={isSelected ? cardRef : undefined}>
                    <PolaroidFrame
                      tilt={0}
                      caption={rcLocalized.name}
                      showGrain={true}
                      style={{ width: isMobile ? 120 : 155 }}
                    >
                      <CharImage char={rc} />
                    </PolaroidFrame>
                  </div>
                  <span className={styles.cardPercent}>{entry.percent}%</span>
                </div>
              );
            })}
          </div>

          {/* Right Side: Handwritten Notebook Note Panel */}
          <div className={styles.detailsMemo}>
            {/* Memo Sheet Pin */}
            <div className={styles.memoPin} />
            
            <AnimatePresence mode="wait">
              <motion.div
                key={char.heroine_id}
                className={styles.memoContent}
                initial={{ opacity: 0, rotate: 1 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: -1 }}
                transition={{ duration: 0.25 }}
              >
                {/* Lined paper lines */}
                <div className={styles.paperLineOverlay} />

                {/* Memo Header */}
                <div className={styles.memoHeader}>
                  <div className={styles.nameWrap}>
                    <h2 className={styles.memoHeroineName}>{localized.name}</h2>
                    <p className={styles.memoHeroineAnime}>{localized.anime}</p>
                  </div>

                  {/* Stamp Match Score */}
                  <div className={styles.matchStamp}>
                    <span className={styles.stampValue}>{matchResult.percent}%</span>
                    <span className={styles.stampLabel}>MATCH</span>
                  </div>
                </div>

                {/* Tags */}
                <div className={styles.memoTags}>
                  {localized.tags?.map((tag, i) => (
                    <span key={i} className={styles.memoTag}>#{tag}</span>
                  ))}
                </div>

                {/* Sections */}
                <div className={styles.memoDetails}>
                  <div className={styles.memoSection}>
                    <h3 className={styles.memoSectionTitle}>📝 {t('result.personalityTitle')}</h3>
                    <ul className={styles.memoPersonalityList}>
                      {localized.personality?.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>

                  <div className={styles.memoSection}>
                    <h3 className={styles.memoSectionTitle}>✨ {t('result.charmTitle')}</h3>
                    <p className={styles.memoCharmText}>{localized.charm}</p>
                  </div>

                  <div className={styles.memoSection}>
                    <h3 className={styles.memoSectionTitle}>🎬 {t('result.animeTitle')}</h3>
                    <div className={styles.memoAnimeInfo}>
                      <span className={styles.memoAnimeTitleText}>{localized.anime}</span>
                      <span className={styles.memoAnimeGenre}>{localized.genre?.join(' · ')}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.memoWatermark}>animatch.midori-lab.com</div>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Share */}
        <motion.div
          className={styles.shareSection}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <h3 className={styles.shareTitle}>{t('result.shareTitle')}</h3>
          <div className={styles.shareButtons}>
            <button className={styles.shareBtn} onClick={() => shareToX(char, matchResult.percent, i18n.language)}>
              <span className={styles.shareIcon}>𝕏</span>
              <span>{t('result.shareX')}</span>
            </button>
            <button className={styles.shareBtn} onClick={() => shareToBluesky(char, matchResult.percent, i18n.language)}>
              <span className={styles.shareIcon}>🦋</span>
              <span>{t('result.shareBluesky')}</span>
            </button>
            <button className={styles.shareBtn} onClick={() => {
              copyLink(char.heroine_id, matchResult.percent, () => {});
            }}>
              <span className={styles.shareIcon}>🔗</span>
              <span>{t('result.shareCopy')}</span>
            </button>
            <button className={styles.shareBtn} onClick={() => setIsSaveModalOpen(true)}>
              <span className={styles.shareIcon}>⬇</span>
              <span>{t('result.shareDownload')}</span>
            </button>
          </div>
        </motion.div>

        {/* Action buttons */}
        <div className={styles.actionButtons}>
          <Link to="/" className={styles.homeBtn}>{t('common.backToHome')}</Link>
          <button className={styles.retryBtn} onClick={handleRetry}>{t('common.retry')}</button>
        </div>
      </main>

      {/* Save modal */}
      {isSaveModalOpen && (
        <div className={styles.modalOverlay} onClick={() => !isGenerating && setIsSaveModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>{t('result.saveModalTitle')}</h3>
            <div className={styles.modalBody}>
              <button className={styles.modalOptionBtn} onClick={() => handleDownload('story')} disabled={isGenerating}>
                {t('result.saveModalStory')}
              </button>
              <button className={styles.modalOptionBtn} onClick={() => handleDownload('basic')} disabled={isGenerating}>
                {t('result.saveModalBasic')}
              </button>
              <button className={styles.modalCancelBtn} onClick={() => setIsSaveModalOpen(false)} disabled={isGenerating}>
                {isGenerating ? t('result.downloading') : t('result.saveModalCancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.section>
  );
}

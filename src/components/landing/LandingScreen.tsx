import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '@/components/shared/SEO';
import LangToggle from '@/components/shared/LangToggle';
import Footer from '@/components/shared/Footer';
import AdBanner from '@/components/shared/AdBanner';
import { initClipEngine } from '@/ml/clipEngine';
import { initArcFace } from '@/ml/arcFaceEngine';
import { trackFunnelEvent } from '@/utils/telemetry';
import { isMobile } from '@/utils/device';
import styles from './LandingScreen.module.css';



function ParticleField() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isMobile()) return;
    const container = ref.current;
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < 30; i++) {
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

  return <div ref={ref} className={styles.particleField} />;
}

const CHARACTER_POOL = [
  { id: 1, emoji: '💙', name: '아스나', nameEn: 'Asuna', anime: 'SAO', gradient: 'linear-gradient(135deg, #667eea, #764ba2)' },
  { id: 2, emoji: '💗', name: '렘', nameEn: 'Rem', anime: 'Re:Zero', gradient: 'linear-gradient(135deg, #f093fb, #f5576c)' },
  { id: 3, emoji: '💜', name: '치카', nameEn: 'Chika', anime: '카구야님', animeEn: 'Kaguya-sama', gradient: 'linear-gradient(135deg, #4facfe, #00f2fe)' },
  { id: 4, emoji: '🎸', name: '봇치', nameEn: 'Bocchi', anime: '봇치 더 고!', animeEn: 'Bocchi the Rock!', gradient: 'linear-gradient(135deg, #ff0844, #ffb199)' },
  { id: 5, emoji: '🧝‍♀️', name: '프리렌', nameEn: 'Frieren', anime: '장송의 프리렌', animeEn: 'Frieren', gradient: 'linear-gradient(135deg, #e0c3fc, #8ec5fc)' },
  { id: 6, emoji: '👗', name: '마린', nameEn: 'Marin', anime: '비스크 돌', animeEn: 'My Dress-Up Darling', gradient: 'linear-gradient(135deg, #ff9a9e, #fecfef)' },
  { id: 7, emoji: '💥', name: '메구밍', nameEn: 'Megumin', anime: '코노스바', animeEn: 'Konosuba', gradient: 'linear-gradient(135deg, #f83600, #f9d423)' },
  { id: 8, emoji: '🔪', name: '요르', nameEn: 'Yor', anime: '스파이 패밀리', animeEn: 'Spy x Family', gradient: 'linear-gradient(135deg, #434343, #000000)' },
  { id: 9, emoji: '🦋', name: '시노부', nameEn: 'Shinobu', anime: '귀멸의 칼날', animeEn: 'Demon Slayer', gradient: 'linear-gradient(135deg, #b224ef, #7579ff)' },
  { id: 10, emoji: '🐰', name: '마이', nameEn: 'Mai', anime: '청춘 돼지', animeEn: 'Bunny Girl Senpai', gradient: 'linear-gradient(135deg, #5b247a, #1bcedf)' },
  { id: 11, emoji: '🌿', name: '마오마오', nameEn: 'Maomao', anime: '약사의 혼잣말', animeEn: 'Apothecary Diaries', gradient: 'linear-gradient(135deg, #16a085, #f4d03f)' },
  { id: 12, emoji: '🌟', name: '아이', nameEn: 'Ai', anime: '최애의 아이', animeEn: 'Oshi no Ko', gradient: 'linear-gradient(135deg, #ff0844, #ffb199)' }
];

export default function LandingScreen() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.language || 'en';
  const isKo = lang.startsWith('ko');
  const isJa = lang.startsWith('ja');
  const isZh = lang.startsWith('zh');

  type DisplayCard = Omit<typeof CHARACTER_POOL[0], 'id'> & { id: string };

  const [displayedCards, setDisplayedCards] = useState<DisplayCard[]>(() => {
    return [
      { ...CHARACTER_POOL[0]!, id: `${CHARACTER_POOL[0]!.id}-initial-0` },
      { ...CHARACTER_POOL[1]!, id: `${CHARACTER_POOL[1]!.id}-initial-1` },
      { ...CHARACTER_POOL[2]!, id: `${CHARACTER_POOL[2]!.id}-initial-2` }
    ];
  });
  const poolIndexRef = useRef(3);

  useEffect(() => {
    trackFunnelEvent('Landing Page Viewed');
    const interval = setInterval(() => {
      setDisplayedCards((prev) => {
        const next = [...prev];
        next.shift(); // Remove the leftmost card

        const newCharInfo = CHARACTER_POOL[poolIndexRef.current]!;
        next.push({
          ...newCharInfo,
          id: `${newCharInfo.id}-${Date.now()}` // Unique ID for Framer Motion AnimatePresence
        });

        poolIndexRef.current = (poolIndexRef.current + 1) % CHARACTER_POOL.length;
        return next;
      });
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Background Model Pre-loading
  useEffect(() => {
    // Wait for the main UI to render completely before starting heavy network loads
    const timer = setTimeout(() => {
      // Intentionally ignore promises to just start the background fetching
      initClipEngine().then(() => initArcFace()).catch(console.warn);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleStart = () => {
    trackFunnelEvent('Landing Page Start Clicked');
    navigate('/upload');
  };

  return (
    <motion.section
      className={styles.screen}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
    >
      <SEO />
      <div className={styles.bg}>
        <ParticleField />
        <div className={`${styles.glowOrb} ${styles.orb1}`} />
        <div className={`${styles.glowOrb} ${styles.orb2}`} />
        <div className={`${styles.glowOrb} ${styles.orb3}`} />
      </div>

      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoText}>AniMatch</span>
        </div>
        <div className={styles.headerRight}>
          <Link
            to="/characters"
            className={styles.charactersLink}
            aria-label={t('characters.headerIcon')}
            title={t('characters.headerIcon')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            <span>{t('characters.headerIcon')}</span>
          </Link>
          <LangToggle />
        </div>
      </header>

      <main className={styles.content}>
        <div className={styles.heroBadge}>{t('landing.badge')}</div>
        <h1 className={styles.heroTitle}>
          {isKo ? (
            <>
              {t('landing.titleLine1')}<br />
              <span className={styles.gradientText}>{t('landing.titleHighlight')}</span>{t('landing.titleLine2')}<br />
              {t('landing.titleLine3')}
            </>
          ) : isJa ? (
            <>
              {t('landing.titleLine1')}<br />
              <span className={styles.gradientText}>{t('landing.titleHighlight')}</span>{t('landing.titleLine2')}
            </>
          ) : isZh ? (
            <>
              {t('landing.titleLine1')}<br />
              <span className={styles.gradientText}>{t('landing.titleHighlight')}</span>{t('landing.titleLine2')}
            </>
          ) : (
            <>
              {t('landing.titleLine1')}<br />
              <span className={styles.gradientText}>{t('landing.titleHighlight')}</span>
            </>
          )}
        </h1>
        <p className={styles.heroSubtitle}>{t('landing.subtitle')}</p>

        <div className={styles.exampleCards}>
          <AnimatePresence mode="popLayout">
            {displayedCards.map((card, index: number) => {
              // 0 = left, 1 = center, 2 = right
              const isCenter = index === 1;
              const xPos = index === 0 ? -100 : index === 2 ? 100 : 0;
              const scale = isCenter ? 1.05 : 0.85;
              const zIndex = isCenter ? 3 : index === 2 ? 2 : 1;
              const opacity = isCenter ? 1 : 0.5;

              return (
                <motion.div
                  key={card.id}
                  layout
                  initial={{ opacity: 0, scale: 0.5, x: 200, rotateY: -45 }}
                  animate={{ opacity, scale, x: xPos, rotateY: isCenter ? 0 : index === 0 ? 15 : -15 }}
                  exit={{ opacity: 0, scale: 0.5, x: -200, rotateY: 45 }}
                  transition={{ duration: 0.8, type: 'spring', bounce: 0.3 }}
                  className={`${styles.exampleCard} ${isCenter ? styles.featured : ''}`}
                  style={{ zIndex }}
                >
                  <div className={styles.exampleImg} style={{ background: card.gradient }}>
                    <span>{card.emoji}</span>
                  </div>
                  <div className={styles.exampleInfo}>
                    <span className={styles.exampleName}>{isKo ? card.name : card.nameEn}</span>
                    <span className={styles.exampleAnime}>{isKo ? card.anime : (card.animeEn ?? card.anime)}</span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        <button className={styles.ctaBtn} onClick={handleStart}>
          <span>{t('landing.cta')}</span>
          <span className={styles.ctaArrow}>{t('landing.ctaArrow')}</span>
        </button>

        <AdBanner />
      </main>

      <Footer />
    </motion.section>
  );
}

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import LangToggle from '@/components/shared/LangToggle';
import Footer from '@/components/shared/Footer';
import AdBanner from '@/components/shared/AdBanner';
import styles from './LandingScreen.module.css';

function ParticleField() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
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

const exampleCards = [
  { emoji: '💙', name: '아스나', nameEn: 'Asuna', anime: 'SAO', gradient: 'linear-gradient(135deg, #667eea, #764ba2)' },
  { emoji: '💗', name: '렘', nameEn: 'Rem', anime: 'Re:Zero', gradient: 'linear-gradient(135deg, #f093fb, #f5576c)', featured: true },
  { emoji: '💜', name: '치카', nameEn: 'Chika', anime: '카구야님', animeEn: 'Kaguya-sama', gradient: 'linear-gradient(135deg, #4facfe, #00f2fe)' },
];

export default function LandingScreen() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isKo = i18n.language === 'ko';

  return (
    <motion.section
      className={styles.screen}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
    >
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
        <LangToggle />
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
          ) : (
            <>
              {t('landing.titleLine1')}<br />
              <span className={styles.gradientText}>{t('landing.titleHighlight')}</span>
            </>
          )}
        </h1>
        <p className={styles.heroSubtitle}>{t('landing.subtitle')}</p>

        <div className={styles.exampleCards}>
          {exampleCards.map((card) => (
            <div key={card.name} className={`${styles.exampleCard} ${card.featured ? styles.featured : ''}`}>
              <div className={styles.exampleImg} style={{ background: card.gradient }}>
                <span>{card.emoji}</span>
              </div>
              <div className={styles.exampleInfo}>
                <span className={styles.exampleName}>{isKo ? card.name : card.nameEn}</span>
                <span className={styles.exampleAnime}>{isKo ? card.anime : (card.animeEn ?? card.anime)}</span>
              </div>
            </div>
          ))}
        </div>

        <button className={styles.ctaBtn} onClick={() => navigate('/upload')}>
          <span>{t('landing.cta')}</span>
          <span className={styles.ctaArrow}>{t('landing.ctaArrow')}</span>
        </button>

        <AdBanner />
      </main>

      <Footer />
    </motion.section>
  );
}

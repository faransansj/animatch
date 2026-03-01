import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import SEO from '@/components/shared/SEO';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import AdBanner from '@/components/shared/AdBanner';
import { useMLStore } from '@/stores/mlStore';
import { useLocalizedChar } from '@/hooks/useLocalizedChar';
import type { CharacterEmbedding } from '@/types/character';
import styles from './CharacterDetail.module.css';

const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

function HeroImage({ char }: { char: CharacterEmbedding }) {
    const [isFlipped, setIsFlipped] = useState(false);
    const [imgState, setImgState] = useState<'official' | 'emoji'>('official');
    const fallbackBg = char.heroine_color || 'linear-gradient(135deg, #f093fb, #f5576c)';

    return (
        <div
            className={`${styles.heroImg} ${isFlipped ? styles.isFlipped : ''}`}
            onClick={() => setIsFlipped(!isFlipped)}
        >
            <div className={styles.flipInner}>
                {/* Front: Emoji */}
                <div className={styles.flipFront} style={{ background: fallbackBg }}>
                    <span className={styles.emojiLg}>{char.heroine_emoji || '💖'}</span>
                </div>
                {/* Back: Official Image */}
                <div className={styles.flipBack} style={{ background: fallbackBg }}>
                    {imgState === 'official' && char.heroine_image ? (
                        <img
                            className={styles.heroTarotImg}
                            src={char.heroine_image}
                            alt={`AniMatch character: ${char.heroine_name_en}`}
                            style={{ objectFit: 'cover' }}
                            referrerPolicy="no-referrer"
                            onError={() => setImgState('emoji')}
                        />
                    ) : (
                        <span className={styles.emojiLg}>{char.heroine_emoji || '💖'}</span>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function CharacterDetail() {
    const { id } = useParams<{ id: string }>();
    const { t } = useTranslation();
    const embeddingsData = useMLStore((s) => s.embeddingsData);
    const setEmbeddingsData = useMLStore((s) => s.setEmbeddingsData);
    const [isLoading, setIsLoading] = useState(false);

    // Load embeddings if navigated directly
    useEffect(() => {
        if (embeddingsData) return;

        let cancelled = false;
        setIsLoading(true);

        async function loadData() {
            try {
                if (typeof DecompressionStream !== 'undefined') {
                    try {
                        const resp = await fetch('/embeddings.json.gz', { cache: 'force-cache' });
                        if (resp.ok) {
                            const ds = new DecompressionStream('gzip');
                            const decompressed = resp.body!.pipeThrough(ds);
                            const text = await new Response(decompressed).text();
                            if (!cancelled) {
                                setEmbeddingsData(JSON.parse(text));
                                setIsLoading(false);
                            }
                            return;
                        }
                    } catch { /* fallback */ }
                }
                const resp = await fetch('/embeddings.json');
                if (!resp.ok) throw new Error('Failed to load');
                const data = await resp.json();
                if (!cancelled) {
                    setEmbeddingsData(data);
                    setIsLoading(false);
                }
            } catch (err) {
                console.error('Failed to load character data:', err);
                if (!cancelled) setIsLoading(false);
            }
        }

        loadData();
        return () => { cancelled = true; };
    }, [embeddingsData, setEmbeddingsData]);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [id]);

    const char = embeddingsData?.characters.find((c) => String(c.heroine_id) === id);

    if (isLoading) {
        return (
            <motion.section className={styles.screen} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className={styles.bg} />
                <Header backTo="/characters" backLabel={t('characters.backToList')} />
                <div className={styles.loadingState}>
                    <div className={styles.spinner} />
                    <p>{t('model.loadingData')}</p>
                </div>
            </motion.section>
        );
    }

    if (!char) {
        return (
            <motion.section className={styles.screen} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className={styles.bg} />
                <Header backTo="/characters" backLabel={t('characters.backToList')} />
                <div className={styles.emptyState}>
                    <span className={styles.emptyIcon}>❓</span>
                    <p>{t('characters.noResults')}</p>
                    <Link to="/characters" className={styles.backBtn}>{t('characters.backToList')}</Link>
                </div>
            </motion.section>
        );
    }

    return <CharacterDetailContent char={char} />;
}

function CharacterDetailContent({ char }: { char: CharacterEmbedding }) {
    const { t } = useTranslation();
    const localized = useLocalizedChar(char);

    return (
        <motion.section
            className={styles.screen}
            initial={isMobile ? { opacity: 0 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: isMobile ? 0.3 : 0.5 }}
        >
            <SEO
                title={`${localized.name} - ${localized.anime} | AniMatch ${t('characters.pageTitle')}`}
                description={`${localized.name} (${localized.anime}) - ${localized.charm}`}
            />
            <div className={styles.bg} />

            <Header backTo="/characters" backLabel={t('characters.backToList')} />

            <main className={styles.content}>
                {/* Character Card */}
                <motion.div
                    className={styles.heroineCard}
                    initial={isMobile ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: isMobile ? 0.5 : 0.8, delay: isMobile ? 0.1 : 0.3 }}
                >
                    <div className={styles.cardGlow} />

                    <HeroImage char={char} />

                    <div className={styles.infoPanel}>
                        <div className={styles.cardHeader}>
                            <span className={styles.cardBadge}>{char.heroine_emoji} {t('characters.detailTitle')}</span>
                        </div>

                        <div className={styles.nameArea}>
                            <h1 className={styles.heroineName}>{localized.name}</h1>
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

                {/* Action Buttons */}
                <div className={styles.actionButtons}>
                    <Link to="/characters" className={styles.listBtn}>
                        {t('characters.backToList')}
                    </Link>
                </div>

                <AdBanner />
            </main>

            <Footer />
        </motion.section>
    );
}

import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '@/components/shared/SEO';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import AdBanner from '@/components/shared/AdBanner';
import { useMLStore } from '@/stores/mlStore';
import { useLocalizedChar } from '@/hooks/useLocalizedChar';
import type { CharacterEmbedding } from '@/types/character';
import styles from './CharacterBrowse.module.css';

type OrientationFilter = 'all' | 'male' | 'female';

const GENRE_KEYS = [
    'all', 'romance', 'action', 'comedy', 'fantasy',
    'drama', 'sliceOfLife', 'supernatural', 'adventure',
] as const;

type GenreKey = typeof GENRE_KEYS[number];

const GENRE_MAP: Record<string, string[]> = {
    romance: ['로맨스', 'Romance'],
    action: ['액션', 'Action'],
    comedy: ['코미디', 'Comedy'],
    fantasy: ['판타지', 'Fantasy'],
    drama: ['드라마', 'Drama'],
    sliceOfLife: ['일상', 'Slice of Life'],
    supernatural: ['초자연', 'Supernatural', '초자연적'],
    adventure: ['모험', 'Adventure'],
};

function CharacterCard({ char, onClick }: { char: CharacterEmbedding; onClick: () => void }) {
    const [imgState, setImgState] = useState<'official' | 'emoji'>('official');
    const localized = useLocalizedChar(char);
    const fallbackBg = char.heroine_color || 'linear-gradient(135deg, #667eea, #764ba2)';

    return (
        <motion.article
            className={styles.card}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            layout
            onClick={onClick}
            role="button"
            tabIndex={0}
        >
            <div className={styles.cardImage} style={{ background: fallbackBg }}>
                {imgState === 'official' && char.heroine_image ? (
                    <img
                        src={char.heroine_image}
                        alt={`AniMatch character: ${char.heroine_name_en} from ${char.anime_en}`}
                        className={styles.cardImg}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        onError={() => setImgState('emoji')}
                    />
                ) : (
                    <span className={styles.cardEmoji}>{char.heroine_emoji || '💖'}</span>
                )}
                <div className={styles.emojiBadge}>
                    {char.heroine_emoji || '💖'}
                </div>
            </div>

            <div className={styles.cardBody}>
                <h3 className={styles.cardName}>{localized.name}</h3>
                <p className={styles.cardAnime}>{localized.anime}</p>
            </div>
        </motion.article>
    );
}

export default function CharacterBrowse() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const embeddingsData = useMLStore((s) => s.embeddingsData);
    const setEmbeddingsData = useMLStore((s) => s.setEmbeddingsData);

    const [search, setSearch] = useState('');
    const [orientation, setOrientation] = useState<OrientationFilter>('all');
    const [genre, setGenre] = useState<GenreKey>('all');
    const [isLoading, setIsLoading] = useState(false);

    // Load embeddings if not already loaded
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

    const characters = embeddingsData?.characters ?? [];

    const filteredCharacters = useMemo(() => {
        let result = characters;

        if (orientation !== 'all') {
            result = result.filter((c) => c.orientation === orientation);
        }

        if (genre !== 'all') {
            const genreValues = GENRE_MAP[genre] ?? [];
            result = result.filter((c) => {
                const allGenres = [...(c.genre || []), ...(c.genre_en || [])];
                return allGenres.some((g) =>
                    genreValues.some((gv) => g.toLowerCase().includes(gv.toLowerCase()))
                );
            });
        }

        if (search.trim()) {
            const q = search.trim().toLowerCase();
            result = result.filter((c) => {
                const searchableFields = [
                    c.heroine_name, c.heroine_name_en,
                    c.heroine_name_ja, c.heroine_name_zh_tw,
                    c.anime, c.anime_en, c.anime_ja, c.anime_zh_tw,
                    ...(c.heroine_tags || []), ...(c.heroine_tags_en || []),
                ].filter(Boolean);
                return searchableFields.some((f) => f!.toLowerCase().includes(q));
            });
        }

        return result;
    }, [characters, orientation, genre, search]);

    return (
        <motion.section
            className={styles.screen}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
        >
            <SEO
                title={`${t('characters.pageTitle')} - AniMatch`}
                description={t('characters.pageDesc')}
            />
            <div className={styles.bg}>
                <div className={`${styles.glowOrb} ${styles.orb1}`} />
                <div className={`${styles.glowOrb} ${styles.orb2}`} />
            </div>

            <Header backTo="/" backLabel={t('common.backToHome')} />

            <main className={styles.content}>
                <motion.div
                    className={styles.pageHeader}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <h1 className={styles.pageTitle}>{t('characters.pageTitle')}</h1>
                    <p className={styles.pageSubtitle}>
                        {t('characters.characterCount', { count: characters.length })}
                    </p>
                </motion.div>

                {/* Search Bar */}
                <motion.div
                    className={styles.searchBar}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <span className={styles.searchIcon}>🔍</span>
                    <input
                        type="text"
                        className={styles.searchInput}
                        placeholder={t('characters.searchPlaceholder')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        id="character-search"
                    />
                    {search && (
                        <button className={styles.clearBtn} onClick={() => setSearch('')}>✕</button>
                    )}
                </motion.div>

                {/* Orientation Filter */}
                <motion.div
                    className={styles.filterSection}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                >
                    <div className={styles.filterGroup}>
                        {(['all', 'male', 'female'] as OrientationFilter[]).map((key) => (
                            <button
                                key={key}
                                className={`${styles.filterChip} ${orientation === key ? styles.active : ''}`}
                                onClick={() => setOrientation(key)}
                            >
                                {t(`characters.filter${key.charAt(0).toUpperCase() + key.slice(1)}`)}
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* Genre Filter */}
                <motion.div
                    className={styles.genreFilter}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className={styles.genreScroll}>
                        {GENRE_KEYS.map((key) => (
                            <button
                                key={key}
                                className={`${styles.genreChip} ${genre === key ? styles.active : ''}`}
                                onClick={() => setGenre(key)}
                            >
                                {t(`characters.genre${key.charAt(0).toUpperCase() + key.slice(1)}`)}
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* Results Count */}
                <div className={styles.resultsCount}>
                    {filteredCharacters.length > 0
                        ? t('characters.characterCount', { count: filteredCharacters.length })
                        : null
                    }
                </div>

                {/* Character Grid */}
                {isLoading ? (
                    <div className={styles.loadingState}>
                        <div className={styles.spinner} />
                        <p>{t('model.loadingData')}</p>
                    </div>
                ) : filteredCharacters.length === 0 ? (
                    <motion.div
                        className={styles.emptyState}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <span className={styles.emptyIcon}>🔍</span>
                        <p>{t('characters.noResults')}</p>
                    </motion.div>
                ) : (
                    <motion.div className={styles.grid} layout>
                        <AnimatePresence mode="popLayout">
                            {filteredCharacters.map((char) => (
                                <CharacterCard
                                    key={char.heroine_id}
                                    char={char}
                                    onClick={() => navigate(`/characters/${char.heroine_id}`)}
                                />
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}

                <AdBanner />
            </main>

            <Footer />
        </motion.section>
    );
}

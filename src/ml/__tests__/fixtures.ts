/**
 * Shared test fixtures for ML tests.
 * Creates minimal CharacterEmbedding and EmbeddingsData objects.
 */
import type { CharacterEmbedding, EmbeddingsData } from '@/types/character';

let idCounter = 0;

/**
 * Create a mock CharacterEmbedding with sensible defaults.
 * Only override what your test cares about.
 */
export function createMockCharacter(
    overrides: Partial<CharacterEmbedding> & { embedding: number[] },
): CharacterEmbedding {
    const id = ++idCounter;
    return {
        anime: `Anime ${id}`,
        anime_en: `Anime ${id} EN`,
        genre: ['Romance'],
        genre_en: ['Romance'],
        heroine_id: id,
        heroine_name: `Heroine ${id}`,
        heroine_name_en: `Heroine ${id} EN`,
        heroine_image: `https://example.com/${id}.webp`,
        heroine_personality: ['Kind'],
        heroine_personality_en: ['Kind'],
        heroine_charm: '매력적',
        heroine_charm_en: 'Charming',
        heroine_quote: '명대사',
        heroine_quote_en: 'Famous quote',
        heroine_tags: ['tag'],
        heroine_tags_en: ['tag'],
        heroine_color: '#FF6B9D',
        heroine_emoji: '💖',
        orientation: 'male',
        tier: 2,
        protagonist: `Protagonist ${id}`,
        protagonist_en: `Protagonist ${id} EN`,
        ...overrides,
    };
}

/**
 * Create a mock EmbeddingsData wrapping the given characters.
 */
export function createMockEmbeddingsData(
    characters: CharacterEmbedding[],
): EmbeddingsData {
    return {
        model: 'test-model',
        embedding_dim: characters[0]?.embedding.length ?? 512,
        count: characters.length,
        characters,
    };
}

/**
 * Create a simple unit vector of the given dimension,
 * with the value concentrated at `hotIndex`.
 */
export function createUnitVector(dim: number, hotIndex = 0): number[] {
    const v = new Array(dim).fill(0);
    v[hotIndex] = 1.0;
    return v;
}

/** Reset the auto-increment ID counter (call in beforeEach). */
export function resetIdCounter() {
    idCounter = 0;
}

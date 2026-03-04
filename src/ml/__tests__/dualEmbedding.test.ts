import { describe, it, expect, beforeEach } from 'vitest';
import { findBestMatchDual } from '@/ml/dualEmbedding';
import {
    createMockCharacter,
    createMockEmbeddingsData,
    resetIdCounter,
} from './fixtures';

beforeEach(() => {
    resetIdCounter();
});

describe('findBestMatchDual', () => {
    it('combines CLIP (0.3) and ArcFace (0.7) scores', () => {
        // charA: high ArcFace, low CLIP → should win with dual
        const charA = createMockCharacter({
            embedding: [0.3, 0.0, 0.0],        // CLIP embedding
            arcface_embedding: [1.0, 0.0, 0.0], // ArcFace embedding (strong match)
            orientation: 'male',
            tier: 2,
        });
        // charB: high CLIP, low ArcFace
        const charB = createMockCharacter({
            embedding: [1.0, 0.0, 0.0],        // CLIP embedding (strong match)
            arcface_embedding: [0.0, 1.0, 0.0], // ArcFace embedding (weak match)
            orientation: 'male',
            tier: 2,
        });
        const data = createMockEmbeddingsData([charA, charB]);

        const clipEmb = [0.5, 0.0, 0.0];     // somewhat close to charB CLIP
        const arcfaceEmb = [1.0, 0.0, 0.0];  // very close to charA ArcFace

        const result = findBestMatchDual(clipEmb, arcfaceEmb, 'male', data, true);

        // charA score: 0.3 * (0.5*0.3) + 0.7 * (1.0*1.0) = 0.045 + 0.7 = 0.745
        // charB score: 0.3 * (0.5*1.0) + 0.7 * (1.0*0.0) = 0.15 + 0.0 = 0.15
        expect(result.character.heroine_id).toBe(charA.heroine_id);
    });

    it('falls back to CLIP-only when arcface_embedding is null', () => {
        const charA = createMockCharacter({
            embedding: [0.9, 0.1, 0.0],
            // no arcface_embedding
            orientation: 'male',
            tier: 2,
        });
        const charB = createMockCharacter({
            embedding: [0.1, 0.9, 0.0],
            // no arcface_embedding
            orientation: 'male',
            tier: 2,
        });
        const data = createMockEmbeddingsData([charA, charB]);

        const result = findBestMatchDual(
            [0.9, 0.1, 0.0],  // CLIP
            [1.0, 0.0, 0.0],  // ArcFace (should be ignored since chars have no arcface_embedding)
            'male',
            data,
            true,
        );

        // Without ArcFace embeddings on characters, it should match based on CLIP only
        expect(result.character.heroine_id).toBe(charA.heroine_id);
    });

    it('falls back to CLIP-only when arcfaceEmbedding param is null', () => {
        const charA = createMockCharacter({
            embedding: [0.9, 0.1, 0.0],
            arcface_embedding: [1.0, 0.0, 0.0],
            orientation: 'male',
        });
        const charB = createMockCharacter({
            embedding: [0.1, 0.9, 0.0],
            arcface_embedding: [0.0, 1.0, 0.0],
            orientation: 'male',
        });
        const data = createMockEmbeddingsData([charA, charB]);

        const result = findBestMatchDual(
            [0.9, 0.1, 0.0],
            null, // no ArcFace from user
            'male',
            data,
        );

        expect(result.character.heroine_id).toBe(charA.heroine_id);
    });

    it('custom config overrides default CLIP/ArcFace weights', () => {
        // charA has better ArcFace match, charB has better CLIP match
        const charA = createMockCharacter({
            embedding: [0.1, 0.0, 0.0],
            arcface_embedding: [1.0, 0.0, 0.0],
            orientation: 'male',
            tier: 2,
        });
        const charB = createMockCharacter({
            embedding: [1.0, 0.0, 0.0],
            arcface_embedding: [0.0, 0.0, 1.0],
            orientation: 'male',
            tier: 2,
        });
        const data = createMockEmbeddingsData([charA, charB]);

        // Override: heavily favor CLIP (0.9) over ArcFace (0.1)
        const config = { clipWeight: 0.9, arcfaceWeight: 0.1 };
        const result = findBestMatchDual(
            [1.0, 0.0, 0.0],
            [1.0, 0.0, 0.0],
            'male',
            data,
            true,
            config,
        );

        // With CLIP-heavy weighting, charB (CLIP=1.0) should win
        expect(result.character.heroine_id).toBe(charB.heroine_id);
    });

    it('returns proper confidence and topN structure', () => {
        const chars = Array.from({ length: 5 }, (_, i) =>
            createMockCharacter({
                embedding: [i === 0 ? 1.0 : 0.0, i === 1 ? 1.0 : 0.0, i === 2 ? 1.0 : 0.0],
                arcface_embedding: [i === 0 ? 1.0 : 0.0, i === 1 ? 1.0 : 0.0, i === 2 ? 1.0 : 0.0],
                orientation: 'male',
            }),
        );
        const data = createMockEmbeddingsData(chars);

        const result = findBestMatchDual(
            [1.0, 0.0, 0.0],
            [1.0, 0.0, 0.0],
            'male',
            data,
        );

        expect(result.topN).toHaveLength(3);
        expect(result.score).toBeGreaterThan(0);
        expect(['high', 'medium', 'low']).toContain(result.confidence);
        expect(result.percent).toBeGreaterThanOrEqual(50);
        expect(result.percent).toBeLessThanOrEqual(97);
    });
});

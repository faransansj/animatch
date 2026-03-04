import { describe, it, expect, beforeEach } from 'vitest';
import {
    cosineSimilarity,
    similarityToPercent,
    findBestMatch,
    getRandomMatch,
} from '@/ml/matching';
import {
    createMockCharacter,
    createMockEmbeddingsData,
    createUnitVector,
    resetIdCounter,
} from './fixtures';

beforeEach(() => {
    resetIdCounter();
});

// ── cosineSimilarity ──────────────────────────────────────────────────────────

describe('cosineSimilarity', () => {
    it('returns 1.0 for identical unit vectors', () => {
        const v = [0.6, 0.8]; // already unit-length
        expect(cosineSimilarity(v, v)).toBeCloseTo(1.0, 5);
    });

    it('returns 0.0 for orthogonal vectors', () => {
        const a = [1, 0, 0];
        const b = [0, 1, 0];
        expect(cosineSimilarity(a, b)).toBeCloseTo(0.0, 5);
    });

    it('computes correct dot product for known values', () => {
        const a = [1, 2, 3];
        const b = [4, 5, 6];
        // dot = 1*4 + 2*5 + 3*6 = 32
        expect(cosineSimilarity(a, b)).toBe(32);
    });

    it('returns negative for opposing vectors', () => {
        const a = [1, 0];
        const b = [-1, 0];
        expect(cosineSimilarity(a, b)).toBe(-1);
    });
});

// ── similarityToPercent ───────────────────────────────────────────────────────

describe('similarityToPercent', () => {
    const spreadThresh = 0.05;

    it('returns value in 50-97 range when face is detected', () => {
        const sims = [0.95, 0.90, 0.85, 0.80];
        const result = similarityToPercent(0.95, sims, spreadThresh, true);
        expect(result).toBeGreaterThanOrEqual(50);
        expect(result).toBeLessThanOrEqual(97);
    });

    it('caps at 78% when no face is detected', () => {
        const sims = [0.95, 0.90, 0.85, 0.80];
        const result = similarityToPercent(0.95, sims, spreadThresh, false);
        expect(result).toBeGreaterThanOrEqual(50);
        expect(result).toBeLessThanOrEqual(78);
    });

    it('returns stable output when spread is near-zero', () => {
        // All candidates have essentially the same score
        const sims = [0.50001, 0.50000, 0.49999];
        const result = similarityToPercent(0.50001, sims, spreadThresh, true);
        expect(result).toBeGreaterThanOrEqual(50);
        expect(result).toBeLessThanOrEqual(97);
        expect(Number.isFinite(result)).toBe(true);
    });

    it('gives best candidate a higher percent than worst candidate', () => {
        const sims = [0.95, 0.90, 0.85, 0.80];
        const best = similarityToPercent(0.95, sims, spreadThresh, true);
        const worst = similarityToPercent(0.80, sims, spreadThresh, true);
        expect(best).toBeGreaterThan(worst);
    });

    it('face detected gives higher percent than no face for same input', () => {
        const sims = [0.95, 0.90, 0.85, 0.80];
        const withFace = similarityToPercent(0.95, sims, spreadThresh, true);
        const noFace = similarityToPercent(0.95, sims, spreadThresh, false);
        expect(withFace).toBeGreaterThan(noFace);
    });
});

// ── findBestMatch ─────────────────────────────────────────────────────────────

describe('findBestMatch', () => {
    it('returns the character with highest similarity', () => {
        const dim = 4;
        // User embedding similar to char A
        const userEmb = [0.9, 0.1, 0.0, 0.0];

        const charA = createMockCharacter({
            embedding: [0.95, 0.05, 0.0, 0.0],
            orientation: 'male',
            tier: 2,
        });
        const charB = createMockCharacter({
            embedding: [0.0, 0.0, 0.9, 0.1],
            orientation: 'male',
            tier: 2,
        });
        const charC = createMockCharacter({
            embedding: [0.1, 0.8, 0.1, 0.0],
            orientation: 'male',
            tier: 2,
        });
        const data = createMockEmbeddingsData([charA, charB, charC]);

        const result = findBestMatch(userEmb, 'male', data, true);
        expect(result.character.heroine_id).toBe(charA.heroine_id);
    });

    it('filters by orientation', () => {
        const charMale = createMockCharacter({
            embedding: [1, 0, 0],
            orientation: 'male',
        });
        const charFemale = createMockCharacter({
            embedding: [1, 0, 0],
            orientation: 'female',
        });
        const data = createMockEmbeddingsData([charMale, charFemale]);

        const result = findBestMatch([1, 0, 0], 'female', data, true);
        expect(result.character.orientation).toBe('female');
        expect(result.character.heroine_id).toBe(charFemale.heroine_id);
    });

    it('returns top 3 candidates in topN', () => {
        const chars = Array.from({ length: 5 }, (_, i) =>
            createMockCharacter({
                embedding: createUnitVector(4, i % 4),
                orientation: 'male',
            }),
        );
        const data = createMockEmbeddingsData(chars);

        const result = findBestMatch(createUnitVector(4, 0), 'male', data, true);
        expect(result.topN).toHaveLength(3);
    });

    it('assigns high confidence when gap > 0.02', () => {
        // Create characters where the top match is far from the rest
        const charBest = createMockCharacter({
            embedding: [1, 0, 0, 0],
            orientation: 'male',
            tier: 2,
        });
        const charWorse = createMockCharacter({
            embedding: [0, 0, 0, 1],
            orientation: 'male',
            tier: 2,
        });
        const data = createMockEmbeddingsData([charBest, charWorse]);

        const result = findBestMatch([1, 0, 0, 0], 'male', data, true);
        expect(result.confidence).toBe('high');
    });

    it('assigns low confidence when gap is tiny', () => {
        // Two nearly identical characters
        const charA = createMockCharacter({
            embedding: [0.5, 0.5, 0.0],
            orientation: 'male',
            tier: 2,
        });
        const charB = createMockCharacter({
            embedding: [0.501, 0.499, 0.0],
            orientation: 'male',
            tier: 2,
        });
        const data = createMockEmbeddingsData([charA, charB]);

        const result = findBestMatch([0.5, 0.5, 0.0], 'male', data, true);
        expect(result.confidence).toBe('low');
    });

    it('tier weighting can change the winner', () => {
        // charA has slightly lower raw similarity but higher tier
        const charA = createMockCharacter({
            embedding: [0.9, 0.1, 0.0],
            orientation: 'male',
            tier: 1, // tier 1 gets 1.02x weight
        });
        const charB = createMockCharacter({
            embedding: [0.91, 0.09, 0.0],
            orientation: 'male',
            tier: 3, // tier 3 gets 0.98x weight
        });
        const data = createMockEmbeddingsData([charA, charB]);

        // With heavy tier weighting: tier1=1.10, tier3=0.90
        const config = { tierWeights: { 1: 1.10, 2: 1.0, 3: 0.90 } };
        const result = findBestMatch([0.9, 0.1, 0.0], 'male', data, true, config);
        expect(result.character.heroine_id).toBe(charA.heroine_id);
    });
});

// ── getRandomMatch ────────────────────────────────────────────────────────────

describe('getRandomMatch', () => {
    it('returns 3 candidates', () => {
        const chars = Array.from({ length: 10 }, (_, i) =>
            createMockCharacter({
                embedding: createUnitVector(4, i % 4),
                orientation: 'male',
            }),
        );
        const data = createMockEmbeddingsData(chars);

        const result = getRandomMatch('male', data);
        expect(result.topN).toHaveLength(3);
    });

    it('has percent values between 50 and 80', () => {
        const chars = Array.from({ length: 10 }, (_, i) =>
            createMockCharacter({
                embedding: createUnitVector(4, i % 4),
                orientation: 'male',
            }),
        );
        const data = createMockEmbeddingsData(chars);

        const result = getRandomMatch('male', data);
        for (const candidate of result.topN) {
            expect(candidate.percent).toBeGreaterThanOrEqual(50);
            expect(candidate.percent).toBeLessThanOrEqual(80);
        }
    });

    it('always returns low confidence', () => {
        const chars = Array.from({ length: 5 }, (_, i) =>
            createMockCharacter({
                embedding: createUnitVector(4, i % 4),
                orientation: 'male',
            }),
        );
        const data = createMockEmbeddingsData(chars);

        const result = getRandomMatch('male', data);
        expect(result.confidence).toBe('low');
        expect(result.score).toBe(0);
    });

    it('percents are in descending order', () => {
        const chars = Array.from({ length: 10 }, (_, i) =>
            createMockCharacter({
                embedding: createUnitVector(4, i % 4),
                orientation: 'male',
            }),
        );
        const data = createMockEmbeddingsData(chars);

        const result = getRandomMatch('male', data);
        expect(result.topN[0]!.percent).toBeGreaterThanOrEqual(result.topN[1]!.percent);
        expect(result.topN[1]!.percent).toBeGreaterThanOrEqual(result.topN[2]!.percent);
    });
});

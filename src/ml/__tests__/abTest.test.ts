import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    getVariant,
    getVariantConfig,
    getActiveExperimentId,
    getActiveVariantLabel,
} from '@/ml/abTest';

// ── Mock localStorage ─────────────────────────────────────────────────────────

const storageMap = new Map<string, string>();

beforeEach(() => {
    storageMap.clear();
    vi.restoreAllMocks();

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
        (key: string) => storageMap.get(key) ?? null,
    );
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(
        (key: string, value: string) => { storageMap.set(key, value); },
    );
});

// ── getActiveExperimentId ─────────────────────────────────────────────────────

describe('getActiveExperimentId', () => {
    it('returns the active experiment ID', () => {
        const id = getActiveExperimentId();
        expect(id).toBe('matching-weights-v2');
    });
});

// ── getVariant ────────────────────────────────────────────────────────────────

describe('getVariant', () => {
    it('returns "control" for an unknown experiment ID', () => {
        expect(getVariant('nonexistent-experiment')).toBe('control');
    });

    it('assigns a variant and persists to localStorage', () => {
        const experimentId = 'matching-weights-v2';
        const variant = getVariant(experimentId);

        // Should be one of the valid variant names
        expect(['control', 'variant_a_arcface_heavier', 'variant_b_clip_heavier']).toContain(variant);

        // Should be stored in localStorage
        const stored = storageMap.get(`ab_variant_${experimentId}`);
        expect(stored).toBe(variant);
    });

    it('returns the same variant on subsequent calls (sticky assignment)', () => {
        const experimentId = 'matching-weights-v2';
        const first = getVariant(experimentId);
        const second = getVariant(experimentId);
        expect(second).toBe(first);
    });

    it('returns stored variant from localStorage', () => {
        const experimentId = 'matching-weights-v2';
        storageMap.set(`ab_variant_${experimentId}`, 'variant_b_clip_heavier');

        expect(getVariant(experimentId)).toBe('variant_b_clip_heavier');
    });

    it('re-assigns if stored variant is not in current experiment', () => {
        const experimentId = 'matching-weights-v2';
        storageMap.set(`ab_variant_${experimentId}`, 'deleted_variant');

        // Should not return the invalid stored variant
        const variant = getVariant(experimentId);
        expect(variant).not.toBe('deleted_variant');
        expect(['control', 'variant_a_arcface_heavier', 'variant_b_clip_heavier']).toContain(variant);
    });

    it('respects weights for assignment distribution', () => {
        const experimentId = 'matching-weights-v2';

        // Mock Math.random to return 0.0 (first bucket: control, weight 0.34)
        vi.spyOn(Math, 'random').mockReturnValue(0.0);
        storageMap.clear();
        const v1 = getVariant(experimentId);
        expect(v1).toBe('control');

        // Mock Math.random to return 0.5 (second bucket: variant_a, cumulative 0.34+0.33=0.67)
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        storageMap.clear();
        const v2 = getVariant(experimentId);
        expect(v2).toBe('variant_a_arcface_heavier');

        // Mock Math.random to return 0.99 (third bucket: variant_b, cumulative 1.0)
        vi.spyOn(Math, 'random').mockReturnValue(0.99);
        storageMap.clear();
        const v3 = getVariant(experimentId);
        expect(v3).toBe('variant_b_clip_heavier');
    });
});

// ── getVariantConfig ──────────────────────────────────────────────────────────

describe('getVariantConfig', () => {
    it('returns undefined for unknown experiment', () => {
        expect(getVariantConfig('nonexistent')).toBeUndefined();
    });

    it('returns config matching the assigned variant', () => {
        const experimentId = 'matching-weights-v2';
        storageMap.set(`ab_variant_${experimentId}`, 'variant_a_arcface_heavier');

        const config = getVariantConfig(experimentId);
        expect(config).toBeDefined();
        expect(config!.clipWeight).toBe(0.1);
        expect(config!.arcfaceWeight).toBe(0.9);
    });
});

// ── getActiveVariantLabel ─────────────────────────────────────────────────────

describe('getActiveVariantLabel', () => {
    it('returns formatted label "experimentId:variant"', () => {
        const experimentId = 'matching-weights-v2';
        storageMap.set(`ab_variant_${experimentId}`, 'control');

        const label = getActiveVariantLabel();
        expect(label).toBe('matching-weights-v2:control');
    });
});

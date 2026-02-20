import type { EmbeddingsData } from '@/types/character';
import type { MatchResult, MatchCandidate, Confidence } from '@/types/match';
import type { Orientation } from '@/types/common';
import type { VariantConfig } from './abTest';

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i]! * b[i]!;
  return dot;
}

/**
 * Spread-aware percent calculation.
 *
 * Instead of min-max normalizing into a narrow 75-98% band (which makes
 * every input—including non-faces—look like a 90%+ match), we use the
 * **spread** of raw similarities to gauge match quality:
 *
 *  - Large spread → the model clearly prefers one character → higher %
 *  - Small spread → all characters scored similarly → lower %
 *
 * The spread thresholds were derived empirically:
 *  - CLIP-only spread for face inputs:    ~0.02–0.06
 *  - CLIP-only spread for non-face inputs: ~0.005–0.015
 *  - Dual (0.3 CLIP + 0.7 ArcFace) spread for faces: ~0.08–0.25
 *  - Dual spread for non-faces: ~0.02–0.05
 *
 * @param rawSim       cosine similarity of this candidate
 * @param allRawSims   sorted desc array of all candidate similarities
 * @param spreadThresh spread value at which we consider quality "good" (default 0.05 for CLIP-only)
 * @param hasFace      whether BlazeFace detected a face in the input
 */
export function similarityToPercent(
  rawSim: number,
  allRawSims: number[],
  spreadThresh: number,
  hasFace: boolean,
): number {
  const best = allRawSims[0]!;
  const worst = allRawSims[allRawSims.length - 1]!;
  const spread = best - worst;

  // 1. Relative position within candidates (0 → worst, 1 → best)
  const relPos = spread > 0.0001 ? (rawSim - worst) / spread : 0.5;

  // 2. Spread quality factor (0 → indistinguishable, 1 → clear winner)
  const spreadQuality = Math.min(spread / spreadThresh, 1.0);

  // 3. Face detection bonus
  const faceBonus = hasFace ? 0.12 : 0;

  // 4. Blend: relative position scaled by spread quality + face bonus
  const score = relPos * (0.35 + 0.40 * spreadQuality) + faceBonus;

  // Map to 50–97% range
  return Math.min(97, Math.max(50, Math.round(50 + score * 47)));
}

// Spread threshold for CLIP-only matching
const CLIP_SPREAD_THRESH = 0.05;

export function findBestMatch(
  userEmbedding: number[],
  orientation: Orientation,
  embeddingsData: EmbeddingsData,
  hasFace = true,
  config?: Partial<VariantConfig>,
): MatchResult {
  const candidates = embeddingsData.characters.filter(c => c.orientation === orientation);

  const tierWeight = config?.tierWeights ?? { 1: 1.02, 2: 1.0, 3: 0.98 };
  const spreadThresh = config?.spreadThresh ?? CLIP_SPREAD_THRESH;

  const scored = candidates.map(c => {
    const raw = cosineSimilarity(userEmbedding, c.embedding);
    const weight = tierWeight[c.tier] ?? 1.0;
    return {
      character: c,
      similarity: raw,
      weightedScore: raw * weight,
    };
  });

  scored.sort((a, b) => b.weightedScore - a.weightedScore);

  const allRawSims = scored.map(s => s.similarity);

  const top3: MatchCandidate[] = scored.slice(0, 3).map(s => ({
    character: s.character,
    similarity: s.similarity,
    percent: similarityToPercent(s.similarity, allRawSims, spreadThresh, hasFace),
  }));

  const gap = scored.length > 1 ? scored[0]!.weightedScore - scored[1]!.weightedScore : 1;
  let confidence: Confidence = 'low';
  if (gap > 0.02) confidence = 'high';
  else if (gap > 0.008) confidence = 'medium';

  return {
    character: top3[0]!.character,
    score: top3[0]!.similarity,
    percent: top3[0]!.percent,
    confidence,
    topN: top3,
  };
}

export function getRandomMatch(
  orientation: Orientation,
  embeddingsData: EmbeddingsData,
): MatchResult {
  const candidates = embeddingsData.characters.filter(c => c.orientation === orientation);
  const randomChar = candidates[Math.floor(Math.random() * candidates.length)]!;
  const percent = Math.round(55 + Math.random() * 25);

  return {
    character: randomChar,
    score: 0,
    percent,
    confidence: 'low',
    topN: [{ character: randomChar, similarity: 0, percent }],
  };
}

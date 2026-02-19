import type { EmbeddingsData } from '@/types/character';
import type { MatchResult, MatchCandidate, Confidence } from '@/types/match';
import type { Orientation } from '@/types/common';
import { cosineSimilarity, similarityToPercent } from './matching';

// ArcFace differentiates faces far better than CLIP (std 0.139 vs 0.049).
// Weight ArcFace heavily when available.
const ALPHA = 0.3; // CLIP weight
const BETA = 0.7;  // ArcFace weight

// Dual matching produces much larger spreads thanks to ArcFace's
// superior face discrimination (typical spread 0.08–0.25 for real faces).
const DUAL_SPREAD_THRESH = 0.15;

export function findBestMatchDual(
  clipEmbedding: number[],
  arcfaceEmbedding: number[] | null,
  orientation: Orientation,
  embeddingsData: EmbeddingsData,
  hasFace = true,
): MatchResult {
  const candidates = embeddingsData.characters.filter(c => c.orientation === orientation);

  const tierWeight: Record<number, number> = { 1: 1.02, 2: 1.0, 3: 0.98 };

  const scored = candidates.map(c => {
    const clipSim = cosineSimilarity(clipEmbedding, c.embedding);

    let arcfaceSim = 0;
    let useDual = false;
    if (arcfaceEmbedding && c.arcface_embedding) {
      arcfaceSim = cosineSimilarity(arcfaceEmbedding, c.arcface_embedding);
      useDual = true;
    }

    const combinedScore = useDual
      ? ALPHA * clipSim + BETA * arcfaceSim
      : clipSim;

    const weight = tierWeight[c.tier] ?? 1.0;

    return {
      character: c,
      similarity: combinedScore,
      weightedScore: combinedScore * weight,
      clipSim,
      arcfaceSim,
      useDual,
    };
  });

  scored.sort((a, b) => b.weightedScore - a.weightedScore);

  // Use the appropriate spread threshold based on whether dual matching was used
  const anyDual = scored.some(s => s.useDual);
  const spreadThresh = anyDual ? DUAL_SPREAD_THRESH : 0.05;

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

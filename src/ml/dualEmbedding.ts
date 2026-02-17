import type { EmbeddingsData } from '@/types/character';
import type { MatchResult, MatchCandidate, Confidence } from '@/types/match';
import type { Orientation } from '@/types/common';
import { cosineSimilarity } from './matching';

const ALPHA = 0.6; // CLIP weight
const BETA = 0.4;  // ArcFace weight

export function findBestMatchDual(
  clipEmbedding: number[],
  arcfaceEmbedding: number[] | null,
  orientation: Orientation,
  embeddingsData: EmbeddingsData,
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
    };
  });

  scored.sort((a, b) => b.weightedScore - a.weightedScore);

  const min = scored[scored.length - 1]!.similarity;
  const max = scored[0]!.similarity;
  const range = max - min;

  const top3: MatchCandidate[] = scored.slice(0, 3).map(s => {
    const normalized = range > 0.001 ? (s.similarity - min) / range : 1;
    return {
      character: s.character,
      similarity: s.similarity,
      percent: Math.round(75 + normalized * 23),
    };
  });

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

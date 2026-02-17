import type { EmbeddingsData, CharacterEmbedding } from '@/types/character';
import type { MatchResult, MatchCandidate, Confidence } from '@/types/match';
import type { Orientation } from '@/types/common';

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i]! * b[i]!;
  return dot;
}

export function findBestMatch(
  userEmbedding: number[],
  orientation: Orientation,
  embeddingsData: EmbeddingsData,
): MatchResult {
  const candidates = embeddingsData.characters.filter(c => c.orientation === orientation);

  const tierWeight: Record<number, number> = { 1: 1.02, 2: 1.0, 3: 0.98 };

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

export function getRandomMatch(
  orientation: Orientation,
  embeddingsData: EmbeddingsData,
): MatchResult {
  const candidates = embeddingsData.characters.filter(c => c.orientation === orientation);
  const randomChar = candidates[Math.floor(Math.random() * candidates.length)]!;
  const percent = Math.round(75 + Math.random() * 20);

  return {
    character: randomChar,
    score: 0,
    percent,
    confidence: 'low',
    topN: [{ character: randomChar, similarity: 0, percent }],
  };
}

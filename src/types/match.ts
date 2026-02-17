import type { CharacterEmbedding } from './character';

export type Confidence = 'high' | 'medium' | 'low';

export interface MatchCandidate {
  character: CharacterEmbedding;
  similarity: number;
  percent: number;
}

export interface MatchResult {
  character: CharacterEmbedding;
  score: number;
  percent: number;
  confidence: Confidence;
  topN: MatchCandidate[];
}

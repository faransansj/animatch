import type { MatchResult } from '@/types/match';

interface AnalyticsPayload {
  orientation: string;
  matched_character: string;
  matched_anime: string;
  similarity_score: number;
  confidence: string;
  dual_matching: boolean;
  language: string;
}

export function logMatchResult(
  result: MatchResult,
  orientation: string,
  language: string,
  dualMatching: boolean,
): void {
  const payload: AnalyticsPayload = {
    orientation,
    matched_character: result.character.heroine_name,
    matched_anime: result.character.anime,
    similarity_score: result.score,
    confidence: result.confidence,
    dual_matching: dualMatching,
    language,
  };

  // Fire-and-forget: analytics is non-critical
  fetch('/api/analytics/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {
    // Silently ignore analytics failures
  });
}

export function getTarotImageUrl(heroineId: number): string {
  // Use the assets proxy endpoint
  return `/assets/images/tarot/${heroineId}.webp`;
}

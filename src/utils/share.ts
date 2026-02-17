import type { CharacterEmbedding } from '@/types/character';

export function shareToX(char: CharacterEmbedding, percent: number, lang: string) {
  const isKo = lang === 'ko';
  const text = isKo
    ? `AniMatch에서 나의 애니 연인을 찾았어요! 💕\n나의 애니 연인은 "${char.heroine_name}" (${char.anime})\n매칭도: ${percent}%\n\n당신도 찾아보세요! 👉`
    : `I found my anime partner on AniMatch! 💕\nMy anime partner is "${char.heroine_name_en}" (${char.anime_en})\nMatch: ${percent}%\n\nTry it yourself! 👉`;
  const url = encodeURIComponent(window.location.origin);
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${url}`, '_blank');
}

export function shareToBluesky(char: CharacterEmbedding, percent: number, lang: string) {
  const isKo = lang === 'ko';
  const text = isKo
    ? `AniMatch에서 나의 애니 연인을 찾았어요! 💕 나의 애니 연인은 "${char.heroine_name}" (${char.anime}) 매칭도: ${percent}%`
    : `I found my anime partner on AniMatch! 💕 My anime partner is "${char.heroine_name_en}" (${char.anime_en}) Match: ${percent}%`;
  window.open(`https://bsky.app/intent/compose?text=${encodeURIComponent(text)}`, '_blank');
}

export function copyLink(onSuccess: () => void) {
  navigator.clipboard.writeText(window.location.origin).then(onSuccess);
}

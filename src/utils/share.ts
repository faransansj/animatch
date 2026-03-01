import type { CharacterEmbedding } from '@/types/character';
import { getLocalizedChar } from './localize';

function getShareUrl(heroineId: number): string {
  return `${window.location.origin}?match=${heroineId}`;
}

export function shareToX(char: CharacterEmbedding, percent: number, lang: string) {
  const { name, anime } = getLocalizedChar(char, lang);
  const isKo = lang.startsWith('ko');
  const isJa = lang.startsWith('ja');
  const isZh = lang.startsWith('zh');

  let text = '';
  if (isKo) {
    text = `AniMatch에서 나의 애니 연인을 찾았어요! 💕\n나의 애니 연인은 "${name}" (${anime})\n매칭도: ${percent}%\n\n당신도 찾아보세요! 👉`;
  } else if (isJa) {
    text = `AniMatchで私のアニメの恋人を見つけました！💕\n私のアニメの恋人は「${name}」（${anime}）\nシンクロ率：${percent}%\n\nあなたも探してみてください 👉`;
  } else if (isZh) {
    text = `在 AniMatch 找到了我的動漫戀人！💕\n我的動漫戀人是「${name}」（${anime}）\n匹配度：${percent}%\n\n你也來試試吧 👉`;
  } else {
    text = `I found my anime partner on AniMatch! 💕\nMy anime partner is "${name}" (${anime})\nMatch: ${percent}%\n\nTry it yourself! 👉`;
  }

  const url = encodeURIComponent(getShareUrl(char.heroine_id));
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${url}`, '_blank');
}

export function shareToBluesky(char: CharacterEmbedding, percent: number, lang: string) {
  const shareUrl = getShareUrl(char.heroine_id);
  const { name, anime } = getLocalizedChar(char, lang);
  const isKo = lang.startsWith('ko');
  const isJa = lang.startsWith('ja');
  const isZh = lang.startsWith('zh');

  let text = '';
  if (isKo) {
    text = `AniMatch에서 나의 애니 연인을 찾았어요! 💕 나의 애니 연인은 "${name}" (${anime}) 매칭도: ${percent}% ${shareUrl}`;
  } else if (isJa) {
    text = `AniMatchで私のアニメの恋人を見つけました！💕 私のアニメの恋人は「${name}」（${anime}） シンクロ率：${percent}% ${shareUrl}`;
  } else if (isZh) {
    text = `在 AniMatch 找到了我的動漫戀人！💕 我的動漫戀人是「${name}」（${anime}） 匹配度：${percent}% ${shareUrl}`;
  } else {
    text = `I found my anime partner on AniMatch! 💕 My anime partner is "${name}" (${anime}) Match: ${percent}% ${shareUrl}`;
  }

  window.open(`https://bsky.app/intent/compose?text=${encodeURIComponent(text)}`, '_blank');
}

export function copyLink(heroineId: number, onSuccess: () => void) {
  navigator.clipboard.writeText(getShareUrl(heroineId)).then(onSuccess);
}


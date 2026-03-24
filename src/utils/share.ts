import type { CharacterEmbedding } from '@/types/character';
import { getLocalizedChar } from './localize';

function getShareUrl(heroineId: number, percent?: number): string {
  const url = new URL(window.location.origin);
  url.searchParams.set('match', heroineId.toString());
  if (percent !== undefined) url.searchParams.set('p', percent.toString());
  return url.toString();
}

export function shareToX(char: CharacterEmbedding, percent: number, lang: string) {
  const { name, anime } = getLocalizedChar(char, lang);
  const isKo = lang.startsWith('ko');
  const isJa = lang.startsWith('ja');
  const isZh = lang.startsWith('zh');

  let text = '';
  const shareUrl = getShareUrl(char.heroine_id, percent);
  
  if (isKo) {
    text = `AniMatch에서 나의 애니 연인을 찾았어요! 💕\n나의 애니 연인은 "${name}" (${anime})\n매칭도: ${percent}%\n\n지금 바로 테스트해보세요! 👉`;
  } else if (isJa) {
    text = `AniMatchで私のアニメの恋人を見つけました！💕\n私のアニメの恋人は「${name}」（${anime}）\nシンクロ率：${percent}%\n\n今すぐテストしてみて！ 👉`;
  } else if (isZh) {
    text = `我在 AniMatch 找到了命中注定的動漫戀人！ 💕\n我的動漫戀人是「${name}」(${anime})\n契合度: ${percent}%\n\n現在就來測試看看吧！ 👉`;
  } else {
    text = `I found my anime partner on AniMatch! 💕\nMy anime partner is "${name}" (${anime})\nMatch: ${percent}%\n\nTry it now! 👉`;
  }

  const encodedUrl = encodeURIComponent(shareUrl);
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodedUrl}`, '_blank');
}

export function shareToBluesky(char: CharacterEmbedding, percent: number, lang: string) {
  const shareUrl = getShareUrl(char.heroine_id, percent);
  const { name, anime } = getLocalizedChar(char, lang);
  const isKo = lang.startsWith('ko');
  const isJa = lang.startsWith('ja');
  const isZh = lang.startsWith('zh');

  let text = '';
  if (isKo) {
    text = `운명의 애니 연인은 "${name}" (${anime})! ${percent}% 일치! 💕 지금 테스트하기 👉 ${shareUrl}`;
  } else if (isJa) {
    text = `運命のアニメキャラは「${name}」！ ${percent}% 一致！ 💕 今すぐ診断 👉 ${shareUrl}`;
  } else if (isZh) {
    text = `命中注定的動漫戀人是「${name}」！${percent}% 契合！ 💕 現在就測 👉 ${shareUrl}`;
  } else {
    text = `My anime partner is "${name}" (${anime})! ${percent}% Match! 💕 Try it now 👉 ${shareUrl}`;
  }

  window.open(`https://bsky.app/intent/compose?text=${encodeURIComponent(text)}`, '_blank');
}

declare global {
  interface Window {
    Kakao: any;
  }
}

const KAKAO_KEY = import.meta.env.VITE_KAKAO_APP_KEY;

export function shareToKakao(char: CharacterEmbedding, percent: number, lang: string) {
  if (typeof window === 'undefined' || !window.Kakao) return;

  if (!window.Kakao.isInitialized() && KAKAO_KEY) {
    window.Kakao.init(KAKAO_KEY);
  }

  const { name, anime } = getLocalizedChar(char, lang);
  const shareUrl = getShareUrl(char.heroine_id, percent);
  const isKo = lang.startsWith('ko');

  let text = isKo
    ? `나의 애니 연인은 "${name}" (${anime})! 매칭도: ${percent}%`
    : `My anime partner is "${name}" (${anime})! Match: ${percent}%`;

  window.Kakao.Share.sendDefault({
    objectType: 'feed',
    content: {
      title: isKo ? 'AniMatch - 나의 애니 연인 찾기' : 'AniMatch - Find Your Anime Partner',
      description: text,
      imageUrl: char.heroine_image || `https://animatch.midori-lab.com/api/og/${char.heroine_id}`,
      link: {
        mobileWebUrl: shareUrl,
        webUrl: shareUrl,
      },
    },
    buttons: [
      {
        title: isKo ? '지금 테스트하기' : 'Try It Now',
        link: {
          mobileWebUrl: shareUrl,
          webUrl: shareUrl,
        },
      },
    ],
  });
}

export function copyLink(heroineId: number, percent?: number, onSuccess?: () => void) {
  navigator.clipboard.writeText(getShareUrl(heroineId, percent)).then(onSuccess);
}


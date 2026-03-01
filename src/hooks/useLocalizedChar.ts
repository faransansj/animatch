import { useTranslation } from 'react-i18next';
import type { CharacterEmbedding } from '@/types/character';

export function useLocalizedChar(char: CharacterEmbedding) {
  const { i18n } = useTranslation();

  const lang = i18n.language || 'en';
  const isJa = lang.startsWith('ja');
  const isZh = lang.startsWith('zh');
  const isKo = lang.startsWith('ko');

  return {
    name: isJa && char.heroine_name_ja ? char.heroine_name_ja :
      isZh && char.heroine_name_zh_tw ? char.heroine_name_zh_tw :
        isKo ? char.heroine_name : char.heroine_name_en,

    anime: isJa && char.anime_ja ? char.anime_ja :
      isZh && char.anime_zh_tw ? char.anime_zh_tw :
        isKo && char.anime ? char.anime : char.anime_en,

    tags: isJa && char.heroine_tags_ja ? char.heroine_tags_ja :
      isZh && char.heroine_tags_zh_tw ? char.heroine_tags_zh_tw :
        isKo ? char.heroine_tags : char.heroine_tags_en,

    personality: isJa && char.heroine_personality_ja ? char.heroine_personality_ja :
      isZh && char.heroine_personality_zh_tw ? char.heroine_personality_zh_tw :
        isKo ? char.heroine_personality : char.heroine_personality_en,

    charm: isJa && char.heroine_charm_ja ? char.heroine_charm_ja :
      isZh && char.heroine_charm_zh_tw ? char.heroine_charm_zh_tw :
        isKo ? char.heroine_charm : char.heroine_charm_en,

    genre: isJa && char.genre_ja ? char.genre_ja :
      isZh && char.genre_zh_tw ? char.genre_zh_tw :
        isKo ? char.genre : char.genre_en,
  };
}

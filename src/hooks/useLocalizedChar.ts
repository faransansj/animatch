import { useTranslation } from 'react-i18next';
import type { CharacterEmbedding } from '@/types/character';
import { getLocalizedChar } from '@/utils/localize';

export function useLocalizedChar(char: CharacterEmbedding) {
  const { i18n } = useTranslation();
  return getLocalizedChar(char, i18n.language || 'en');
}


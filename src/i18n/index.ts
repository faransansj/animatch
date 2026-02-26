import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import ko from './ko';
import en from './en';
import ja from './ja';
import zhTW from './zh-TW';
import { useAppStore } from '@/stores/appStore';
import type { Language } from '@/types/common';

export const getBaseLang = (lng: string): Language => {
  if (!lng) return 'en';
  if (lng.startsWith('ko')) return 'ko';
  if (lng.startsWith('ja')) return 'ja';
  if (lng.startsWith('zh')) return 'zh-TW';
  return 'en';
};

i18n.use(LanguageDetector).use(initReactI18next).init({
  resources: {
    ko: { translation: ko },
    en: { translation: en },
    ja: { translation: ja },
    'zh-TW': { translation: zhTW },
  },
  fallbackLng: 'ko',
  supportedLngs: ['ko', 'en', 'ja', 'zh-TW'],
  detection: {
    order: ['querystring', 'localStorage', 'navigator'],
    caches: ['localStorage'],
    lookupQuerystring: 'lang',
  },
  interpolation: {
    escapeValue: false,
  },
});

// Sync <html lang> attribute and zustand store with current language
const updateHtmlLang = (rawLng: string) => {
  const lng = getBaseLang(rawLng);
  if (lng === 'en') document.documentElement.lang = 'en';
  else if (lng === 'ja') document.documentElement.lang = 'ja';
  else if (lng === 'zh-TW') document.documentElement.lang = 'zh-Hant';
  else document.documentElement.lang = 'ko';

  // Sync the AppStore so that pages like the Gacha screen have the right language without needing a toggle click
  const currentStoreLang = useAppStore.getState().language;
  if (currentStoreLang !== lng) {
    useAppStore.getState().setLanguage(lng);
  }
};
updateHtmlLang(i18n.language);
i18n.on('languageChanged', updateHtmlLang);

export default i18n;

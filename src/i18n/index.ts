import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import ko from './ko';
import en from './en';
import ja from './ja';
import zhTW from './zh-TW';

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

// Sync <html lang> attribute with current language
const updateHtmlLang = (lng: string) => {
  if (lng === 'en') document.documentElement.lang = 'en';
  else if (lng === 'ja') document.documentElement.lang = 'ja';
  else if (lng === 'zh-TW') document.documentElement.lang = 'zh-Hant';
  else document.documentElement.lang = 'ko';
};
updateHtmlLang(i18n.language);
i18n.on('languageChanged', updateHtmlLang);

export default i18n;

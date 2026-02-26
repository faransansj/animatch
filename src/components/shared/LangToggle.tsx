import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/stores/appStore';
import styles from './LangToggle.module.css';

export default function LangToggle() {
  const { i18n } = useTranslation();
  const { language, setLanguage } = useAppStore();

  const toggle = (lang: 'ko' | 'en' | 'ja' | 'zh-TW') => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  return (
    <div className={styles.toggle}>
      <button
        className={`${styles.btn} ${language === 'ko' ? styles.active : ''}`}
        onClick={() => toggle('ko')}
      >
        한
      </button>
      <button
        className={`${styles.btn} ${language === 'en' ? styles.active : ''}`}
        onClick={() => toggle('en')}
      >
        EN
      </button>
      <button
        className={`${styles.btn} ${language === 'ja' ? styles.active : ''}`}
        onClick={() => toggle('ja')}
      >
        日本語
      </button>
      <button
        className={`${styles.btn} ${language === 'zh-TW' ? styles.active : ''}`}
        onClick={() => toggle('zh-TW')}
      >
        繁體
      </button>
    </div>
  );
}

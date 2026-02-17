import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/stores/appStore';
import styles from './Footer.module.css';

export default function Footer() {
  const { t } = useTranslation();
  const showToast = useAppStore(s => s.showToast);

  const handleLink = (e: React.MouseEvent) => {
    e.preventDefault();
    showToast(`📄 ${t('common.preparing')}`);
  };

  return (
    <footer className={styles.footer}>
      <p>
        {t('landing.footer')} ·{' '}
        <a href="#" className={styles.link} onClick={handleLink}>{t('common.privacy')}</a> ·{' '}
        <a href="#" className={styles.link} onClick={handleLink}>{t('common.disclaimer')}</a> ·{' '}
        <a href="#" className={styles.link} onClick={handleLink}>{t('common.terms')}</a>
      </p>
    </footer>
  );
}

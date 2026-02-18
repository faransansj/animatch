import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/stores/appStore';
import styles from './Footer.module.css';

export default function Footer() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const showToast = useAppStore(s => s.showToast);

  const handlePreparing = (e: React.MouseEvent) => {
    e.preventDefault();
    showToast(`📄 ${t('common.preparing')}`);
  };

  return (
    <footer className={styles.footer}>
      <p>
        {t('landing.footer')} ·{' '}
        <Link to="/privacy" className={styles.link}>{t('common.privacy')}</Link> ·{' '}
        <Link to="/terms" className={styles.link}>{t('common.terms')}</Link>
      </p>
    </footer>
  );
}

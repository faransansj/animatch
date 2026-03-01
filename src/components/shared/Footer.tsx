import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/stores/appStore';
import ChangelogModal from './ChangelogModal';
import styles from './Footer.module.css';

export default function Footer() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const showToast = useAppStore(s => s.showToast);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);

  const handlePreparing = (e: React.MouseEvent) => {
    e.preventDefault();
    showToast(`📄 ${t('common.preparing')}`);
  };

  return (
    <>
      <footer className={styles.footer}>
        <p>
          {t('landing.footer')} ·{' '}
          <Link to="/privacy" className={styles.link}>{t('common.privacy')}</Link> ·{' '}
          <Link to="/terms" className={styles.link}>{t('common.terms')}</Link> ·{' '}
          <button
            className={styles.versionBtn}
            onClick={() => setIsChangelogOpen(true)}
            aria-label="View Version History"
          >
            v1.2.0
          </button>
        </p>
      </footer>
      <ChangelogModal isOpen={isChangelogOpen} onClose={() => setIsChangelogOpen(false)} />
    </>
  );
}

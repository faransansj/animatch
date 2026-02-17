import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './Header.module.css';

interface HeaderProps {
  backTo?: string;
  backLabel?: string;
}

export default function Header({ backTo = '/', backLabel }: HeaderProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const label = backLabel ?? (backTo === '/' ? t('common.backToHome') : t('common.back'));

  return (
    <header className={styles.header}>
      <button className={styles.backBtn} onClick={() => navigate(backTo)}>
        {label}
      </button>
      <div className={styles.logoSmall}>🎌 AniMatch</div>
    </header>
  );
}

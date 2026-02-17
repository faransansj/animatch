import { useTranslation } from 'react-i18next';
import { useMLStore } from '@/stores/mlStore';
import styles from './ModelLoadingOverlay.module.css';

export default function ModelLoadingOverlay() {
  const { t } = useTranslation();
  const { clipReady, clipProgress, embeddingsData } = useMLStore();

  if (clipReady && embeddingsData) return null;

  const statusText = !embeddingsData
    ? t('model.loadingData')
    : clipProgress < 100
    ? t('model.loadingModel')
    : t('model.initializing');

  return (
    <div className={styles.overlay}>
      <div className={styles.content}>
        <div className={styles.icon}>🧠</div>
        <p className={styles.title}>{t('model.title')}</p>
        <div className={styles.bar}>
          <div className={styles.progress} style={{ width: `${clipProgress}%` }} />
        </div>
        <p className={styles.status}>{statusText}</p>
      </div>
    </div>
  );
}

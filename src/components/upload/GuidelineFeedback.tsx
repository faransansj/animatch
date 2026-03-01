import { useTranslation } from 'react-i18next';
import type { FeedbackItem } from '@/types/common';
import styles from './UploadScreen.module.css';

interface GuidelineFeedbackProps {
    feedbackItems: FeedbackItem[];
    hasCamera: boolean;
    onRetake: () => void;
    onCrop: () => void;
}

export default function GuidelineFeedback({
    feedbackItems,
    hasCamera,
    onRetake,
    onCrop,
}: GuidelineFeedbackProps) {
    const { t } = useTranslation();

    if (feedbackItems.length === 0) {
        return null;
    }

    return (
        <div className={styles.feedback}>
            <div className={styles.feedbackItems}>
                {feedbackItems.map((item, i) => (
                    <div key={i} className={`${styles.feedbackItem} ${item.pass ? styles.pass : styles.warn}`}>
                        <span>{item.pass ? '✅' : '⚠️'}</span>
                        <span>{t(item.pass ? item.passText : item.failText)}</span>
                    </div>
                ))}
            </div>
            <div className={styles.feedbackActions}>
                <button className={styles.retakeBtn} onClick={onRetake}>
                    {t('upload.retakeBtn')}
                </button>
                <button className={styles.cropBtn} onClick={onCrop}>
                    {t('upload.cropBtn')}
                </button>
            </div>
        </div>
    );
}

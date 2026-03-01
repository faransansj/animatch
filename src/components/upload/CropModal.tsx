import ReactCrop, { type Crop } from 'react-image-crop';
import { useTranslation } from 'react-i18next';
import styles from './UploadScreen.module.css';

interface CropModalProps {
    cropModalOpen: boolean;
    setCropModalOpen: (open: boolean) => void;
    rawImageData: string | null;
    crop: Crop | undefined;
    setCrop: (crop: Crop | undefined) => void;
    cropImgRef: React.RefObject<HTMLImageElement | null>;
    applyCrop: () => void;
}

export default function CropModal({
    cropModalOpen,
    setCropModalOpen,
    rawImageData,
    crop,
    setCrop,
    cropImgRef,
    applyCrop,
}: CropModalProps) {
    const { t } = useTranslation();

    if (!cropModalOpen || !rawImageData) {
        return null;
    }

    return (
        <div className={styles.cropModal} onClick={() => setCropModalOpen(false)}>
            <div className={styles.cropModalContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.cropModalHeader}>
                    <h3>{t('upload.cropTitle')}</h3>
                    <button className={styles.cropClose} onClick={() => setCropModalOpen(false)}>✕</button>
                </div>
                <div className={styles.cropArea}>
                    <ReactCrop crop={crop} onChange={c => setCrop(c)}>
                        <img ref={cropImgRef} src={rawImageData} alt="crop" style={{ maxWidth: '100%' }} />
                    </ReactCrop>
                </div>
                <div className={styles.cropActions}>
                    <button className={styles.cropCancel} onClick={() => setCropModalOpen(false)}>
                        {t('upload.cropCancel')}
                    </button>
                    <button className={styles.cropApply} onClick={applyCrop}>
                        {t('upload.cropApply')}
                    </button>
                </div>
            </div>
        </div>
    );
}

import { useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { useState } from 'react';
import Header from '@/components/shared/Header';
import MultiFaceSelector from '@/components/upload/MultiFaceSelector';
import CameraCapture from '@/components/upload/CameraCapture';
import { useAppStore } from '@/stores/appStore';
import { useUploadStore } from '@/stores/uploadStore';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useFaceDetection } from '@/hooks/useFaceDetection';
import { runGuidelineCheck } from '@/utils/image';
import styles from './UploadScreen.module.css';

export default function UploadScreen() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { orientation, setOrientation, showToast } = useAppStore();
  const {
    rawImageData, processedImageData, feedbackItems,
    cropModalOpen, setCropModalOpen, setProcessedImageData, setFeedbackItems,
  } = useUploadStore();
  const { handleFile, handleDataURL } = useImageUpload();
  const { detect, selectFace } = useFaceDetection();
  const detectedFaces = useUploadStore(s => s.detectedFaces);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const cropImgRef = useRef<HTMLImageElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  const hasCamera = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

  const hasImage = !!rawImageData;

  // Auto-detect faces after upload
  useEffect(() => {
    if (rawImageData) {
      detect();
    }
  }, [rawImageData, detect]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const applyCrop = useCallback(async () => {
    if (!crop || !cropImgRef.current || !rawImageData) {
      showToast(t('upload.cropSelectArea'));
      return;
    }

    const img = cropImgRef.current;
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;

    const sx = crop.x * scaleX;
    const sy = crop.y * scaleY;
    const sw = crop.width * scaleX;
    const sh = crop.height * scaleY;

    if (sw < 50 || sh < 50) {
      showToast(t('upload.cropTooSmall'));
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d')!;

    const sourceImg = new Image();
    sourceImg.onload = async () => {
      ctx.drawImage(sourceImg, sx, sy, sw, sh, 0, 0, sw, sh);
      const cropped = canvas.toDataURL('image/jpeg', 0.92);
      setProcessedImageData(cropped);
      setCropModalOpen(false);
      setCrop(undefined);

      // Re-run guideline check
      const feedback = await runGuidelineCheck(cropped);
      setFeedbackItems(feedback);
      showToast(t('upload.cropDone'));
    };
    sourceImg.src = rawImageData;
  }, [crop, rawImageData, showToast, t, setProcessedImageData, setCropModalOpen, setFeedbackItems]);

  const startAnalysis = useCallback(() => {
    if (!processedImageData) return;
    navigate('/loading');
  }, [processedImageData, navigate]);

  return (
    <motion.section
      className={styles.screen}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
    >
      <Header backTo="/" />

      <main className={styles.content}>
        {/* Orientation Toggle */}
        <div className={styles.orientationWrap}>
          <div className={styles.orientationToggle}>
            <button
              className={`${styles.toggleOption} ${orientation === 'male' ? styles.active : ''}`}
              onClick={() => setOrientation('male')}
            >
              {t('upload.orientationMale')}
            </button>
            <button
              className={`${styles.toggleOption} ${orientation === 'female' ? styles.active : ''}`}
              onClick={() => setOrientation('female')}
            >
              {t('upload.orientationFemale')}
            </button>
            <div className={`${styles.toggleSlider} ${orientation === 'female' ? styles.right : ''}`} />
          </div>
        </div>

        <h2 className={styles.title}>{t('upload.title')}</h2>
        <p className={styles.subtitle}>{t('upload.subtitle')}</p>

        {/* Upload Zone */}
        <div
          className={`${styles.uploadZone} ${hasImage ? styles.hasImage : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={onDragOver}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={onFileChange}
          />
          {!hasImage && (
            <>
              <div className={styles.uploadIcon}>📸</div>
              <div className={styles.uploadPlaceholder}>
                <p className={styles.dragText}>{t('upload.dragDrop')}</p>
                <p className={styles.format}>{t('upload.format')}</p>
              </div>
            </>
          )}
          {hasImage && (
            <>
              <img src={processedImageData ?? rawImageData!} alt="preview" className={styles.preview} />
              <div className={styles.faceGuide}>
                <div className={styles.faceOval} />
                <p className={styles.faceGuideText}>{t('upload.faceGuide')}</p>
              </div>
            </>
          )}
        </div>

        <div className={styles.tipsInline}>
          <span className={styles.tipInline}>{t('upload.tipFront')}</span>
          <span className={styles.tipDivider}>·</span>
          <span className={styles.tipInline}>{t('upload.tipBright')}</span>
          <span className={styles.tipDivider}>·</span>
          <span className={styles.tipInline}>{t('upload.tipSingle')}</span>
        </div>

        {hasCamera && !hasImage && (
          <button className={styles.cameraBtn} onClick={() => setCameraOpen(true)}>
            📷 {t('upload.camera')}
          </button>
        )}

        {/* Guideline Feedback */}
        {hasImage && feedbackItems.length > 0 && (
          <div className={styles.feedback}>
            <div className={styles.feedbackItems}>
              {feedbackItems.map((item, i) => (
                <div key={i} className={`${styles.feedbackItem} ${item.pass ? styles.pass : styles.warn}`}>
                  <span>{item.pass ? '✅' : '⚠️'}</span>
                  <span>{t(item.pass ? item.passText : item.failText)}</span>
                </div>
              ))}
            </div>
            <button className={styles.cropBtn} onClick={(e) => { e.stopPropagation(); setCropModalOpen(true); }}>
              {t('upload.cropBtn')}
            </button>
          </div>
        )}

        {/* Multi-face selector */}
        {hasImage && rawImageData && detectedFaces.length >= 2 && (
          <MultiFaceSelector
            faces={detectedFaces}
            imageDataURL={rawImageData}
            onSelect={selectFace}
          />
        )}

        {/* Consent Checkbox */}
        <div className={styles.consentWrap}>
          <label className={styles.consentLabel}>
            <input
              type="checkbox"
              className={styles.consentCheckbox}
              checked={hasConsent}
              onChange={(e) => setHasConsent(e.target.checked)}
            />
            <span className={styles.consentText}>{t('upload.consentLabel')}</span>
          </label>
        </div>

        <button
          className={styles.analyzeBtn}
          disabled={!hasImage || !hasConsent}
          onClick={startAnalysis}
        >
          <span>{t('upload.analyze')}</span>
          <span>{t('upload.analyzeIcon')}</span>
        </button>

        <div className={styles.privacyNotice}>
          {t('upload.privacyNotice')} · <a href="/privacy" className={styles.privacyLink} onClick={(e) => { e.preventDefault(); navigate('/privacy'); }}>{t('common.privacy')}</a>
        </div>
      </main>

      {/* Camera Modal */}
      {cameraOpen && (
        <CameraCapture
          onCapture={(dataURL) => {
            setCameraOpen(false);
            handleDataURL(dataURL);
          }}
          onClose={() => setCameraOpen(false)}
        />
      )}

      {/* Crop Modal */}
      {cropModalOpen && rawImageData && (
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
      )}
    </motion.section>
  );
}

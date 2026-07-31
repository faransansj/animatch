import { useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import SEO from '@/components/shared/SEO';
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { useState } from 'react';
import Header from '@/components/shared/Header';
import MultiFaceSelector from '@/components/upload/MultiFaceSelector';
import CameraCapture from '@/components/upload/CameraCapture';
import CropModal from '@/components/upload/CropModal';
import GuidelineFeedback from '@/components/upload/GuidelineFeedback';
import { useAppStore } from '@/stores/appStore';
import { useUploadStore } from '@/stores/uploadStore';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useFaceDetection } from '@/hooks/useFaceDetection';
import { runGuidelineCheck } from '@/utils/image';
import { validateFileType, validateFileSize, MAX_FILE_SIZE } from '@/utils/fileValidation';
import { trackFunnelEvent } from '@/utils/telemetry';
import ErrorBoundary, { FaceDetectionErrorFallback } from '@/components/shared/ErrorBoundary';
import styles from './UploadScreen.module.css';

function UploadScreen() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { orientation, setOrientation, showToast } = useAppStore();
  const {
    rawImageData, processedImageData, feedbackItems, error,
    cropModalOpen, setCropModalOpen, setProcessedImageData, setFeedbackItems,
    setError, clearError, reset,
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

  // Build disabled reason for analyze button tooltip (#6)
  const analyzeDisabledReason = !hasImage && !hasConsent
    ? t('upload.disabledBoth')
    : !hasImage
      ? t('upload.disabledNoImage')
      : !hasConsent
        ? t('upload.disabledNoConsent')
        : undefined;

  useEffect(() => {
    trackFunnelEvent('Upload Page Viewed');
  }, []);

  // Auto-detect faces after upload
  useEffect(() => {
    if (rawImageData) {
      detect();
    }
  }, [rawImageData, detect]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset error state
    clearError();

    // Perform immediate validation for better UX
    const typeValidation = validateFileType(file);
    if (!typeValidation.valid) {
      setError(typeValidation.error ?? 'Invalid file type');
      e.target.value = ''; // Clear the input to allow re-selection
      return;
    }

    const sizeValidation = validateFileSize(file);
    if (!sizeValidation.valid) {
      setError(sizeValidation.error ?? 'Invalid file size');
      e.target.value = ''; // Clear the input to allow re-selection
      return;
    }

    // Additional validation for file name
    if (file.name.length > 255) {
      setError('File name is too long (maximum 255 characters)');
      e.target.value = '';
      return;
    }

    // If all validations pass, process the file
    handleFile(file);
  }, [handleFile, clearError, setError]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;

    // Reset error state
    clearError();

    // Perform validation for dropped files
    const typeValidation = validateFileType(file);
    if (!typeValidation.valid) {
      setError(typeValidation.error ?? 'Invalid file type');
      return;
    }

    const sizeValidation = validateFileSize(file);
    if (!sizeValidation.valid) {
      setError(sizeValidation.error ?? 'Invalid file size');
      return;
    }

    // Additional validation for file name
    if (file.name.length > 255) {
      setError('File name is too long (maximum 255 characters)');
      return;
    }

    // Prevent multiple files from being dropped
    if (e.dataTransfer.files.length > 1) {
      setError('Please only drop one image file at a time');
      return;
    }

    // If all validations pass, process the file
    handleFile(file);
  }, [handleFile, clearError, setError]);

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
      trackFunnelEvent('Image Cropped');
      showToast(t('upload.cropDone'));
    };
    sourceImg.src = rawImageData;
  }, [crop, rawImageData, showToast, t, setProcessedImageData, setCropModalOpen, setFeedbackItems]);

  const startAnalysis = useCallback(() => {
    if (!processedImageData) return;
    trackFunnelEvent('Analysis Started', { orientation });
    navigate('/loading');
  }, [processedImageData, navigate, orientation]);

  return (
    <motion.section
      className={styles.screen}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
    >
      <SEO
        title={`${t('upload.title')} - AniMatch`}
        description={t('upload.subtitle')}
      />
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
        {error && <p className={styles.uploadError} role="alert">{error}</p>}

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
        {hasImage && (
          <GuidelineFeedback
            feedbackItems={feedbackItems}
            hasCamera={hasCamera}
            onRetake={(e?: React.MouseEvent) => {
              e?.stopPropagation();
              reset();
              if (hasCamera) setCameraOpen(true);
            }}
            onCrop={(e?: React.MouseEvent) => {
              e?.stopPropagation();
              setCropModalOpen(true);
            }}
          />
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
          title={analyzeDisabledReason}
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

      <CropModal
        cropModalOpen={cropModalOpen}
        setCropModalOpen={setCropModalOpen}
        rawImageData={rawImageData}
        crop={crop}
        setCrop={setCrop}
        cropImgRef={cropImgRef}
        applyCrop={applyCrop}
      />
    </motion.section>
  );
}

// Export the wrapped component
export default function WrappedUploadScreen() {
  return (
    <ErrorBoundary
      fallback={<FaceDetectionErrorFallback onRetry={() => window.location.reload()} />}
      onError={(error, errorInfo) => {
        console.error('UploadScreen Error:', error, errorInfo);
        // You could also send this to your analytics service
      }}
    >
      <UploadScreen />
    </ErrorBoundary>
  );
}

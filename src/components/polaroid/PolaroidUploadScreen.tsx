import { useRef, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import SEO from '@/components/shared/SEO';
import Header from '@/components/shared/Header';
import PolaroidFrame from '@/components/polaroid/PolaroidFrame';
import RetroCameraViewfinder from '@/components/polaroid/RetroCameraViewfinder';
import { useAppStore } from '@/stores/appStore';
import { useUploadStore } from '@/stores/uploadStore';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useFaceDetection } from '@/hooks/useFaceDetection';
import { trackFunnelEvent } from '@/utils/telemetry';
import styles from './PolaroidUploadScreen.module.css';

export default function PolaroidUploadScreen() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { orientation, setOrientation, showToast } = useAppStore();
  const { rawImageData, processedImageData, reset } = useUploadStore();
  const { handleFile, handleDataURL } = useImageUpload();
  const { detect } = useFaceDetection();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isCameraCaptureRef = useRef(false);
  
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const [hasConsent, setHasConsent] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isCameraSnap, setIsCameraSnap] = useState(false);

  const hasCamera = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  const hasImage = !!rawImageData;

  useEffect(() => {
    trackFunnelEvent('Polaroid Upload Viewed');
    return () => {
      // Clean up camera stream on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Auto-detect faces after upload
  useEffect(() => {
    if (rawImageData) {
      detect();
    }
  }, [rawImageData, detect]);



  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsFlashing(false);
      isCameraCaptureRef.current = false;
      setIsCameraSnap(false);
      handleFile(file);
    }
  }, [handleFile]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setIsFlashing(false);
      isCameraCaptureRef.current = false;
      setIsCameraSnap(false);
      handleFile(file);
    }
  }, [handleFile]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 720 }, height: { ideal: 540 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      setCameraError(null);
    } catch (err) {
      console.error('Camera access error:', err);
      const name = (err as DOMException).name;
      if (name === 'NotAllowedError') {
        setCameraError(t('upload.cameraPermission'));
      } else {
        setCameraError(t('upload.cameraError'));
      }
      setCameraActive(false);
    }
  }, [stopCamera, t]);

  const toggleCamera = () => {
    if (cameraActive) {
      stopCamera();
    } else {
      reset();
      setIsFlashing(false);
      isCameraCaptureRef.current = false;
      setIsCameraSnap(false);
      startCamera(facingMode);
    }
  };

  const handleFlip = () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
    if (cameraActive) {
      startCamera(nextFacing);
    }
  };

  const handleShutter = useCallback(() => {
    if (cameraActive && streamRef.current) {
      const video = document.querySelector('video');
      if (!video) return;

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d')!;

      // Mirror the capture for front camera
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0);

      const dataURL = canvas.toDataURL('image/jpeg', 0.92);
      
      isCameraCaptureRef.current = true;
      setIsCameraSnap(true);
      setIsFlashing(true);
      stopCamera();
      
      // Let the flash fire, then handle image loading
      setTimeout(() => {
        handleDataURL(dataURL);
        setTimeout(() => setIsFlashing(false), 300);
      }, 300);
    } else if (hasImage) {
      // Just re-trigger flash
      setIsFlashing(true);
      setTimeout(() => {
        setIsFlashing(false);
      }, 600);
    }
  }, [cameraActive, facingMode, stopCamera, handleDataURL, hasImage]);

  const startAnalysis = useCallback(() => {
    if (!processedImageData) return;
    if (!hasConsent) {
      showToast(t('upload.disabledNoConsent') || '개인정보 수집 및 이용에 동의해주세요.');
      return;
    }
    trackFunnelEvent('Polaroid Analysis Started', { orientation });
    navigate('/polaroid/developing');
  }, [processedImageData, hasConsent, navigate, orientation, showToast, t]);

  const handleRetake = useCallback(() => {
    reset();
    setIsFlashing(false);
    isCameraCaptureRef.current = false;
    setIsCameraSnap(false);
    stopCamera();
  }, [reset, stopCamera]);

  const videoRefCallback = useCallback((node: HTMLVideoElement | null) => {
    if (node && streamRef.current) {
      node.srcObject = streamRef.current;
    }
  }, []);

  const handleViewfinderClick = () => {
    if (cameraActive) return;
    // Start camera!
    reset();
    setIsFlashing(false);
    isCameraCaptureRef.current = false;
    setIsCameraSnap(false);
    startCamera(facingMode);
  };

  const isReadyToShoot = cameraActive || hasImage;

  // HTML video element to render inside viewfinder
  const videoElement = cameraActive ? (
    <video
      ref={videoRefCallback}
      autoPlay
      playsInline
      muted
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
      }}
    />
  ) : undefined;

  return (
    <motion.section
      className={styles.screen}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <SEO
        title={`${t('polaroid.uploadTitle')} - AniMatch`}
        description={t('polaroid.uploadSubtitle')}
      />

      <div className={styles.bg}>
        <div className={`${styles.warmOrb} ${styles.orb1}`} />
        <div className={`${styles.warmOrb} ${styles.orb2}`} />
      </div>

      <Header backTo="/" />

      <main className={styles.content} onDrop={onDrop} onDragOver={onDragOver}>
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

        {/* Retro Camera Viewfinder */}
        <div className={styles.cameraViewportArea}>
          <RetroCameraViewfinder
            videoElement={videoElement}
            previewSrc={processedImageData ?? rawImageData ?? undefined}
            flashing={isFlashing}
            onShutter={handleShutter}
            onViewfinderClick={handleViewfinderClick}
            isReady={isReadyToShoot}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={onFileChange}
          />
        </div>

        {/* Camera error feedback if any */}
        {cameraError && (
          <div className={styles.errorBanner}>
            ⚠️ {cameraError}
          </div>
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
            <span>{t('upload.consentLabel')}</span>
          </label>
        </div>

        {/* Camera Control Buttons */}
        <div className={styles.buttonControls}>
          {!hasImage && !cameraActive && (
            <button className={styles.cameraBtn} onClick={() => fileInputRef.current?.click()}>
              📁 {t('upload.title') || 'Select File'}
            </button>
          )}

          {cameraActive && (
            <button className={styles.cameraBtn} onClick={handleFlip}>
              🔄 {t('upload.cameraFlip')}
            </button>
          )}

          {cameraActive && (
            <button className={styles.cameraBtn} onClick={toggleCamera}>
              ❌ {t('upload.cameraClose')}
            </button>
          )}

          {hasImage && (
            <button className={styles.cameraBtn} onClick={handleRetake}>
              🔄 {t('upload.retakeBtn')}
            </button>
          )}
        </div>

        {/* Analyze button */}
        <button
          className={styles.analyzeBtn}
          disabled={!hasImage}
          onClick={startAnalysis}
        >
          <span>{t('upload.analyze')}</span>
          <span>📸</span>
        </button>

        {/* Tips */}
        <div className={styles.tips}>
          <span>{t('upload.tipFront')}</span>
          <span className={styles.tipDivider}>·</span>
          <span>{t('upload.tipBright')}</span>
          <span className={styles.tipDivider}>·</span>
          <span>{t('upload.tipSingle')}</span>
        </div>

        <div className={styles.privacyNotice}>
          {t('upload.privacyNotice')} · <a href="/privacy" className={styles.privacyLink} onClick={(e) => { e.preventDefault(); navigate('/privacy'); }}>{t('common.privacy')}</a>
        </div>
      </main>

      {/* Screen flash overlay for the shutter snap */}
      {isFlashing && <div className={styles.shutterFlash} />}
    </motion.section>
  );
}

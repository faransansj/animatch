import { useRef, useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './CameraCapture.module.css';

interface CameraCaptureProps {
  onCapture: (dataURL: string) => void;
  onClose: () => void;
}

export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [error, setError] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    stopStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setError(null);
    } catch (err) {
      const name = (err as DOMException).name;
      if (name === 'NotAllowedError') {
        setError(t('upload.cameraPermission'));
      } else {
        setError(t('upload.cameraError'));
      }
    }
  }, [stopStream, t]);

  useEffect(() => {
    startCamera(facingMode);
    return stopStream;
  }, [facingMode, startCamera, stopStream]);

  const handleFlip = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }, []);

  const handleShutter = useCallback(() => {
    const video = videoRef.current;
    if (!video || !streamRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;

    // Mirror the capture for front camera to match preview
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);

    const dataURL = canvas.toDataURL('image/jpeg', 0.92);
    stopStream();
    onCapture(dataURL);
  }, [facingMode, stopStream, onCapture]);

  const handleClose = useCallback(() => {
    stopStream();
    onClose();
  }, [stopStream, onClose]);

  return (
    <div className={styles.overlay}>
      {error ? (
        <div className={styles.error}>
          <div className={styles.errorIcon}>📷</div>
          <p className={styles.errorText}>{error}</p>
        </div>
      ) : (
        <div className={styles.videoWrap}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`${styles.video} ${facingMode === 'user' ? styles.mirror : ''}`}
          />
          <div className={styles.guide}>
            <div className={styles.guideOval} />
          </div>
        </div>
      )}

      <div className={styles.controls}>
        <button className={styles.controlBtn} onClick={handleClose} aria-label={t('upload.cameraClose')}>
          ✕
        </button>
        <button className={styles.shutterBtn} onClick={handleShutter} disabled={!!error} aria-label={t('upload.cameraShutter')} />
        <button className={styles.controlBtn} onClick={handleFlip} aria-label={t('upload.cameraFlip')}>
          🔄
        </button>
      </div>
    </div>
  );
}

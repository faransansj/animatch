import { useState, useEffect } from 'react';
import styles from './RetroCameraViewfinder.module.css';

interface RetroCameraViewfinderProps {
  /** Renders the live video element inside the viewfinder if active */
  videoElement?: React.ReactNode;
  /** Preview image URL if an image has been uploaded/captured */
  previewSrc?: string;
  /** Whether the shutter was pressed (fires flash) */
  flashing?: boolean;
  /** Callback when shutter button is clicked */
  onShutter?: () => void;
  /** Callback to trigger file input or start camera */
  onViewfinderClick?: () => void;
  /** Whether the camera is ready to take a picture */
  isReady?: boolean;
}

export default function RetroCameraViewfinder({
  videoElement,
  previewSrc,
  flashing = false,
  onShutter,
  onViewfinderClick,
  isReady = false,
}: RetroCameraViewfinderProps) {
  const [needleValue, setNeedleValue] = useState(50);
  const [shutterPressed, setShutterPressed] = useState(false);

  // Animate exposure needle to simulate light meter
  useEffect(() => {
    const interval = setInterval(() => {
      setNeedleValue((prev) => {
        const delta = (Math.random() - 0.5) * 8;
        return Math.max(20, Math.min(80, prev + delta));
      });
    }, 800);
    return () => clearInterval(interval);
  }, []);

  const handleShutterClick = () => {
    if (shutterPressed || flashing) return;
    setShutterPressed(true);
    if (onShutter) onShutter();
    setTimeout(() => setShutterPressed(false), 800);
  };

  return (
    <div className={styles.cameraContainer}>
      {/* Retro Camera Casing (Classic Cream-White Polaroid OneStep) */}
      <div className={styles.cameraBody}>
        {/* Vertical Rainbow Stripe running down the center */}
        <div className={styles.verticalRainbow} />

        {/* Top Flash Bar Unit */}
        <div className={styles.flashBar}>
          <div className={styles.flashReflector}>
            <div className={styles.flashBulbCore} />
            <div className={styles.flashGrid} />
          </div>
        </div>

        {/* Top Header Plate */}
        <div className={styles.topPlate}>
          <span className={styles.brandName}>POLAROID OneStep</span>
        </div>

        {/* Status Indicator Bar */}
        <div className={styles.statusRow}>
          <div className={styles.statusIndicator}>
            <div
              className={`${styles.ledLamp} ${
                previewSrc
                  ? styles.ledGreen
                  : isReady
                  ? styles.ledAmber
                  : styles.ledRed
              }`}
            />
            <span className={styles.ledText}>
              {previewSrc ? 'FILM LOADED' : isReady ? 'CAMERA READY' : 'NO FILM'}
            </span>
          </div>
        </div>

        {/* Upper Viewfinder Section (The viewport where video/preview lives) */}
        <div className={styles.viewfinderSection}>
          <span className={styles.sectionLabel}>VIEWFINDER</span>
          <div 
            className={styles.viewfinderOuter}
            onClick={previewSrc ? undefined : onViewfinderClick}
            style={{ cursor: previewSrc ? 'default' : 'pointer' }}
          >
            <div className={styles.viewfinderInner}>
              <div className={styles.viewport}>
                {videoElement ? (
                  videoElement
                ) : previewSrc ? (
                  <img src={previewSrc} alt="Preview" className={styles.previewImg} draggable={false} />
                ) : (
                  <div className={styles.emptyView}>
                    <span className={styles.emptyIcon}>📸</span>
                    <span className={styles.emptyText}>TAP TO START CAMERA</span>
                  </div>
                )}

                {/* Viewfinder HUD Overlay */}
                <div className={styles.viewfinderOverlay}>
                  <div className={styles.gridLines} />
                  <div className={styles.focusCircle}>
                    <div className={styles.focusCircleInner} />
                  </div>
                  
                  {/* Exposure Meter Needle */}
                  <div className={styles.exposureGauge}>
                    <div className={styles.exposureNeedle} style={{ transform: `translateY(-50%) rotate(${(needleValue - 50) * 0.4}deg)` }} />
                  </div>
                </div>

                <div className={styles.glassReflection} />
                <div className={styles.viewportBezel} />
              </div>
            </div>
          </div>
        </div>

        {/* Camera Middle-Lower Face (Shutter Button, Main Graphic Lens, Exposure Dial) */}
        <div className={styles.cameraFace}>
          {/* Left: 3D Shutter Button & Click Guide */}
          <div className={styles.shutterArea}>
            {isReady && !previewSrc && (
              <div className={styles.clickGuide}>
                <span className={styles.guideText}>PRESS 📸</span>
                <div className={styles.guideArrow} />
              </div>
            )}
            <div className={styles.shutterWrapper}>
              <button
                className={`${styles.shutterButton} ${shutterPressed ? styles.pressed : ''} ${
                  isReady && !previewSrc ? styles.pulseGlow : ''
                }`}
                onClick={handleShutterClick}
                disabled={flashing}
                aria-label="Press Shutter Button"
              >
                <div className={styles.shutterInner} />
              </button>
              <span className={styles.shutterLabel}>SHUTTER</span>
            </div>
          </div>

          {/* Center: Beautiful 3D Graphic Lens (Unrelated to live stream viewport) */}
          <div className={styles.lensArea}>
            <div className={styles.lensOuterChrome}>
              <div className={styles.lensMiddleRibbed}>
                <div className={styles.lensInnerGlass}>
                  <div className={styles.lensApertureBlades}>
                    <div className={styles.apertureCore} />
                  </div>
                  <div className={styles.lensCoatingGlare} />
                  <div className={styles.lensReflectionRing} />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Lighten/Darken Exposure Dial (Retro Wheel) */}
          <div className={styles.exposureDialArea}>
            <span className={styles.dialLabel}>LIGHTEN</span>
            <div className={styles.dialHousing}>
              <div className={styles.dialWheel}>
                <div className={styles.dialWhiteHalf} />
                <div className={styles.dialBlackHalf} />
                <div className={styles.dialCenterCap} />
              </div>
            </div>
            <span className={styles.dialLabel}>DARKEN</span>
          </div>
        </div>

        {/* Bottom Film Slot Container */}
        <div className={styles.ejectSlotContainer}>
          <div className={styles.ejectSlotLabel}>⬇ PHOTO PREVIEWS IN VIEWFINDER ABOVE ⬇</div>
          <div className={`${styles.ejectSlot} ${flashing ? styles.vibrating : ''}`} />
        </div>
      </div>
    </div>
  );
}

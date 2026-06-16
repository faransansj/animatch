import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import PolaroidFrame from './PolaroidFrame';
import styles from './DevelopingPhoto.module.css';

interface DevelopingPhotoProps {
  /** 0–100 development progress */
  progress: number;
  /** Image source to reveal */
  imageSrc: string;
  /** Caption to show when development completes */
  caption?: string;
  /** Callback triggered when card is shaken */
  onShake?: (amount: number) => void;
}

export default function DevelopingPhoto({
  progress,
  imageSrc,
  caption,
  onShake,
}: DevelopingPhotoProps) {
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number }[]>([]);
  const lastPos = useRef({ x: 0, y: 0, time: 0 });

  const handleDrag = (event: any, info: any) => {
    const now = performance.now();
    const dt = now - lastPos.current.time;
    if (dt > 40) {
      const dx = info.point.x - lastPos.current.x;
      const dy = info.point.y - lastPos.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const speed = dist / dt; // pixels per millisecond

      if (speed > 0.6) {
        // Trigger shake callback to speed up progress
        if (onShake) {
          onShake(speed * 1.5);
        }

        // Add a sparkling particle at the cursor position
        const rect = event.target?.getBoundingClientRect?.() || { left: 0, top: 0 };
        const x = info.point.x - rect.left;
        const y = info.point.y - rect.top;

        setSparkles((prev) => [
          ...prev.slice(-12),
          { id: Date.now() + Math.random(), x, y },
        ]);
      }

      lastPos.current = { x: info.point.x, y: info.point.y, time: now };
    }
  };

  // Map progress (0-100) to development stage (0-3)
  const stage: 0 | 1 | 2 | 3 =
    progress < 25 ? 0 :
    progress < 55 ? 1 :
    progress < 85 ? 2 : 3;

  const isDeveloping = progress < 100;
  const showCaption = stage === 3 && caption;

  return (
    <div className={styles.container}>
      <div className={styles.photoDragArea}>
        <motion.div
          drag
          dragConstraints={{ left: -40, right: 40, top: -40, bottom: 40 }}
          dragElastic={0.25}
          onDrag={handleDrag}
          className={styles.draggableCard}
          whileTap={{ scale: 1.04, rotate: 1 }}
        >
          {/* Polaroid frame */}
          <PolaroidFrame
            tilt={-1}
            developing={isDeveloping}
            developStage={stage}
            progress={progress}
            showGrain={true}
            caption={showCaption ? caption : undefined}
          >
            {/* The actual image is loaded, and styled with CSS filters dynamically */}
            <img
              src={imageSrc}
              alt="Developing character"
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
              className={styles.filmImage}
              draggable={false}
            />
          </PolaroidFrame>

          {/* Sparkle particles */}
          {sparkles.map((sp) => (
            <span
              key={sp.id}
              className={styles.sparkle}
              style={{ left: sp.x, top: sp.y }}
            />
          ))}

          {isDeveloping && (
            <div className={styles.handHint}>🤲 Shake me!</div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

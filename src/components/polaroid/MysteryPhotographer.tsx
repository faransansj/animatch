import { useState, useEffect, useRef } from 'react';
import styles from './MysteryPhotographer.module.css';

interface MysteryPhotographerProps {
  /** Whether the shutter was just pressed (triggers flash) */
  flashing?: boolean;
  /** Speech bubble text */
  speech?: string;
  /** Show the ejecting polaroid after flash */
  showEject?: boolean;
  /** Content inside the ejected polaroid (user's photo) */
  ejectContent?: React.ReactNode;
  /** Click handler for the photographer */
  onClick?: () => void;
}

function FloatingPhotos() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const el = document.createElement('div');
      el.className = styles.floatingPhoto ?? '';
      el.style.left = (10 + Math.random() * 80) + '%';
      el.style.animationDuration = (6 + Math.random() * 6) + 's';
      el.style.animationDelay = Math.random() * 8 + 's';
      el.style.transform = `rotate(${-20 + Math.random() * 40}deg)`;
      container.appendChild(el);
    }
  }, []);

  return <div ref={ref} className={styles.floatingPhotos} />;
}

export default function MysteryPhotographer({
  flashing = false,
  speech,
  showEject = false,
  ejectContent,
  onClick,
}: MysteryPhotographerProps) {
  const [showFlash, setShowFlash] = useState(false);

  useEffect(() => {
    if (flashing) {
      setShowFlash(true);
      const timer = setTimeout(() => setShowFlash(false), 800);
      return () => clearTimeout(timer);
    }
  }, [flashing]);

  return (
    <div
      className={styles.wrapper}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <FloatingPhotos />

      <div className={styles.characterContainer}>
        <div className={styles.characterGlow} />
        <img
          className={styles.characterImg}
          src="/polaroid/mystery_photographer.png"
          alt="Mystery photographer"
          loading="eager"
        />
        <div className={styles.lensGlow} />

        {showEject && ejectContent && (
          <div className={styles.ejectingPhoto} onClick={(e) => e.stopPropagation()}>
            {ejectContent}
          </div>
        )}
      </div>

      {speech && (
        <div className={styles.speechBubble}>{speech}</div>
      )}

      {showFlash && <div className={styles.flashOverlay} />}
    </div>
  );
}

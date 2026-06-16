import type { ReactNode, CSSProperties } from 'react';
import styles from './PolaroidFrame.module.css';

interface PolaroidFrameProps {
  children?: ReactNode;
  caption?: string;
  tilt?: number;
  developing?: boolean;
  /** 0 = fully blurred, 1 = silhouette, 2 = forming, 3 = clear */
  developStage?: 0 | 1 | 2 | 3;
  /** Direct progress values (0 to 100) for real-time CSS filter mapping */
  progress?: number;
  shaking?: boolean;
  showTape?: boolean;
  showGrain?: boolean;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}

export default function PolaroidFrame({
  children,
  caption,
  tilt = 0,
  developing = false,
  developStage,
  progress,
  shaking = false,
  showTape = false,
  showGrain = true,
  className = '',
  style,
  onClick,
}: PolaroidFrameProps) {
  const frameClasses = [
    styles.frame,
    developing ? styles.developing : '',
    developStage !== undefined ? styles[`developStage${developStage}`] : '',
    shaking ? styles.shaking : '',
    className,
  ].filter(Boolean).join(' ');

  const frameStyle: CSSProperties = {
    transform: `rotate(${tilt}deg)`,
    ...style,
  };

  // Direct progress-to-filter mapping to perfectly sync image development with progress bar
  const imageAreaStyle: CSSProperties = developing && progress !== undefined ? {
    filter: `blur(${Math.max(0, 22 - (progress * 22) / 100)}px) ` +
            `contrast(${3.5 - (progress * 2.5) / 100}) ` +
            `brightness(${0.12 + (progress * 0.88) / 100}) ` +
            `sepia(${Math.max(0, 1 - progress / 100)}) ` +
            `saturate(${0.2 + (progress * 0.8) / 100}) ` +
            `hue-rotate(${-12 + (progress * 12) / 100}deg)`,
    opacity: 0.85 + (progress * 0.15) / 100,
    transition: 'filter 0.15s ease-out, opacity 0.15s ease-out',
  } : {};

  return (
    <div className={frameClasses} style={frameStyle} onClick={onClick}>
      {showTape && <div className={styles.tape} />}
      <div className={styles.imageArea} style={imageAreaStyle}>
        {children}
      </div>
      {showGrain && <div className={styles.grain} />}
      {caption && <div className={styles.caption}>{caption}</div>}
    </div>
  );
}

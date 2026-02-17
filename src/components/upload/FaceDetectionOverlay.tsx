import type { DetectedFace } from '@/types/common';
import styles from './FaceDetectionOverlay.module.css';

interface Props {
  faces: DetectedFace[];
  imageWidth: number;
  imageHeight: number;
  containerWidth: number;
  containerHeight: number;
}

export default function FaceDetectionOverlay({ faces, imageWidth, imageHeight, containerWidth, containerHeight }: Props) {
  if (faces.length === 0) return null;

  const scaleX = containerWidth / imageWidth;
  const scaleY = containerHeight / imageHeight;

  return (
    <div className={styles.overlay}>
      {faces.map((face, i) => (
        <div
          key={i}
          className={styles.box}
          style={{
            left: face.x * scaleX,
            top: face.y * scaleY,
            width: face.width * scaleX,
            height: face.height * scaleY,
          }}
        >
          <span className={styles.label}>{Math.round(face.confidence * 100)}%</span>
        </div>
      ))}
    </div>
  );
}

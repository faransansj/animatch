import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { DetectedFace } from '@/types/common';
import styles from './MultiFaceSelector.module.css';

interface Props {
  faces: DetectedFace[];
  imageDataURL: string;
  onSelect: (face: DetectedFace) => void;
}

export default function MultiFaceSelector({ faces, imageDataURL, onSelect }: Props) {
  const { t } = useTranslation();
  const [thumbnails, setThumbnails] = useState<string[]>([]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const thumbs = faces.map(face => {
        const padding = 0.2;
        const padX = face.width * padding;
        const padY = face.height * padding;
        const x = Math.max(0, face.x - padX);
        const y = Math.max(0, face.y - padY);
        const w = Math.min(img.width - x, face.width + padX * 2);
        const h = Math.min(img.height - y, face.height + padY * 2);

        const canvas = document.createElement('canvas');
        canvas.width = 80;
        canvas.height = 80;
        const ctx = canvas.getContext('2d')!;
        const size = Math.max(w, h);
        const cx = x + w / 2 - size / 2;
        const cy = y + h / 2 - size / 2;
        ctx.drawImage(img, cx, cy, size, size, 0, 0, 80, 80);
        return canvas.toDataURL('image/jpeg', 0.8);
      });
      setThumbnails(thumbs);
    };
    img.src = imageDataURL;
  }, [faces, imageDataURL]);

  const handleSelect = useCallback((i: number) => {
    onSelect(faces[i]!);
  }, [faces, onSelect]);

  if (faces.length < 2 || thumbnails.length === 0) return null;

  return (
    <div className={styles.container}>
      <p className={styles.label}>👥 여러 얼굴이 감지됐어요. 분석할 얼굴을 선택해주세요:</p>
      <div className={styles.grid}>
        {thumbnails.map((thumb, i) => (
          <button key={i} className={styles.thumb} onClick={() => handleSelect(i)}>
            <img src={thumb} alt={`Face ${i + 1}`} />
            <span className={styles.num}>{i + 1}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

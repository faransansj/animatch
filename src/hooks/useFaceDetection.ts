import { useCallback } from 'react';
import { useUploadStore } from '@/stores/uploadStore';
import { useMLStore } from '@/stores/mlStore';
import { detectFaces, cropFaceFromImage } from '@/ml/faceDetector';
import type { DetectedFace } from '@/types/common';

export function useFaceDetection() {
  const { rawImageData, setProcessedImageData, setDetectedFaces } = useUploadStore();
  const { faceDetectorReady } = useMLStore();

  const detect = useCallback(async (): Promise<DetectedFace[]> => {
    if (!rawImageData || !faceDetectorReady) return [];

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const faces = detectFaces(img);
        setDetectedFaces(faces);

        if (faces.length === 1) {
          // Auto-crop single face
          cropFaceFromImage(rawImageData, faces[0]!, 0.3).then((cropped) => {
            setProcessedImageData(cropped);
            resolve(faces);
          });
        } else {
          resolve(faces);
        }
      };
      img.src = rawImageData;
    });
  }, [rawImageData, faceDetectorReady, setDetectedFaces, setProcessedImageData]);

  const selectFace = useCallback(async (face: DetectedFace) => {
    if (!rawImageData) return;
    const cropped = await cropFaceFromImage(rawImageData, face, 0.3);
    setProcessedImageData(cropped);
  }, [rawImageData, setProcessedImageData]);

  return { detect, selectFace };
}

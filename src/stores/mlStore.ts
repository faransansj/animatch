import { create } from 'zustand';
import type { EmbeddingsData } from '@/types/character';

interface MLState {
  clipReady: boolean;
  clipProgress: number;
  embeddingsData: EmbeddingsData | null;
  faceDetectorReady: boolean;
  arcFaceReady: boolean;
  setClipReady: (ready: boolean) => void;
  setClipProgress: (progress: number) => void;
  setEmbeddingsData: (data: EmbeddingsData) => void;
  setFaceDetectorReady: (ready: boolean) => void;
  setArcFaceReady: (ready: boolean) => void;
}

export const useMLStore = create<MLState>((set) => ({
  clipReady: false,
  clipProgress: 0,
  embeddingsData: null,
  faceDetectorReady: false,
  arcFaceReady: false,
  setClipReady: (clipReady) => set({ clipReady }),
  setClipProgress: (clipProgress) => set({ clipProgress }),
  setEmbeddingsData: (embeddingsData) => set({ embeddingsData }),
  setFaceDetectorReady: (faceDetectorReady) => set({ faceDetectorReady }),
  setArcFaceReady: (arcFaceReady) => set({ arcFaceReady }),
}));

import { create } from 'zustand';
import type { FeedbackItem, DetectedFace } from '@/types/common';

interface UploadState {
  rawImageData: string | null;
  processedImageData: string | null;
  feedbackItems: FeedbackItem[];
  cropModalOpen: boolean;
  detectedFaces: DetectedFace[];
  error: string | null;
  setRawImageData: (data: string | null) => void;
  setProcessedImageData: (data: string | null) => void;
  setFeedbackItems: (items: FeedbackItem[]) => void;
  setCropModalOpen: (open: boolean) => void;
  setDetectedFaces: (faces: DetectedFace[]) => void;
  setError: (error: string) => void;
  clearError: () => void;
  reset: () => void;
}

export const useUploadStore = create<UploadState>((set) => ({
  rawImageData: null,
  processedImageData: null,
  feedbackItems: [],
  cropModalOpen: false,
  detectedFaces: [],
  error: null,
  setRawImageData: (rawImageData) => set({ rawImageData }),
  setProcessedImageData: (processedImageData) => set({ processedImageData }),
  setFeedbackItems: (feedbackItems) => set({ feedbackItems }),
  setCropModalOpen: (cropModalOpen) => set({ cropModalOpen }),
  setDetectedFaces: (detectedFaces) => set({ detectedFaces }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
  reset: () => set({
    rawImageData: null,
    processedImageData: null,
    feedbackItems: [],
    cropModalOpen: false,
    detectedFaces: [],
    error: null,
  }),
}));

import { create } from 'zustand';
import type { FeedbackItem, DetectedFace } from '@/types/common';

interface UploadState {
  rawImageData: string | null;
  processedImageData: string | null;
  feedbackItems: FeedbackItem[];
  cropModalOpen: boolean;
  detectedFaces: DetectedFace[];
  setRawImageData: (data: string | null) => void;
  setProcessedImageData: (data: string | null) => void;
  setFeedbackItems: (items: FeedbackItem[]) => void;
  setCropModalOpen: (open: boolean) => void;
  setDetectedFaces: (faces: DetectedFace[]) => void;
  reset: () => void;
}

export const useUploadStore = create<UploadState>((set) => ({
  rawImageData: null,
  processedImageData: null,
  feedbackItems: [],
  cropModalOpen: false,
  detectedFaces: [],
  setRawImageData: (rawImageData) => set({ rawImageData }),
  setProcessedImageData: (processedImageData) => set({ processedImageData }),
  setFeedbackItems: (feedbackItems) => set({ feedbackItems }),
  setCropModalOpen: (cropModalOpen) => set({ cropModalOpen }),
  setDetectedFaces: (detectedFaces) => set({ detectedFaces }),
  reset: () => set({
    rawImageData: null,
    processedImageData: null,
    feedbackItems: [],
    cropModalOpen: false,
    detectedFaces: [],
  }),
}));

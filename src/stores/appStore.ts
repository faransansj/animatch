import { create } from 'zustand';
import type { Language, Orientation } from '@/types/common';

interface AppState {
  language: Language;
  orientation: Orientation;
  toastMessage: string | null;
  setLanguage: (lang: Language) => void;
  setOrientation: (o: Orientation) => void;
  showToast: (msg: string) => void;
  hideToast: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  language: 'ko',
  orientation: 'male',
  toastMessage: null,
  setLanguage: (language) => set({ language }),
  setOrientation: (orientation) => set({ orientation }),
  showToast: (msg) => {
    set({ toastMessage: msg });
    setTimeout(() => set({ toastMessage: null }), 2500);
  },
  hideToast: () => set({ toastMessage: null }),
}));

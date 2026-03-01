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

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export const useAppStore = create<AppState>((set) => ({
  language: 'ko',
  orientation: 'male',
  toastMessage: null,
  setLanguage: (language) => set({ language }),
  setOrientation: (orientation) => set({ orientation }),
  showToast: (msg) => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toastMessage: msg });
    toastTimer = setTimeout(() => {
      set({ toastMessage: null });
      toastTimer = null;
    }, 2500);
  },
  hideToast: () => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toastMessage: null });
    toastTimer = null;
  },
}));

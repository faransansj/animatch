import { create } from 'zustand';
import type { MatchResult } from '@/types/match';

type GachaStep = 'idle' | 'analyzing' | 'matching' | 'revealing' | 'done';

interface ResultState {
  matchResult: MatchResult | null;
  gachaStep: GachaStep;
  gachaProgress: number;
  gachaRevealed: boolean;
  quoteText: string;
  setMatchResult: (result: MatchResult | null) => void;
  setGachaStep: (step: GachaStep) => void;
  setGachaProgress: (progress: number) => void;
  setGachaRevealed: (revealed: boolean) => void;
  setQuoteText: (text: string) => void;
  reset: () => void;
}

export const useResultStore = create<ResultState>((set) => ({
  matchResult: null,
  gachaStep: 'idle',
  gachaProgress: 0,
  gachaRevealed: false,
  quoteText: '',
  setMatchResult: (matchResult) => set({ matchResult }),
  setGachaStep: (gachaStep) => set({ gachaStep }),
  setGachaProgress: (gachaProgress) => set({ gachaProgress }),
  setGachaRevealed: (gachaRevealed) => set({ gachaRevealed }),
  setQuoteText: (quoteText) => set({ quoteText }),
  reset: () => set({
    matchResult: null,
    gachaStep: 'idle',
    gachaProgress: 0,
    gachaRevealed: false,
    quoteText: '',
  }),
}));

export type Orientation = 'male' | 'female';
export type Language = 'ko' | 'en' | 'ja' | 'zh-TW';

export interface FeedbackItem {
  pass: boolean;
  passText: string;
  failText: string;
}

export interface DetectedFace {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

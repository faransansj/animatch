import { useState, useCallback, useRef } from 'react';

export function useTypewriter() {
  const [text, setText] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const type = useCallback((fullText: string, speed = 60): Promise<void> => {
    return new Promise((resolve) => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setText('');
      let i = 0;
      intervalRef.current = setInterval(() => {
        setText(fullText.slice(0, i + 1));
        i++;
        if (i >= fullText.length) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          resolve();
        }
      }, speed);
    });
  }, []);

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setText('');
  }, []);

  return { text, type, reset };
}

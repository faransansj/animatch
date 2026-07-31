import { afterEach, describe, expect, it, vi } from 'vitest';
import { easeOut, processImage, resizeImage, sleep } from '@/utils/image';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function stubImage(width = 400, height = 400, onCreate?: () => void) {
  const imageWidth = width;
  const imageHeight = height;
  vi.stubGlobal('Image', class {
    width = imageWidth;
    height = imageHeight;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor() { onCreate?.(); }
    set src(_value: string) { queueMicrotask(() => this.onload?.()); }
  });
}

describe('image utilities', () => {
  it('keeps an image that already fits the maximum dimensions', async () => {
    stubImage();
    const dataUrl = 'data:image/jpeg;base64,AAAA==';
    await expect(resizeImage(dataUrl, 1080)).resolves.toBe(dataUrl);
  });

  it('resizes and analyzes an upload with one image decode', async () => {
    let imageCreations = 0;
    stubImage(400, 400, () => imageCreations++);
    const context = {
      drawImage: vi.fn(),
      getImageData: () => ({ data: new Uint8ClampedArray(400 * 400 * 4) }),
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as never);

    const result = await processImage('data:image/jpeg;base64,AAAA==');

    expect(imageCreations).toBe(1);
    expect(context.drawImage).toHaveBeenCalledOnce();
    expect(result.dataURL).toBe('data:image/jpeg;base64,AAAA==');
    expect(result.feedback).toHaveLength(4);
  });

  it('rejects non-image data URLs', async () => {
    await expect(resizeImage('invalid')).rejects.toThrow('Invalid data URL format');
  });

  it('provides animation helpers', async () => {
    expect(easeOut(0)).toBe(0);
    expect(easeOut(1)).toBe(1);
    await expect(sleep(0)).resolves.toBeUndefined();
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_FILE_SIZE,
  formatFileSize,
  sanitizeImageData,
  validateFileSize,
  validateFileType,
  validateImageDimensions,
} from '@/utils/fileValidation';

afterEach(() => vi.unstubAllGlobals());

describe('file validation', () => {
  it('accepts supported image types and rejects other files', () => {
    expect(validateFileType(new File(['x'], 'photo.jpg', { type: 'image/jpeg' })).valid).toBe(true);
    expect(validateFileType(new File(['x'], 'script.js', { type: 'text/javascript' })).valid).toBe(false);
  });

  it('enforces file size limits', () => {
    expect(validateFileSize(new File(['x'], 'tiny.jpg', { type: 'image/jpeg' })).valid).toBe(false);
    expect(validateFileSize(new File([new Uint8Array(1024)], 'photo.jpg', { type: 'image/jpeg' })).valid).toBe(true);
    expect(validateFileSize(new File([new Uint8Array(MAX_FILE_SIZE + 1)], 'huge.jpg', { type: 'image/jpeg' })).valid).toBe(false);
  });

  it('formats file sizes', () => {
    expect(formatFileSize(0)).toBe('0 Bytes');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1024 * 1024)).toBe('1 MB');
  });

  it('validates data URLs without corrupting base64 padding', () => {
    const dataUrl = 'data:image/jpeg;base64,AAAA==';
    expect(sanitizeImageData(dataUrl)).toBe(dataUrl);
    expect(() => sanitizeImageData('https://example.com/photo.jpg')).toThrow('Invalid data URL format');
  });

  it('releases the object URL after checking dimensions', async () => {
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:test', revokeObjectURL });
    vi.stubGlobal('Image', class {
      width = 800;
      height = 600;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) { queueMicrotask(() => this.onload?.()); }
    });

    await expect(validateImageDimensions(new File(['x'], 'photo.jpg'))).resolves.toMatchObject({
      valid: true,
      width: 800,
      height: 600,
    });
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });

  it('releases the object URL when image loading fails', async () => {
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:broken', revokeObjectURL });
    vi.stubGlobal('Image', class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) { queueMicrotask(() => this.onerror?.()); }
    });

    await expect(validateImageDimensions(new File(['x'], 'broken.jpg'))).resolves.toMatchObject({ valid: false });
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:broken');
  });
});

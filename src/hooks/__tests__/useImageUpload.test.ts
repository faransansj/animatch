import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useImageUpload } from '@/hooks/useImageUpload';

const mocks = vi.hoisted(() => ({
  store: {
    setRawImageData: vi.fn(),
    setProcessedImageData: vi.fn(),
    setFeedbackItems: vi.fn(),
    setError: vi.fn(),
    clearError: vi.fn(),
  },
  validateAndSanitizeFile: vi.fn(),
  processImage: vi.fn(),
}));

vi.mock('@/stores/uploadStore', () => ({ useUploadStore: () => mocks.store }));
vi.mock('@/utils/fileValidation', () => ({
  validateAndSanitizeFile: mocks.validateAndSanitizeFile,
}));
vi.mock('@/utils/image', () => ({ processImage: mocks.processImage }));

beforeEach(() => vi.clearAllMocks());

describe('useImageUpload', () => {
  it('reads and processes validated file data once', async () => {
    mocks.validateAndSanitizeFile.mockResolvedValue({
      valid: true,
      sanitizedData: 'data:image/jpeg;base64,AAAA',
    });
    mocks.processImage.mockResolvedValue({
      dataURL: 'data:image/jpeg;base64,BBBB',
      feedback: [{ pass: true, passText: 'ok', failText: 'bad' }],
    });
    const { result } = renderHook(() => useImageUpload());

    await act(() => result.current.handleFile(new File(['image'], 'photo.jpg', { type: 'image/jpeg' })));

    expect(mocks.validateAndSanitizeFile).toHaveBeenCalledTimes(1);
    expect(mocks.processImage).toHaveBeenCalledOnce();
    expect(mocks.processImage).toHaveBeenCalledWith('data:image/jpeg;base64,AAAA');
    expect(mocks.store.setRawImageData).toHaveBeenCalledWith('data:image/jpeg;base64,BBBB');
    expect(mocks.store.setFeedbackItems).toHaveBeenCalledTimes(1);
  });

  it('reports validation failures without processing', async () => {
    mocks.validateAndSanitizeFile.mockResolvedValue({ valid: false, error: 'Invalid image' });
    const { result } = renderHook(() => useImageUpload());

    await act(() => result.current.handleFile(new File(['bad'], 'bad.exe')));

    expect(mocks.store.setError).toHaveBeenCalledWith('Invalid image');
    expect(mocks.processImage).not.toHaveBeenCalled();
  });

  it('rejects malformed data URLs', async () => {
    const { result } = renderHook(() => useImageUpload());

    await act(() => result.current.handleDataURL('not-a-data-url'));

    expect(mocks.store.setError).toHaveBeenCalledWith('Invalid image data format');
    expect(mocks.processImage).not.toHaveBeenCalled();
  });
});

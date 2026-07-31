import { useCallback } from 'react';
import { useUploadStore } from '@/stores/uploadStore';
import { processImage } from '@/utils/image';
import { validateAndSanitizeFile } from '@/utils/fileValidation';

export function useImageUpload() {
  const {
    setRawImageData,
    setProcessedImageData,
    setFeedbackItems,
    setError,
    clearError
  } = useUploadStore();

  const processDataURL = useCallback(async (dataURL: string) => {
    try {
      clearError();

      const processed = await processImage(dataURL);
      setRawImageData(processed.dataURL);
      setProcessedImageData(processed.dataURL);
      setFeedbackItems(processed.feedback);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process image';
      setError(errorMessage);
      console.error('Image processing error:', error);
    }
  }, [setRawImageData, setProcessedImageData, setFeedbackItems, setError, clearError]);

  const handleFile = useCallback(async (file: File) => {
    try {
      clearError();

      const validation = await validateAndSanitizeFile(file);
      if (!validation.valid || !validation.sanitizedData) {
        setError(validation.error || 'Failed to validate file');
        return;
      }

      await processDataURL(validation.sanitizedData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process file';
      setError(errorMessage);
      console.error('File processing error:', error);
    }
  }, [processDataURL, setError, clearError]);

  const handleDataURL = useCallback(async (dataURL: string) => {
    try {
      clearError();

      // Validate data URL format
      if (!dataURL || !dataURL.startsWith('data:')) {
        setError('Invalid image data format');
        return;
      }

      // Process the data URL with validation
      await processDataURL(dataURL);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process image data';
      setError(errorMessage);
      console.error('DataURL processing error:', error);
    }
  }, [processDataURL, setError, clearError]);

  return { handleFile, handleDataURL };
}

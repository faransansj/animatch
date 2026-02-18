import { useCallback } from 'react';
import { useUploadStore } from '@/stores/uploadStore';
import { runGuidelineCheck } from '@/utils/image';

export function useImageUpload() {
  const { setRawImageData, setProcessedImageData, setFeedbackItems } = useUploadStore();

  const processDataURL = useCallback(async (dataURL: string) => {
    setRawImageData(dataURL);
    setProcessedImageData(dataURL);
    const feedback = await runGuidelineCheck(dataURL);
    setFeedbackItems(feedback);
  }, [setRawImageData, setProcessedImageData, setFeedbackItems]);

  const handleFile = useCallback(async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataURL = e.target?.result as string;
      processDataURL(dataURL);
    };
    reader.readAsDataURL(file);
  }, [processDataURL]);

  const handleDataURL = useCallback(async (dataURL: string) => {
    processDataURL(dataURL);
  }, [processDataURL]);

  return { handleFile, handleDataURL };
}

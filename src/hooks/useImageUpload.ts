import { useCallback } from 'react';
import { useUploadStore } from '@/stores/uploadStore';
import { runGuidelineCheck } from '@/utils/image';

export function useImageUpload() {
  const { setRawImageData, setProcessedImageData, setFeedbackItems } = useUploadStore();

  const handleFile = useCallback(async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataURL = e.target?.result as string;
      setRawImageData(dataURL);
      setProcessedImageData(dataURL);
      const feedback = await runGuidelineCheck(dataURL);
      setFeedbackItems(feedback);
    };
    reader.readAsDataURL(file);
  }, [setRawImageData, setProcessedImageData, setFeedbackItems]);

  return { handleFile };
}

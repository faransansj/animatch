/**
 * File validation and sanitization utilities for security
 */

// Maximum file size: 10MB
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed MIME types for images
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif', // Limited support for GIFs
];

// Allowed file extensions
export const ALLOWED_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
];

// Maximum image dimensions
export const MAX_IMAGE_DIMENSIONS = {
  width: 4096,
  height: 4096,
};

// Minimum image dimensions for face detection
export const MIN_IMAGE_DIMENSIONS = {
  width: 200,
  height: 200,
};

/**
 * Validate file type and extension
 */
export function validateFileType(file: File): { valid: boolean; error?: string } {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed. Only JPEG, PNG, WebP, and GIF images are supported.`
    };
  }

  // Check file extension (case-insensitive)
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
    return {
      valid: false,
      error: `File extension ${fileExtension} is not allowed. Only .jpg, .jpeg, .png, .webp, and .gif files are supported.`
    };
  }

  return { valid: true };
}

/**
 * Validate file size
 */
export function validateFileSize(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size (${formatFileSize(file.size)}) exceeds the maximum limit (${formatFileSize(MAX_FILE_SIZE)}).`
    };
  }

  if (file.size < 1024) { // Less than 1KB
    return {
      valid: false,
      error: `File size (${formatFileSize(file.size)}) is too small. Please upload a valid image file.`
    };
  }

  return { valid: true };
}

/**
 * Validate image dimensions
 */
export async function validateImageDimensions(file: File): Promise<{ valid: boolean; error?: string; width?: number; height?: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    const finish = (result: { valid: boolean; error?: string; width?: number; height?: number }) => {
      URL.revokeObjectURL(objectUrl);
      resolve(result);
    };

    img.onload = () => {
      const { width, height } = img;
      if (width > MAX_IMAGE_DIMENSIONS.width || height > MAX_IMAGE_DIMENSIONS.height) {
        finish({
          valid: false,
          error: `Image dimensions (${width}x${height}) exceed the maximum limit (${MAX_IMAGE_DIMENSIONS.width}x${MAX_IMAGE_DIMENSIONS.height}).`
        });
        return;
      }

      if (width < MIN_IMAGE_DIMENSIONS.width || height < MIN_IMAGE_DIMENSIONS.height) {
        finish({
          valid: false,
          error: `Image dimensions (${width}x${height}) are too small for face detection. Minimum required is ${MIN_IMAGE_DIMENSIONS.width}x${MIN_IMAGE_DIMENSIONS.height}.`
        });
        return;
      }

      finish({ valid: true, width, height });
    };

    img.onerror = () => finish({
      valid: false,
      error: 'Failed to load image. The file may be corrupted or not a valid image.'
    });
    img.src = objectUrl;
  });
}

/**
 * Sanitize image data to prevent XSS attacks
 */
export function sanitizeImageData(dataURL: string): string {
  const sanitized = dataURL.trim();

  // Ensure proper data URL format
  if (!sanitized.match(/^data:image\/[a-z]+;base64,/)) {
    throw new Error('Invalid data URL format');
  }

  // Limit data URL length to prevent memory issues
  if (sanitized.length > 50 * 1024 * 1024) { // 50MB limit
    throw new Error('Image data too large');
  }

  return sanitized;
}

/**
 * Validate and sanitize file upload
 */
export async function validateAndSanitizeFile(file: File): Promise<{ valid: boolean; error?: string; sanitizedData?: string }> {
  // Validate file type
  const typeValidation = validateFileType(file);
  if (!typeValidation.valid) {
    return { valid: false, error: typeValidation.error };
  }

  // Validate file size
  const sizeValidation = validateFileSize(file);
  if (!sizeValidation.valid) {
    return { valid: false, error: sizeValidation.error };
  }

  try {
    // Convert to data URL and sanitize
    const dataURL = await fileToDataURL(file);
    const sanitizedData = sanitizeImageData(dataURL);

    return { valid: true, sanitizedData };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Failed to process file'
    };
  }
}

/**
 * Convert file to data URL with error handling
 */
export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const result = e.target?.result as string;
        if (!result || !result.startsWith('data:')) {
          throw new Error('Invalid file data');
        }
        resolve(result);
      } catch (error) {
        reject(new Error('Failed to read file data'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.onabort = () => {
      reject(new Error('File reading was aborted'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';

  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Check if file is safe for web processing
 */
export async function isFileSafeForWeb(file: File): Promise<boolean> {
  try {
    const [fileResult, dimensionsResult] = await Promise.all([
      validateAndSanitizeFile(file),
      validateImageDimensions(file),
    ]);
    return fileResult.valid && dimensionsResult.valid;
  } catch {
    return false;
  }
}

/**
 * Advanced file validation with additional security checks
 */
export async function advancedFileValidation(file: File): Promise<{
  valid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic validation
  const typeValidation = validateFileType(file);
  if (!typeValidation.valid) {
    errors.push(typeValidation.error!);
  }

  const sizeValidation = validateFileSize(file);
  if (!sizeValidation.valid) {
    errors.push(sizeValidation.error!);
  }

  // Check for suspicious file names
  const suspiciousPatterns = [
    /script/i,
    /eval/i,
    /exec/i,
    /command/i,
    /shell/i,
    /\.php$/i,
    /\.html$/i,
    /\.htm$/i,
    /\.js$/i,
    /\.svg$/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(file.name)) {
      warnings.push(`File name "${file.name}" contains suspicious characters.`);
      break;
    }
  }

  // Check file extension vs MIME type consistency
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
  const expectedMimeType = ALLOWED_MIME_TYPES.find(type =>
    type.includes(fileExtension.replace('.', ''))
  );

  if (expectedMimeType && file.type !== expectedMimeType) {
    warnings.push(`File extension ${fileExtension} doesn't match MIME type ${file.type}.`);
  }

  // Validate image dimensions
  try {
    const dimensionsValidation = await validateImageDimensions(file);
    if (!dimensionsValidation.valid) {
      errors.push(dimensionsValidation.error!);
    } else if (dimensionsValidation.width && dimensionsValidation.height) {
      // Warn about extremely large images that might cause performance issues
      if (dimensionsValidation.width > 2000 || dimensionsValidation.height > 2000) {
        warnings.push('Image is very large and may cause performance issues during processing.');
      }
    }
  } catch (error) {
    errors.push('Failed to validate image dimensions.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
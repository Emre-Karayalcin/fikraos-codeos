import { Request } from 'express';
import fs from 'fs';

/**
 * File magic numbers (file signatures) for validation
 * These are the first few bytes of files that identify their type
 */
const FILE_SIGNATURES = {
  // Images
  png: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
  jpg: Buffer.from([0xFF, 0xD8, 0xFF]),
  jpeg: Buffer.from([0xFF, 0xD8, 0xFF]),
  gif: Buffer.from([0x47, 0x49, 0x46, 0x38]),
  webp: Buffer.from([0x52, 0x49, 0x46, 0x46]), // RIFF header (WebP starts with RIFF....WEBP)

  // Documents
  pdf: Buffer.from([0x25, 0x50, 0x44, 0x46]), // %PDF

  // Archives
  zip: Buffer.from([0x50, 0x4B, 0x03, 0x04]),

  // Text/JSON (no magic number, but we can check for valid JSON structure)
};

/**
 * Validate file content by checking magic numbers (file signatures)
 * This prevents attackers from renaming malicious files with allowed extensions
 *
 * SECURITY: This is defense-in-depth - combining with MIME type and extension checks
 */
export async function validateFileContent(
  filePath: string,
  expectedType: 'image' | 'json' | 'pdf' | 'zip'
): Promise<boolean> {
  try {
    // Read first 12 bytes of the file (enough for most magic numbers)
    const buffer = Buffer.alloc(12);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 12, 0);
    fs.closeSync(fd);

    switch (expectedType) {
      case 'image':
        return (
          buffer.subarray(0, 8).equals(FILE_SIGNATURES.png) ||
          buffer.subarray(0, 3).equals(FILE_SIGNATURES.jpg) ||
          buffer.subarray(0, 4).equals(FILE_SIGNATURES.gif) ||
          buffer.subarray(0, 4).equals(FILE_SIGNATURES.webp)
        );

      case 'pdf':
        return buffer.subarray(0, 4).equals(FILE_SIGNATURES.pdf);

      case 'zip':
        return buffer.subarray(0, 4).equals(FILE_SIGNATURES.zip);

      case 'json':
        // For JSON, validate it's actually valid JSON
        const content = fs.readFileSync(filePath, 'utf-8');
        try {
          JSON.parse(content);
          return true;
        } catch {
          return false;
        }

      default:
        return false;
    }
  } catch (error) {
    console.error('File validation error:', error);
    return false;
  }
}

/**
 * Sanitize filename to prevent directory traversal attacks
 */
export function sanitizeFilename(filename: string): string {
  // Remove any path components and special characters
  return filename
    .replace(/^.*[\\\/]/, '') // Remove path
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
    .substring(0, 255); // Limit length
}

/**
 * Check if file size is within allowed limits
 */
export function validateFileSize(size: number, maxSizeInBytes: number): boolean {
  return size > 0 && size <= maxSizeInBytes;
}

/**
 * Comprehensive file validation
 */
export interface FileValidationOptions {
  allowedExtensions: string[];
  allowedMimeTypes: string[];
  maxSizeInBytes: number;
  validateContent?: 'image' | 'json' | 'pdf' | 'zip';
}

export async function validateUploadedFile(
  file: Express.Multer.File,
  options: FileValidationOptions
): Promise<{ valid: boolean; error?: string }> {
  // Check file extension
  const ext = file.originalname.toLowerCase().split('.').pop() || '';
  if (!options.allowedExtensions.includes(`.${ext}`)) {
    return { valid: false, error: `Invalid file extension: .${ext}` };
  }

  // Check MIME type
  if (!options.allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
    return { valid: false, error: `Invalid MIME type: ${file.mimetype}` };
  }

  // Check file size
  if (!validateFileSize(file.size, options.maxSizeInBytes)) {
    return { valid: false, error: `File size exceeds limit of ${options.maxSizeInBytes} bytes` };
  }

  // Validate file content if path is available
  if (options.validateContent && file.path) {
    const isValidContent = await validateFileContent(file.path, options.validateContent);
    if (!isValidContent) {
      return { valid: false, error: 'File content does not match declared type' };
    }
  }

  return { valid: true };
}

import { Storage } from '@google-cloud/storage';
import { randomBytes } from 'crypto';
import path from 'path';

// Initialize Google Cloud Storage client
// Cloud Run automatically uses service account credentials
const storage = new Storage();
const bucketName = 'pro-fikrahub-dev-uploads';
const bucket = storage.bucket(bucketName);

export interface UploadOptions {
  file: Express.Multer.File;
  folder: string; // e.g., 'logos', 'avatars'
  organizationId?: string; // For multi-tenant isolation
}

export interface UploadResult {
  url: string;
  filename: string;
  size: number;
  mimetype: string;
}

/**
 * Upload file to Google Cloud Storage
 */
export async function uploadToGCS(options: UploadOptions): Promise<UploadResult> {
  const { file, folder, organizationId } = options;

  // Generate unique filename
  const uniqueSuffix = `${Date.now()}-${randomBytes(8).toString('hex')}`;
  const ext = path.extname(file.originalname);
  const nameWithoutExt = path.basename(file.originalname, ext);
  const filename = `${nameWithoutExt}-${uniqueSuffix}${ext}`;

  // Create GCS path with organization isolation
  const gcsPath = organizationId
    ? `${organizationId}/${folder}/${filename}`
    : `${folder}/${filename}`;

  // Create file reference in bucket
  const blob = bucket.file(gcsPath);

  // Upload file buffer to GCS
  await blob.save(file.buffer, {
    contentType: file.mimetype,
    metadata: {
      cacheControl: 'public, max-age=31536000', // 1 year cache
    },
    // No public: true needed - bucket-level IAM handles public access
  });

  // Get public URL
  const publicUrl = `https://storage.googleapis.com/${bucketName}/${gcsPath}`;

  return {
    url: publicUrl,
    filename,
    size: file.size,
    mimetype: file.mimetype,
  };
}

/**
 * Delete file from Google Cloud Storage
 */
export async function deleteFromGCS(fileUrl: string): Promise<void> {
  try {
    // Extract GCS path from URL
    // URL format: https://storage.googleapis.com/BUCKET/PATH
    const urlPattern = new RegExp(`https://storage\\.googleapis\\.com/${bucketName}/(.+)`);
    const match = fileUrl.match(urlPattern);

    if (!match) {
      console.warn('Invalid GCS URL format:', fileUrl);
      return;
    }

    const gcsPath = match[1];
    await bucket.file(gcsPath).delete();
    console.log(`Deleted file from GCS: ${gcsPath}`);
  } catch (error) {
    console.error('Error deleting file from GCS:', error);
    // Don't throw - file might already be deleted
  }
}

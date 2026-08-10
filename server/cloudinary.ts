import { v2 as cloudinary } from 'cloudinary';
import { db } from './db';
import fs from 'fs';

export function getCloudinaryConfig() {
  const dbSettings = db.getCloudinarySettings ? db.getCloudinarySettings() : { cloudName: '', apiKey: '', apiSecret: '', enabled: true };
  
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || dbSettings.cloudName || '';
  const apiKey = process.env.CLOUDINARY_API_KEY || dbSettings.apiKey || '';
  const apiSecret = process.env.CLOUDINARY_API_SECRET || dbSettings.apiSecret || '';
  const enabled = dbSettings.enabled !== false;

  return {
    cloudName,
    apiKey,
    apiSecret,
    folder: dbSettings.folder || 'payment_proofs',
    isConfigured: Boolean(cloudName && apiKey && apiSecret && enabled),
  };
}

export function isCloudinaryConfigured(): boolean {
  const config = getCloudinaryConfig();
  return config.isConfigured;
}

export async function uploadToCloudinary(
  fileInput: string | Buffer,
  filename?: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  const config = getCloudinaryConfig();

  if (!config.isConfigured) {
    return {
      success: false,
      error: 'Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
    };
  }

  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true,
  });

  try {
    if (typeof fileInput === 'string') {
      // Local file path
      const result = await cloudinary.uploader.upload(fileInput, {
        folder: config.folder,
        resource_type: 'auto',
      });
      return { success: true, url: result.secure_url };
    } else if (Buffer.isBuffer(fileInput)) {
      // Buffer upload via upload_stream
      return new Promise((resolve) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: config.folder,
            resource_type: 'auto',
            filename_override: filename,
          },
          (error, result) => {
            if (error || !result) {
              console.error('[Cloudinary] Stream upload error:', error);
              resolve({ success: false, error: error?.message || 'Cloudinary stream upload failed' });
            } else {
              resolve({ success: true, url: result.secure_url });
            }
          }
        );
        uploadStream.end(fileInput);
      });
    }

    return { success: false, error: 'Invalid file input' };
  } catch (err: any) {
    console.error('[Cloudinary] Upload exception:', err);
    return { success: false, error: err.message || 'Cloudinary upload error' };
  }
}

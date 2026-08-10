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

export async function testCloudinaryConnection(): Promise<{ success: boolean; message: string; cloudName?: string }> {
  const config = getCloudinaryConfig();
  if (!config.isConfigured) {
    return { success: false, message: 'Cloudinary credentials are missing or disabled.' };
  }

  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true,
  });

  try {
    const pingResult = await cloudinary.api.ping();
    if (pingResult.status === 'ok') {
      return { success: true, message: 'Cloudinary connected successfully!', cloudName: config.cloudName };
    }
    return { success: false, message: 'Cloudinary ping failed.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to connect to Cloudinary' };
  }
}

export async function getCloudinaryStorageStats() {
  const config = getCloudinaryConfig();
  if (!config.isConfigured) {
    return {
      isConnected: false,
      cloudName: '',
      folders: [
        { name: 'payment_proofs', label: 'Payment Proof Screenshots', description: 'Donor payment screenshot proofs uploaded during donation', count: 0 },
        { name: 'media_videos', label: 'Video Media Assets', description: 'OBS alert background videos and video overlays', count: 0 },
        { name: 'media_sounds', label: 'Sound Effect Assets', description: 'OBS alert sound audio files and sound effects', count: 0 },
        { name: 'media_stickers', label: 'Sticker Media Assets', description: 'Animated stickers and image overlays', count: 0 },
      ],
      usage: {
        storageBytes: 0,
        storageLimitBytes: 10737418240,
        bandwidthBytes: 0,
        bandwidthLimitBytes: 26843545600,
        objectsCount: 0,
        plan: 'Free / Unconfigured',
        creditsUsed: 0,
        creditsLimit: 25,
      },
      error: 'Cloudinary is not configured',
    };
  }

  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true,
  });

  let isConnected = false;
  let usageResult: any = null;
  try {
    usageResult = await cloudinary.api.usage();
    isConnected = true;
  } catch (err: any) {
    console.error('[Cloudinary] Failed to fetch usage stats:', err.message);
  }

  const folderNames = [
    { name: 'payment_proofs', label: 'Payment Proof Screenshots', description: 'Donor payment screenshot proofs uploaded during donation' },
    { name: 'media_videos', label: 'Video Media Assets', description: 'OBS alert background videos and video overlays' },
    { name: 'media_sounds', label: 'Sound Effect Assets', description: 'OBS alert sound audio files and sound effects' },
    { name: 'media_stickers', label: 'Sticker Media Assets', description: 'Animated stickers and image overlays' },
  ];

  const foldersWithCounts = await Promise.all(
    folderNames.map(async (f) => {
      let count = 0;
      let sizeBytes = 0;
      if (isConnected) {
        try {
          const searchRes = await cloudinary.search
            .expression(`folder:${f.name}/* OR folder:${f.name}`)
            .max_results(500)
            .execute();
          count = searchRes.total_count ?? searchRes.resources?.length ?? 0;
          if (searchRes.resources && Array.isArray(searchRes.resources)) {
            sizeBytes = searchRes.resources.reduce((acc: number, r: any) => acc + (r.bytes || 0), 0);
          }
        } catch (e) {
          try {
            const fetchRes = async (resType: 'image' | 'video' | 'raw') => {
              const res = await cloudinary.api.resources({ type: 'upload', prefix: `${f.name}/`, resource_type: resType, max_results: 500 });
              const list = res.resources || [];
              const c = list.length;
              const b = list.reduce((acc: number, r: any) => acc + (r.bytes || 0), 0);
              return { count: c, bytes: b };
            };
            const [img, vid, raw] = await Promise.all([
              fetchRes('image').catch(() => ({ count: 0, bytes: 0 })),
              fetchRes('video').catch(() => ({ count: 0, bytes: 0 })),
              fetchRes('raw').catch(() => ({ count: 0, bytes: 0 })),
            ]);
            count = img.count + vid.count + raw.count;
            sizeBytes = img.bytes + vid.bytes + raw.bytes;
          } catch (err2) {
            console.warn(`[Cloudinary] Could not count resources for ${f.name}:`, err2);
          }
        }
      }
      return {
        ...f,
        count,
        sizeBytes,
      };
    })
  );

  const storageUsage = usageResult?.storage?.usage || 0;
  const storageLimit = usageResult?.storage?.limit || 10737418240;
  const bandwidthUsage = usageResult?.bandwidth?.usage || 0;
  const bandwidthLimit = usageResult?.bandwidth?.limit || 26843545600;
  const objectsCount = usageResult?.objects?.usage || 0;
  const creditsUsed = usageResult?.credits?.usage || 0;
  const creditsLimit = usageResult?.credits?.limit || 25;
  const plan = usageResult?.plan || 'Free Plan';

  return {
    isConnected,
    cloudName: config.cloudName,
    folders: foldersWithCounts,
    usage: {
      storageBytes: storageUsage,
      storageLimitBytes: storageLimit,
      bandwidthBytes: bandwidthUsage,
      bandwidthLimitBytes: bandwidthLimit,
      objectsCount,
      plan,
      creditsUsed,
      creditsLimit,
    },
  };
}

export async function deleteCloudinaryFolderItems(folderName: string): Promise<{ success: boolean; deletedCount: number; message: string }> {
  const config = getCloudinaryConfig();
  if (!config.isConfigured) {
    return { success: false, deletedCount: 0, message: 'Cloudinary is not configured.' };
  }

  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true,
  });

  let totalDeleted = 0;
  const resourceTypes: ('image' | 'video' | 'raw')[] = ['image', 'video', 'raw'];

  for (const rType of resourceTypes) {
    try {
      const res = await cloudinary.api.delete_resources_by_prefix(`${folderName}/`, { resource_type: rType });
      if (res.deleted) {
        const count = Object.keys(res.deleted).length;
        totalDeleted += count;
      }
    } catch (e: any) {
      if (!e?.message?.includes('not found')) {
        console.warn(`[Cloudinary] delete prefix error for ${rType}:`, e.message);
      }
    }
  }

  try {
    await cloudinary.api.delete_folder(folderName);
  } catch (e) {
    // Ignore folder delete error
  }

  return {
    success: true,
    deletedCount: totalDeleted,
    message: totalDeleted > 0 ? `Successfully deleted ${totalDeleted} files from folder '${folderName}'.` : `Folder '${folderName}' is already empty or cleared.`,
  };
}

export async function uploadToCloudinary(
  fileInput: string | Buffer,
  filename?: string,
  customFolder?: string
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

  const folder = customFolder || config.folder || 'media_assets';

  try {
    if (typeof fileInput === 'string') {
      // Local file path
      const result = await cloudinary.uploader.upload(fileInput, {
        folder,
        resource_type: 'auto',
      });
      return { success: true, url: result.secure_url };
    } else if (Buffer.isBuffer(fileInput)) {
      // Buffer upload via upload_stream
      return new Promise((resolve) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
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

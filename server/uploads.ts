import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { put } from '@vercel/blob';

const allowedMimeTypes = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'video/mp4',
  'video/webm',
];

// Use memoryStorage to avoid local filesystem disk directory dependency
const storage = multer.memoryStorage();

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max limit
  },
  fileFilter: (_req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type (${file.mimetype}). Allowed: Images, Audio (MP3/WAV/OGG), Video (MP4/WebM)`));
    }
  },
});

/**
 * Saves uploaded file buffer to Vercel Blob storage if BLOB_READ_WRITE_TOKEN is set,
 * or converts to Base64 Data URL so no local filesystem write is needed.
 */
export async function saveUploadedFile(file: Express.Multer.File): Promise<string> {
  const ext = path.extname(file.originalname).toLowerCase() || '.png';
  const randomName = crypto.randomBytes(12).toString('hex');
  const filename = `uploads/${Date.now()}-${randomName}${ext}`;

  // Priority 1: Upload to Vercel Blob if token exists
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const blob = await put(filename, file.buffer, {
        access: 'public',
        contentType: file.mimetype,
      });
      return blob.url;
    } catch (err) {
      console.error('[Vercel Blob] Upload error, falling back to Data URL:', err);
    }
  }

  // Priority 2: Return Data URL (In-memory, self-contained without disk reliance)
  const base64Data = file.buffer.toString('base64');
  return `data:${file.mimetype};base64,${base64Data}`;
}

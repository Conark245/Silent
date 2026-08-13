import multer from 'multer';

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

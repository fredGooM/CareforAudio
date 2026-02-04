import multer from 'multer';
import path from 'path';

const storage = multer.memoryStorage();

const allowedExtensions = ['.mp3', '.wav', '.aiff', '.aif', '.webm'];
const allowedMimeTypes = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/aiff',
  'audio/x-aiff',
  'audio/webm'
];

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(ext) || !allowedMimeTypes.includes(file.mimetype)) {
    cb(new Error('Only .mp3, .wav or .aiff audio files (max 50MB) are allowed'));
    return;
  }
  cb(null, true);
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024
  }
});

const imageMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

const imageFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!imageExtensions.includes(ext) || !imageMimeTypes.includes(file.mimetype)) {
    cb(new Error('Only image files (.jpg, .png, .webp, .gif) are allowed'));
    return;
  }
  cb(null, true);
};

export const imageUploadMiddleware = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

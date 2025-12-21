import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Configuration du stockage local
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'uploads');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const allowedExtensions = ['.mp3', '.wav', '.aiff'];
const allowedMimeTypes = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/aiff',
  'audio/x-aiff'
];

// Filtre pour n'accepter que MP3/WAV
const fileFilter = (req: any, file: any, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(ext) || !allowedMimeTypes.includes(file.mimetype)) {
    cb(new Error('Only .mp3, .wav or .aiff audio files (max 50MB) are allowed'));
    return;
  }
  cb(null, true);
};

export const uploadMiddleware = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Helper pour générer l'URL publique locale
export const getPublicUrl = (filename: string) => {
  const baseUrl = process.env.API_URL || 'http://localhost:3000';
  return `${baseUrl}/uploads/${filename}`;
};

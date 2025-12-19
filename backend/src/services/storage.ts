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

// Filtre pour n'accepter que l'audio
const fileFilter = (req: any, file: any, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('audio/') || file.mimetype === 'application/octet-stream') {
    cb(null, true);
  } else {
    cb(new Error('Only audio files are allowed!'));
  }
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
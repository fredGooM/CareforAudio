import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import audioRoutes from './routes/audios';
import userRoutes from './routes/users';
import analyticsRoutes from './routes/analytics';
import { isLocalStorage, localUploadDir } from './services/gcs';

dotenv.config();

const app = express();
app.set('trust proxy', process.env.TRUST_PROXY || 'loopback');
const PORT = process.env.PORT || 3000;

// Security & Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow serving static files to other origins (frontend)
}) as any);
app.use(cors({ origin: '*' }) as any);
app.use(express.json() as any);

if (isLocalStorage) {
  app.use('/uploads', express.static(localUploadDir) as any);
  console.log(`📂 Serving local uploads from ${localUploadDir}`);
}

// Basic health check
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// API Routes
app.use('/auth', authRoutes);
app.use('/audios', audioRoutes);
app.use('/users', userRoutes);
app.use('/analytics', analyticsRoutes);

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📦 Using Google Cloud Storage bucket: ${process.env.GCS_BUCKET_NAME || 'unknown'}`);
});

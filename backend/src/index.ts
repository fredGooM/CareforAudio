import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import authRoutes from './routes/auth';
import audioRoutes from './routes/audios';
import userRoutes from './routes/users';
import analyticsRoutes from './routes/analytics';

dotenv.config();

const app = express();
app.set('trust proxy', process.env.TRUST_PROXY || 'loopback');
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`Created upload directory at ${uploadDir}`);
}

// Security & Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow serving static files to other origins (frontend)
}) as any);
app.use(cors({ origin: '*' }) as any);
app.use(express.json() as any);

// Serve Uploaded Files Statically (Local Storage Strategy)
app.use('/uploads', express.static(uploadDir) as any);

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
  console.log(`📂 Serving files from ${uploadDir}`);
});

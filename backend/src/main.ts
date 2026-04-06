import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import * as express from 'express';
import * as path from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api');

  // CORS
  app.enableCors({ origin: '*' });

  // Increase body size limit for audio uploads
  app.use(express.json({ limit: '55mb' }));
  app.use(express.urlencoded({ limit: '55mb', extended: true }));

  // Serve local uploads if GCS is not configured
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (fs.existsSync(uploadsDir)) {
    app.use('/uploads', express.static(uploadsDir));
    console.log(`📂 Serving local uploads from ${uploadsDir}`);
  }

  // Health check
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.get('/health', (req: any, res: any) => {
    res.status(200).send('OK');
  });

  const port = configService.get('PORT', 3939);
  await app.listen(port);
  console.log(`🚀 NestJS server running on port ${port}`);
}

bootstrap();

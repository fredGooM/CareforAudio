import * as Minio from 'minio';
import dotenv from 'dotenv';
import { Buffer } from 'buffer';

dotenv.config();

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

const BUCKET_NAME = process.env.MINIO_BUCKET || 'podcasts';

export const getPresignedUrl = async (objectName: string) => {
  try {
    // Expires in 1 hour (3600 seconds)
    const url = await minioClient.presignedGetObject(BUCKET_NAME, objectName, 3600);
    // Docker networking fix for local dev: replace internal container host with public localhost endpoint if needed
    if (process.env.MINIO_PUBLIC_ENDPOINT) {
        return url.replace(`${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`, 'localhost:9000');
    }
    return url;
  } catch (err) {
    console.error('MinIO Presigned URL Error:', err);
    return null;
  }
};

export const uploadFile = async (objectName: string, buffer: Buffer, metaData: any) => {
    return minioClient.putObject(BUCKET_NAME, objectName, buffer, metaData);
};

export default minioClient;
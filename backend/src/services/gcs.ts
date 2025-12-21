import path from 'path';
import fs from 'fs';
import { Storage, Bucket } from '@google-cloud/storage';

const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
const bucketName = process.env.GCS_BUCKET_NAME;

let storage: Storage | null = null;
let bucket: Bucket | null = null;
let isLocalStorage = false;
const localUploadDir = path.join(process.cwd(), 'uploads');

if (bucketName) {
  let parsedCredentials: any = null;

  if (credentialsJson) {
    try {
      parsedCredentials = JSON.parse(credentialsJson);
    } catch (error) {
      console.error('Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON.');
      parsedCredentials = null;
    }
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      const filePath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      parsedCredentials = JSON.parse(fileContent);
    } catch (error) {
      console.error('Failed to load GOOGLE_APPLICATION_CREDENTIALS file.');
      parsedCredentials = null;
    }
  }

  if (parsedCredentials) {
    storage = new Storage({
      credentials: parsedCredentials,
      projectId: parsedCredentials.project_id
    });
    bucket = storage.bucket(bucketName);
  } else {
    isLocalStorage = true;
  }
} else {
  isLocalStorage = true;
}

if (isLocalStorage) {
  if (!fs.existsSync(localUploadDir)) {
    fs.mkdirSync(localUploadDir, { recursive: true });
  }
  console.warn('⚠️  GOOGLE_APPLICATION_CREDENTIALS_JSON or GCS_BUCKET_NAME missing. Using local uploads directory instead.');
}

export { storage, bucket, isLocalStorage, localUploadDir };

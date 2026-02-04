import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { bucket, isLocalStorage, localUploadDir } from './gcs';

interface UploadParams {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
  folder?: string;
}

export interface UploadResult {
  objectName: string;
  gcsUri: string;
  mimeType: string;
  size: number;
}

const getLocalPublicUrl = (objectName: string) => {
  const baseUrl = process.env.API_URL || 'http://localhost:3000';
  return `${baseUrl}/uploads/${objectName}`;
};

export const uploadToGCS = async ({ buffer, mimeType, originalName }: UploadParams): Promise<UploadResult> => {
  const ext = path.extname(originalName) || '';
  const folder = 'audios';
  const objectName = `${folder}/${uuidv4()}${ext}`;
  return uploadToGCSInFolder({ buffer, mimeType, originalName, folder, objectName });
};

export const uploadToGCSInFolder = async ({ buffer, mimeType, originalName, folder, objectName }: UploadParams & { folder: string; objectName?: string }): Promise<UploadResult> => {
  const ext = path.extname(originalName) || '';
  const finalObjectName = objectName || `${folder}/${uuidv4()}${ext}`;

  if (isLocalStorage || !bucket) {
    const localPath = path.join(localUploadDir, finalObjectName);
    await fs.promises.mkdir(path.dirname(localPath), { recursive: true });
    await fs.promises.writeFile(localPath, buffer);
    return {
      objectName: finalObjectName,
      gcsUri: localPath,
      mimeType,
      size: buffer.length
    };
  }

  const file = bucket.file(finalObjectName);

  await file.save(buffer, {
    contentType: mimeType,
    resumable: false,
    metadata: {
      cacheControl: 'private, max-age=0, no-transform'
    }
  });

  return {
    objectName: finalObjectName,
    gcsUri: `gs://${bucket.name}/${finalObjectName}`,
    mimeType,
    size: buffer.length
  };
};

export const deleteFromGCS = async (objectName: string) => {
  if (isLocalStorage || !bucket) {
    const localPath = path.join(localUploadDir, objectName);
    await fs.promises.unlink(localPath).catch(() => {});
    return;
  }

  try {
    await bucket.file(objectName).delete();
  } catch (error: any) {
    if (error?.code === 404) {
      return;
    }
    throw error;
  }
};

export const getSignedUrlForObject = async (objectName: string, expiresInSeconds = 3600) => {
  if (isLocalStorage || !bucket) {
    return getLocalPublicUrl(objectName);
  }

  const file = bucket.file(objectName);
  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + expiresInSeconds * 1000
  });
  return url;
};

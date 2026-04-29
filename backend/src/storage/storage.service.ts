import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Storage, Bucket } from '@google-cloud/storage';

export interface UploadResult {
    objectName: string;
    gcsUri: string;
    mimeType: string;
    size: number;
}

@Injectable()
export class StorageService {
    private readonly logger = new Logger(StorageService.name);
    private storage: Storage | null = null;
    private bucket: Bucket | null = null;
    private isLocalStorage = false;
    private localUploadDir: string;

    constructor(private readonly configService: ConfigService) {
        this.localUploadDir = path.join(process.cwd(), 'uploads');
        this.initStorage();
    }

    private initStorage() {
        const bucketName = this.configService.get('GCS_BUCKET_NAME');
        const credentialsJson = this.configService.get(
            'GOOGLE_APPLICATION_CREDENTIALS_JSON',
        );

        if (bucketName && credentialsJson) {
            try {
                const parsed = JSON.parse(credentialsJson);
                this.storage = new Storage({
                    credentials: parsed,
                    projectId: parsed.project_id,
                });
                this.bucket = this.storage.bucket(bucketName);
                this.logger.log(`Using GCS bucket: ${bucketName}`);
                return;
            } catch {
                this.logger.error('Failed to parse GCS credentials');
            }
        }

        this.isLocalStorage = true;
        if (!fs.existsSync(this.localUploadDir)) {
            fs.mkdirSync(this.localUploadDir, { recursive: true });
        }
        this.logger.warn('Using local uploads directory (no GCS configured)');
    }

    async upload(
        buffer: Buffer,
        mimeType: string,
        originalName: string,
        folder = 'audios',
    ): Promise<UploadResult> {
        const ext = path.extname(originalName) || '';
        const objectName = `${folder}/${crypto.randomUUID()}${ext}`;

        if (this.isLocalStorage || !this.bucket) {
            const localPath = path.join(this.localUploadDir, objectName);
            await fs.promises.mkdir(path.dirname(localPath), { recursive: true });
            await fs.promises.writeFile(localPath, buffer);
            return { objectName, gcsUri: localPath, mimeType, size: buffer.length };
        }

        const file = this.bucket.file(objectName);
        await file.save(buffer, {
            contentType: mimeType,
            resumable: false,
            metadata: { cacheControl: 'private, max-age=0, no-transform' },
        });

        return {
            objectName,
            gcsUri: `gs://${this.bucket.name}/${objectName}`,
            mimeType,
            size: buffer.length,
        };
    }

    async uploadFromFile(filePath: string, objectName: string, mimeType: string): Promise<UploadResult> {
        const stats = await fs.promises.stat(filePath);

        if (this.isLocalStorage || !this.bucket) {
            const localPath = path.join(this.localUploadDir, objectName);
            await fs.promises.mkdir(path.dirname(localPath), { recursive: true });
            await fs.promises.copyFile(filePath, localPath);
            return { objectName, gcsUri: localPath, mimeType, size: stats.size };
        }

        const file = this.bucket.file(objectName);
        await new Promise<void>((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(file.createWriteStream({
                    contentType: mimeType,
                    resumable: true,
                    metadata: { cacheControl: 'private, max-age=0, no-transform' },
                }))
                .on('finish', resolve)
                .on('error', reject);
        });

        return {
            objectName,
            gcsUri: `gs://${this.bucket.name}/${objectName}`,
            mimeType,
            size: stats.size,
        };
    }

    async delete(objectName: string): Promise<void> {
        if (this.isLocalStorage || !this.bucket) {
            const localPath = path.join(this.localUploadDir, objectName);
            await fs.promises.unlink(localPath).catch(() => { });
            return;
        }
        try {
            await this.bucket.file(objectName).delete();
        } catch (error: any) {
            if (error?.code !== 404) throw error;
        }
    }

    async getSignedUrl(
        objectName: string,
        expiresInSeconds = 3600,
    ): Promise<string> {
        if (this.isLocalStorage || !this.bucket) {
            const baseUrl =
                this.configService.get('API_URL') || 'http://localhost:3939';
            return `${baseUrl}/uploads/${objectName}`;
        }
        const file = this.bucket.file(objectName);
        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + expiresInSeconds * 1000,
        });
        return url;
    }

    get isLocal(): boolean {
        return this.isLocalStorage;
    }

    get uploadDir(): string {
        return this.localUploadDir;
    }
}

import express from 'express';
import path from 'path';
import os from 'os';
import fs from 'fs';
// @ts-ignore
import { PrismaClient } from '@prisma/client';
import { parseBuffer } from 'music-metadata';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { uploadMiddleware } from '../services/upload';
import { uploadToGCS, getSignedUrlForObject, deleteFromGCS } from '../services/uploadToGCS';
// @ts-ignore
import ffmpeg from 'fluent-ffmpeg';
// @ts-ignore
import ffmpegStatic from 'ffmpeg-static';

const router = express.Router();
const prisma = new PrismaClient();
const ffmpegBinary = (ffmpegStatic as string) || '';
if (ffmpegBinary) {
    ffmpeg.setFfmpegPath(ffmpegBinary);
}

const AIFF_MIME_TYPES = new Set(['audio/aiff', 'audio/x-aiff']);
const AIFF_EXTENSIONS = new Set(['.aiff', '.aif']);

async function convertIfNeeded(file: Express.Multer.File) {
    const ext = path.extname(file.originalname).toLowerCase();
    const needsConversion = AIFF_MIME_TYPES.has(file.mimetype) || AIFF_EXTENSIONS.has(ext);

    if (!needsConversion) {
        return {
            buffer: file.buffer,
            mimeType: file.mimetype
        };
    }

    const tempInput = path.join(os.tmpdir(), `aiff-src-${uuidv4()}${ext}`);
    const tempOutput = path.join(os.tmpdir(), `aiff-dst-${uuidv4()}.wav`);
    await fs.promises.writeFile(tempInput, file.buffer);

    try {
        await new Promise<void>((resolve, reject) => {
            ffmpeg(tempInput)
                .toFormat('wav')
                .on('end', resolve)
                .on('error', reject)
                .save(tempOutput);
        });

        const convertedBuffer = await fs.promises.readFile(tempOutput);
        return {
            buffer: convertedBuffer,
            mimeType: 'audio/wav'
        };
    } finally {
        fs.promises.unlink(tempInput).catch(() => {});
        fs.promises.unlink(tempOutput).catch(() => {});
    }
}

async function detectDuration(buffer: Buffer, mimeType: string) {
    try {
        const metadata = await parseBuffer(buffer, mimeType);
        if (metadata.format.duration) {
            return Math.round(metadata.format.duration);
        }
    } catch (error) {
        console.warn('Unable to detect duration', error);
    }
    return null;
}

// Get Catalog (Filtered by Access)
router.get('/', authenticateToken, async (req: any, res: any) => {
    try {
        const authReq = req as AuthRequest;
        const userId = authReq.user!.id;
        const role = authReq.user!.role;

        let audios;

        if (role === 'ADMIN') {
            audios = await prisma.audioTrack.findMany({
                orderBy: { createdAt: 'desc' },
                include: { allowedGroups: true, allowedUsers: true }
            });
        } else {
            // Find user groups
            const userGroups = await prisma.userGroup.findMany({
                where: { userId },
                select: { groupId: true }
            });
            const groupIds = userGroups.map(ug => ug.groupId);

            // Find audios where (User has direct access) OR (User is in a Group that has access)
            audios = await prisma.audioTrack.findMany({
                where: {
                    published: true,
                    OR: [
                        { allowedUsers: { some: { userId } } },
                        { allowedGroups: { some: { groupId: { in: groupIds } } } }
                    ]
                }
            });
        }

        // Map to frontend DTO
        const mappedAudios = await Promise.all(audios.map(async (a: any) => {
            const allowedGroupIds = (a as any).allowedGroups?.map((g: any) => g.groupId) || [];
            const allowedUserIds = (a as any).allowedUsers?.map((u: any) => u.userId) || [];
            const signedUrl = a.storageKey ? await getSignedUrlForObject(a.storageKey, 3600) : '';

            return {
                id: a.id,
                title: a.title,
                description: a.description,
                duration: a.duration,
                url: signedUrl || '',
                coverUrl: a.coverUrl || 'https://picsum.photos/400/400',
                categoryId: a.categoryId || 'c1',
                mimeType: a.mimeType || 'audio/mpeg',
                tags: [],
                createdAt: a.createdAt,
                published: a.published,
                allowedGroupIds,
                allowedUserIds,
                listenCount: 0 
            };
        }));

        res.json(mappedAudios);

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
});

// Upload Audio (Admin)
router.post('/', authenticateToken, requireAdmin, uploadMiddleware.single('file'), async (req: any, res: any) => {
    try {
        const { title, description, categoryId, duration, published } = req.body;
        const file = (req as any).file as Express.Multer.File | undefined;

        if (!file || !file.buffer) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }

        const processed = await convertIfNeeded(file);
        const uploadResult = await uploadToGCS({
            buffer: processed.buffer,
            mimeType: processed.mimeType,
            originalName: file.originalname
        });

        const detectedDuration = await detectDuration(processed.buffer, processed.mimeType);
        const finalDuration = detectedDuration ?? (parseInt(duration) || 0);

        // Save to DB
        const newAudio = await prisma.audioTrack.create({
            data: {
                title,
                description,
                duration: finalDuration,
                categoryId: categoryId || 'c1',
                published: published === 'true',
                storageKey: uploadResult.objectName,
                mimeType: processed.mimeType,
                size: uploadResult.size,
                coverUrl: `https://picsum.photos/400/400?random=${Date.now()}`
            }
        });

        // Handle Permissions
        if (req.body.allowedGroupIds) {
            try {
                const groupIds = JSON.parse(req.body.allowedGroupIds);
                if (Array.isArray(groupIds)) {
                    await prisma.groupAccess.createMany({
                        data: groupIds.map((gid: string) => ({ groupId: gid, audioId: newAudio.id }))
                    });

                    // Grant direct access to all users in selected groups
                    if (groupIds.length > 0) {
                        const groupUsers = await prisma.userGroup.findMany({
                            where: { groupId: { in: groupIds } },
                            select: { userId: true }
                        });
                        const uniqueUserIds = Array.from(new Set(groupUsers.map((u) => u.userId)));
                        if (uniqueUserIds.length > 0) {
                            await prisma.audioAccess.createMany({
                                data: uniqueUserIds.map((uid: string) => ({ userId: uid, audioId: newAudio.id }))
                            });
                        }
                    }
                }
            } catch (e) { console.error('Error parsing groupIds', e); }
        }

        if (req.body.allowedUserIds) {
            try {
                const userIds = JSON.parse(req.body.allowedUserIds);
                if (Array.isArray(userIds)) {
                    await prisma.audioAccess.createMany({
                        data: userIds.map((uid: string) => ({ userId: uid, audioId: newAudio.id }))
                    });
                }
            } catch (e) { console.error('Error parsing userIds', e); }
        }

        const signedUrl = await getSignedUrlForObject(uploadResult.objectName, 3600);

        res.json({
            ...newAudio,
            url: signedUrl
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// Update permissions
router.put('/:id', authenticateToken, requireAdmin, async (req: any, res: any) => {
    const { id } = req.params;
    const { title, description, published, allowedGroupIds, allowedUserIds, duration } = req.body;

    try {
        const updateData: any = { title, description, published };
        if (duration !== undefined) {
            const parsed = parseInt(duration);
            updateData.duration = isNaN(parsed) ? 0 : parsed;
        }

        await prisma.audioTrack.update({
            where: { id },
            data: updateData
        });

        // Sync Groups
        if (Array.isArray(allowedGroupIds)) {
            await prisma.groupAccess.deleteMany({ where: { audioId: id } });
            if (allowedGroupIds.length > 0) {
                await prisma.groupAccess.createMany({
                    data: allowedGroupIds.map((gid: string) => ({ groupId: gid, audioId: id }))
                });
            }
        }

        // Sync Users
        if (Array.isArray(allowedUserIds)) {
            await prisma.audioAccess.deleteMany({ where: { audioId: id } });
            if (allowedUserIds.length > 0) {
                await prisma.audioAccess.createMany({
                    data: allowedUserIds.map((uid: string) => ({ userId: uid, audioId: id }))
                });
            }
        }

        res.json({ success: true });
    } catch(e) {
        console.error('Failed to update audio', e);
        res.status(500).json({ error: 'Update failed' });
    }
});

// Delete audio (Admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req: any, res: any) => {
    const { id } = req.params;
    try {
        const audio = await prisma.audioTrack.findUnique({ where: { id } });
        if (!audio) {
            res.status(404).json({ error: 'Audio not found' });
            return;
        }

        await prisma.audioTrack.delete({ where: { id } });
        if (audio.storageKey) {
            await deleteFromGCS(audio.storageKey).catch((err) => {
                console.warn('Failed to delete GCS object', err);
            });
        }

        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Delete failed' });
    }
});

export default router;

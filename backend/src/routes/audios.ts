import express from 'express';
import path from 'path';
import fs from 'fs';
// @ts-ignore
import { PrismaClient } from '@prisma/client';
import { parseFile } from 'music-metadata';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { uploadMiddleware, getPublicUrl } from '../services/storage';

const router = express.Router();
const prisma = new PrismaClient();
const uploadsDir = path.join(process.cwd(), 'uploads');

async function computeDuration(storageKey?: string | null) {
    if (!storageKey) return null;
    try {
        const filePath = path.join(uploadsDir, storageKey);
        const metadata = await parseFile(filePath);
        if (metadata.format.duration) {
            return Math.round(metadata.format.duration);
        }
    } catch (error) {
        console.warn(`Unable to compute duration for ${storageKey}`, error);
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
            const toCompute = audios.filter(a => !a.duration || a.duration === 0);
            await Promise.all(toCompute.map(async (audio) => {
                const duration = await computeDuration(audio.storageKey);
                if (duration) {
                    await prisma.audioTrack.update({
                        where: { id: audio.id },
                        data: { duration }
                    });
                    audio.duration = duration;
                }
            }));
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
        const mappedAudios = audios.map((a: any) => {
            const allowedGroupIds = (a as any).allowedGroups?.map((g: any) => g.groupId) || [];
            const allowedUserIds = (a as any).allowedUsers?.map((u: any) => u.userId) || [];

            // Les fichiers locaux sont stockés par nom unique (storageKey).
            const publicUrl = getPublicUrl(path.basename(a.storageKey));

            return {
                id: a.id,
                title: a.title,
                description: a.description,
                duration: a.duration,
                url: publicUrl, 
                coverUrl: a.coverUrl || 'https://picsum.photos/400/400',
                categoryId: a.categoryId || 'c1',
                tags: [],
                createdAt: a.createdAt,
                published: a.published,
                allowedGroupIds,
                allowedUserIds,
                listenCount: 0 
            };
        });

        res.json(mappedAudios);

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
});

// Upload Audio (Admin)
// Utilise uploadMiddleware.single('file') qui sauvegarde sur disque
router.post('/', authenticateToken, requireAdmin, uploadMiddleware.single('file'), async (req: any, res: any) => {
    try {
        const { title, description, categoryId, duration, published } = req.body;
        const file = (req as any).file;

        if (!file) {
             res.status(400).json({ error: 'No file uploaded' });
             return;
        }

        // 'file.filename' est le nom généré sur le disque par Multer
        const storageKey = file.filename;
        
        // Save to DB
        const newAudio = await prisma.audioTrack.create({
            data: {
                title,
                description,
                duration: parseInt(duration) || 0,
                categoryId: categoryId || 'c1',
                published: published === 'true',
                storageKey,
                mimeType: file.mimetype,
                size: file.size,
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
                }
            } catch (e) { console.error("Error parsing groupIds", e); }
        }
        
        if (req.body.allowedUserIds) {
             try {
                const userIds = JSON.parse(req.body.allowedUserIds);
                if (Array.isArray(userIds)) {
                    await prisma.audioAccess.createMany({
                    data: userIds.map((uid: string) => ({ userId: uid, audioId: newAudio.id }))
                    });
                }
             } catch (e) { console.error("Error parsing userIds", e); }
        }

        let responseAudio = newAudio;
        const detectedDuration = await computeDuration(storageKey);
        if (detectedDuration) {
            responseAudio = await prisma.audioTrack.update({
                where: { id: newAudio.id },
                data: { duration: detectedDuration }
            });
        }

        res.json(responseAudio);

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
        if (allowedGroupIds) {
            await prisma.groupAccess.deleteMany({ where: { audioId: id } });
            await prisma.groupAccess.createMany({
                data: allowedGroupIds.map((gid: string) => ({ groupId: gid, audioId: id }))
            });
        }

        // Sync Users
        if (allowedUserIds) {
             await prisma.audioAccess.deleteMany({ where: { audioId: id } });
             await prisma.audioAccess.createMany({
                data: allowedUserIds.map((uid: string) => ({ userId: uid, audioId: id }))
            });
        }

        res.json({ success: true });
    } catch(e) {
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
            const filePath = path.join(uploadsDir, audio.storageKey);
            fs.promises.unlink(filePath).catch(() => {});
        }

        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Delete failed' });
    }
});

export default router;

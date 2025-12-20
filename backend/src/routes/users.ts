import express from 'express';
import bcrypt from 'bcrypt';
import { TransactionalEmailsApi, SendSmtpEmail, ApiClient } from '@getbrevo/brevo';
// @ts-ignore
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { loadEmailConfig, emailConfigReady } from '../services/emailConfig';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    const users = await prisma.user.findMany({
        include: { groups: true }
    });
    
    // Transform to frontend DTO
    const dtos = users.map((u: any) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        isActive: u.isActive,
        groupIds: u.groups.map((g: any) => g.groupId),
        avatar: u.avatar
    }));

    res.json(dtos);
});

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    const { email, firstName, lastName, role, groupIds, password, mustChangePassword } = req.body;

    try {
        const hash = await bcrypt.hash(password || 'care1234!', 10);
        
        const newUser = await prisma.user.create({
            data: {
                email,
                firstName,
                lastName,
                role,
                passwordHash: hash,
                mustChangePassword: mustChangePassword ?? true,
                avatar: `https://picsum.photos/150/150?random=${Date.now()}`
            }
        });

        if (groupIds && Array.isArray(groupIds)) {
            await prisma.userGroup.createMany({
                data: groupIds.map((gid: string) => ({ userId: newUser.id, groupId: gid }))
            });
        }

        res.json(newUser);
    } catch (e) {
        console.error(e);
        res.status(400).json({ error: 'Creation failed, email might exist' });
    }
});

router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { firstName, lastName, role, groupIds, isActive } = req.body;

    try {
        await prisma.user.update({
            where: { id },
            data: { firstName, lastName, role, isActive }
        });

        if (groupIds) {
            await prisma.userGroup.deleteMany({ where: { userId: id } });
            await prisma.userGroup.createMany({
                data: groupIds.map((gid: string) => ({ userId: id, groupId: gid }))
            });
        }

        res.json({ success: true });
    } catch(e) {
        res.status(500).json({ error: 'Update failed' });
    }
});

router.put('/:id/audio-access', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { audioIds } = req.body;

    if (!Array.isArray(audioIds)) {
        res.status(400).json({ error: 'audioIds must be an array' });
        return;
    }

    try {
        await prisma.audioAccess.deleteMany({ where: { userId: id } });
        if (audioIds.length > 0) {
            await prisma.audioAccess.createMany({
                data: audioIds.map((audioId: string) => ({ userId: id, audioId })),
                skipDuplicates: true
            });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Failed to update audio access', error);
        res.status(500).json({ error: 'Failed to update audio access' });
    }
});

// Reset Password
router.post('/:id/reset-password', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const hash = await bcrypt.hash('care1234!', 10);
    
    await prisma.user.update({
        where: { id },
        data: { passwordHash: hash, mustChangePassword: true }
    });

    res.json({ success: true });
});

router.post('/:id/send-welcome', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    console.log(`[Email] Welcome email requested for user ${id}`);
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
        res.status(404).json({ error: 'User not found' });
        console.warn(`[Email] User ${id} not found`);
        return;
    }

    const emailConfig = loadEmailConfig();
    if (!emailConfigReady(emailConfig)) {
        res.status(400).json({ error: 'Email configuration is incomplete' });
        console.warn('[Email] Configuration incomplete');
        return;
    }

    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
        res.status(400).json({ error: 'Brevo API key missing' });
        console.warn('[Email] Missing BREVO_API_KEY');
        return;
    }

    try {
        const portalUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const provisionalPassword = 'care1234!';
        const client = ApiClient.instance;
        if (!client.authentications.apiKey) {
            client.authentications.apiKey = { type: 'apiKey', in: 'header', name: 'api-key' } as any;
        }
        client.authentications.apiKey.apiKey = apiKey;

        const transactionalApi = new TransactionalEmailsApi();

        const sendEmail = new SendSmtpEmail();
        sendEmail.templateId = emailConfig.templateId;
        sendEmail.to = [
            {
                email: user.email,
                name: `${user.firstName || ''} ${user.lastName || ''}`.trim()
            }
        ];
        sendEmail.sender = {
            email: emailConfig.fromEmail,
            name: emailConfig.fromName || 'Careformance Audio'
        };
        sendEmail.params = {
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: user.email,
            provisionalPassword,
            portalUrl
        };

        console.log(`[Email] Sending Brevo transactional email to ${user.email} with template ${emailConfig.templateId}`);
        await transactionalApi.sendTransacEmail(sendEmail);

        res.json({ success: true });
        console.log(`[Email] Welcome email sent to ${user.email}`);
    } catch (error) {
        console.error('Email sending failed', error);
        res.status(500).json({ error: 'Failed to send email' });
    }
});

export default router;

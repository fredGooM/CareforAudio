import express from 'express';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
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
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
    }

    const emailConfig = loadEmailConfig();
    if (!emailConfigReady(emailConfig)) {
        res.status(400).json({ error: 'Email configuration is incomplete' });
        return;
    }

    try {
        const transporter = nodemailer.createTransport({
            host: emailConfig.smtpHost,
            port: emailConfig.smtpPort,
            secure: emailConfig.smtpSecure,
            auth: {
                user: emailConfig.smtpUser,
                pass: emailConfig.smtpPass
            }
        });

        const portalUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const provisionalPassword = 'care1234!';

        await transporter.sendMail({
            from: emailConfig.fromName
                ? `${emailConfig.fromName} <${emailConfig.fromEmail}>`
                : emailConfig.fromEmail,
            to: user.email,
            subject: 'Bienvenue sur Careformance Audio',
            text: `Bonjour ${user.firstName || ''} ${user.lastName || ''},

Votre accès à Careformance Audio est prêt.
Identifiant : ${user.email}
Mot de passe provisoire : ${provisionalPassword}

Connectez-vous ici : ${portalUrl}

Lors de votre première connexion, vous devrez définir un nouveau mot de passe.

Bonne écoute !
L'équipe Careformance`,
            html: `<p>Bonjour ${user.firstName || ''} ${user.lastName || ''},</p>
<p>Votre accès à <strong>Careformance Audio</strong> est prêt.</p>
<ul>
  <li><strong>Identifiant :</strong> ${user.email}</li>
  <li><strong>Mot de passe provisoire :</strong> ${provisionalPassword}</li>
</ul>
<p><a href="${portalUrl}">Cliquez ici pour vous connecter</a>.</p>
<p>Lors de votre première connexion, vous devrez définir un nouveau mot de passe.</p>
<p>Bonne écoute !<br/>L'équipe Careformance</p>`
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Email sending failed', error);
        res.status(500).json({ error: 'Failed to send email' });
    }
});

export default router;

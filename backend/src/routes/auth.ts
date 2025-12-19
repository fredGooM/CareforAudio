import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
// @ts-ignore
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { rateLimit } from 'express-rate-limit';

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

const loginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, 
	limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
	standardHeaders: 'draft-7',
	legacyHeaders: false,
});

router.post('/login', loginLimiter as any, async (req: any, res: any) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Invalid credentials or inactive account' });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const accessToken = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET || 'refresh', { expiresIn: '7d' });

    // Store refresh token
    await prisma.refreshToken.create({
        data: {
            tokenHash: refreshToken, // In prod, hash this too
            userId: user.id
        }
    });

    // Flatten groups for frontend
    const userWithGroups = await prisma.user.findUnique({
        where: { id: user.id },
        include: { groups: true }
    });

    const groupIds = userWithGroups?.groups.map(ug => ug.groupId) || [];

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
        groupIds: groupIds,
        avatar: user.avatar
      }
    });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me', authenticateToken, async (req: any, res: any) => {
    try {
        const authReq = req as AuthRequest;
        const user = await prisma.user.findUnique({
            where: { id: authReq.user?.id },
            include: { groups: true }
        });
        
        if (!user) {
             (res as any).sendStatus(404);
             return;
        }

        const groupIds = user.groups.map(ug => ug.groupId);

        res.json({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isActive: user.isActive,
            mustChangePassword: user.mustChangePassword,
            groupIds: groupIds,
            avatar: user.avatar
        });
    } catch (e) {
        (res as any).sendStatus(500);
    }
});

// Change Password
router.post('/change-password', authenticateToken, async (req: any, res: any) => {
    const authReq = req as AuthRequest;
    const { password } = (req as any).body;
    if(!password || password.length < 6) {
        res.status(400).json({error: "Password too short"});
        return;
    }

    const hash = await bcrypt.hash(password, 10);
    await prisma.user.update({
        where: { id: authReq.user?.id },
        data: { passwordHash: hash, mustChangePassword: false }
    });
    
    res.json({ success: true });
});

export default router;
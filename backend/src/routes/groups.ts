import express from 'express';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const groups = await prisma.group.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(groups);
  } catch (e) {
    console.error('Failed to fetch groups', e);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  const { name } = req.body || {};
  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'Name is required' });
    return;
  }
  try {
    const group = await prisma.group.create({
      data: {
        id: uuidv4(),
        name
      }
    });
    res.json(group);
  } catch (e) {
    console.error('Failed to create group', e);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name } = req.body || {};
  if (!name) {
    res.status(400).json({ error: 'Nothing to update' });
    return;
  }
  try {
    const group = await prisma.group.update({
      where: { id },
      data: {
        name
      }
    });
    res.json(group);
  } catch (e) {
    console.error('Failed to update group', e);
    res.status(500).json({ error: 'Failed to update group' });
  }
});

export default router;

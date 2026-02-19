import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { imageUploadMiddleware } from '../services/upload';
import { deleteFromGCS, getSignedUrlForObject, uploadToGCSInFolder } from '../services/uploadToGCS';

const router = express.Router();
const prisma = new PrismaClient();

const resolveCategoryImage = async (image?: string | null) => {
  if (!image) return image || '';
  if (image.startsWith('http') || image.startsWith('/images/') || image.startsWith('/uploads/')) {
    return image;
  }
  try {
    return await getSignedUrlForObject(image);
  } catch {
    return image;
  }
};

router.get('/', authenticateToken, async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' }
    });
    const mapped = await Promise.all(categories.map(async (cat) => ({
      ...cat,
      image: await resolveCategoryImage(cat.image)
    })));
    res.json(mapped);
  } catch (e) {
    console.error('Failed to fetch categories', e);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  const { name, color, image } = req.body || {};
  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'Name is required' });
    return;
  }
  try {
    const category = await prisma.category.create({
      data: {
        name,
        color: color || 'bg-slate-100 text-slate-700',
        image: image || ''
      }
    });
    res.json(category);
  } catch (e) {
    console.error('Failed to create category', e);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, color, image } = req.body || {};
  if (!name && !color && image === undefined) {
    res.status(400).json({ error: 'Nothing to update' });
    return;
  }
  try {
    if (image === '') {
      const existing = await prisma.category.findUnique({ where: { id } });
      if (existing?.image && !existing.image.startsWith('http') && existing.image.startsWith('categories/')) {
        await deleteFromGCS(existing.image).catch(() => undefined);
      }
    }
    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(color ? { color } : {}),
        ...(image !== undefined ? { image } : {})
      }
    });
    res.json(category);
  } catch (e) {
    console.error('Failed to update category', e);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

router.post('/:id/image', authenticateToken, requireAdmin, imageUploadMiddleware.single('file'), async (req: any, res: any) => {
  const { id } = req.params;
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file || !file.buffer) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }
  try {
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    if (existing.image && !existing.image.startsWith('http') && existing.image.startsWith('categories/')) {
      await deleteFromGCS(existing.image).catch(() => undefined);
    }

    const uploadResult = await uploadToGCSInFolder({
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname,
      folder: 'categories'
    });

    const updated = await prisma.category.update({
      where: { id },
      data: { image: uploadResult.objectName }
    });

    const imageUrl = await resolveCategoryImage(updated.image);
    res.json({ ...updated, image: imageUrl });
  } catch (e) {
    console.error('Failed to upload category image', e);
    res.status(500).json({ error: 'Failed to upload category image' });
  }
});

export default router;

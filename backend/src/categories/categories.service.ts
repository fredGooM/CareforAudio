import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../entities';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class CategoriesService {
    constructor(
        @InjectRepository(Category)
        private readonly categoryRepo: Repository<Category>,
        private readonly storageService: StorageService,
    ) { }

    private async resolveImage(image?: string | null): Promise<string> {
        if (!image) return '';
        if (image.startsWith('http') || image.startsWith('/images/') || image.startsWith('/uploads/')) {
            return image;
        }
        try {
            return await this.storageService.getSignedUrl(image);
        } catch {
            return image;
        }
    }

    async findAll() {
        const categories = await this.categoryRepo.find({ order: { name: 'ASC' } });
        return Promise.all(
            categories.map(async (cat) => ({
                ...cat,
                image: await this.resolveImage(cat.image),
            })),
        );
    }

    async create(data: { name: string; color?: string; image?: string }) {
        const category = this.categoryRepo.create({
            name: data.name,
            color: data.color || 'bg-slate-100 text-slate-700',
            image: data.image || '',
        });
        return this.categoryRepo.save(category);
    }

    async update(id: string, data: { name?: string; color?: string; image?: string }) {
        if (data.image === '') {
            const existing = await this.categoryRepo.findOne({ where: { id } });
            if (existing?.image && existing.image.startsWith('categories/')) {
                await this.storageService.delete(existing.image).catch(() => { });
            }
        }
        await this.categoryRepo.update(id, {
            ...(data.name ? { name: data.name } : {}),
            ...(data.color ? { color: data.color } : {}),
            ...(data.image !== undefined ? { image: data.image } : {}),
        });
        return this.categoryRepo.findOne({ where: { id } });
    }

    async uploadImage(id: string, file: Express.Multer.File) {
        const existing = await this.categoryRepo.findOne({ where: { id } });
        if (!existing) return null;

        if (existing.image && existing.image.startsWith('categories/')) {
            await this.storageService.delete(existing.image).catch(() => { });
        }

        const result = await this.storageService.upload(
            file.buffer,
            file.mimetype,
            file.originalname,
            'categories',
        );

        await this.categoryRepo.update(id, { image: result.objectName });
        const updated = await this.categoryRepo.findOne({ where: { id } });
        const imageUrl = await this.resolveImage(updated?.image);
        return { ...updated, image: imageUrl };
    }
}

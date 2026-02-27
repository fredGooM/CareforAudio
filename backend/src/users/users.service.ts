import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserGroup, AudioAccess, UserProgress } from '../entities';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User) private readonly userRepo: Repository<User>,
        @InjectRepository(UserGroup)
        private readonly userGroupRepo: Repository<UserGroup>,
        @InjectRepository(AudioAccess)
        private readonly audioAccessRepo: Repository<AudioAccess>,
        @InjectRepository(UserProgress)
        private readonly progressRepo: Repository<UserProgress>,
    ) { }

    async findAll(currentUser: any) {
        let qs = this.userRepo.createQueryBuilder('user');
        if (currentUser.role === 'TEACHER' || currentUser.role === 'ADMIN') {
            qs = qs.where('user.createdById = :createdById', { createdById: currentUser.id });
        }
        const users = await qs.getMany();
        const allGroups = await this.userGroupRepo.find();
        return users.map((u) => ({
            id: u.id,
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
            role: u.role,
            isActive: u.isActive,
            groupIds: allGroups
                .filter((g) => g.userId === u.id)
                .map((g) => g.groupId),
            avatar: u.avatar,
            createdById: u.createdById,
        }));
    }

    async findById(id: string) {
        return this.userRepo.findOne({ where: { id } });
    }

    async findByIdForProfile(id: string) {
        const user = await this.userRepo.findOne({ where: { id } });
        if (!user) throw new BadRequestException('User not found');
        const { passwordHash, ...profile } = user;
        return profile;
    }

    async create(data: {
        email: string;
        firstName: string;
        lastName: string;
        role: string;
        password?: string;
        groupIds?: string[];
        mustChangePassword?: boolean;
    }, currentUser?: any) {
        if (currentUser && currentUser.role === 'TEACHER' && data.role !== 'ATHLETE') {
            throw new BadRequestException('Teachers can only create Athletes');
        }

        let createdById = currentUser?.id;

        // If no user is logged in (e.g. public registration), assign to default teacher
        if (!createdById) {
            const sarahCoach = await this.userRepo.findOne({
                where: { email: 'teacher@careformance.com' }
            });
            if (sarahCoach) {
                createdById = sarahCoach.id;
            }
        }

        const hash = await bcrypt.hash(data.password || 'care1234!', 10);
        const newUser = this.userRepo.create({
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            role: data.role as any,
            passwordHash: hash,
            mustChangePassword: data.mustChangePassword ?? true,
            avatar: `https://picsum.photos/150/150?random=${Date.now()}`,
            createdById: createdById,
        });
        const saved = await this.userRepo.save(newUser);

        if (data.groupIds?.length) {
            await this.userGroupRepo.save(
                data.groupIds.map((gid) => ({ userId: saved.id, groupId: gid })),
            );
        }
        return saved;
    }

    async update(
        id: string,
        data: {
            firstName?: string;
            lastName?: string;
            role?: string;
            isActive?: boolean;
            groupIds?: string[];
        },
        currentUser: any,
    ) {
        const targetUser = await this.findById(id);
        if (!targetUser) throw new BadRequestException('User not found');
        if (currentUser.role === 'TEACHER' && targetUser.createdById !== currentUser.id) {
            throw new BadRequestException('Forbidden to update this user');
        }

        if (currentUser.role === 'TEACHER' && data.role && data.role !== 'ATHLETE') {
            throw new BadRequestException('Teachers cannot escalate roles');
        }

        await this.userRepo.update(id, {
            firstName: data.firstName,
            lastName: data.lastName,
            role: data.role as any,
            isActive: data.isActive,
        });

        if (Array.isArray(data.groupIds)) {
            await this.userGroupRepo.delete({ userId: id });
            if (data.groupIds.length > 0) {
                await this.userGroupRepo.save(
                    data.groupIds.map((gid) => ({ userId: id, groupId: gid })),
                );
            }
        }
        return { success: true };
    }

    async updateAudioAccess(userId: string, audioIds: string[], currentUser: any) {
        const targetUser = await this.findById(userId);
        if (!targetUser) throw new BadRequestException('User not found');
        if (currentUser.role === 'TEACHER' && targetUser.createdById !== currentUser.id) {
            throw new BadRequestException('Forbidden to update this user');
        }

        await this.audioAccessRepo.delete({ userId });
        if (audioIds.length > 0) {
            await this.audioAccessRepo.save(
                audioIds.map((audioId) => ({ userId, audioId })),
            );
        }
        return { success: true };
    }

    async resetPassword(userId: string, currentUser: any) {
        const targetUser = await this.findById(userId);
        if (!targetUser) throw new BadRequestException('User not found');
        if (currentUser.role === 'TEACHER' && targetUser.createdById !== currentUser.id) {
            throw new BadRequestException('Forbidden to reset this user password');
        }

        const hash = await bcrypt.hash('care1234!', 10);
        await this.userRepo.update(userId, {
            passwordHash: hash,
            mustChangePassword: true,
        });
        return { success: true };
    }

    async sendWelcome(userId: string, currentUser: any, emailService: any) {
        const targetUser = await this.findById(userId);
        if (!targetUser) throw new BadRequestException('User not found');
        if (currentUser.role === 'TEACHER' && targetUser.createdById !== currentUser.id) {
            throw new BadRequestException('Forbidden to email this user');
        }

        return emailService.sendWelcomeEmail({
            email: targetUser.email,
            firstName: targetUser.firstName,
            lastName: targetUser.lastName,
        });
    }

    async getFavorites(userId: string): Promise<string[]> {
        const favs = await this.progressRepo.find({
            where: { userId, isFavorite: true },
            select: ['audioId'],
        });
        return favs.map((f) => f.audioId);
    }

    async setFavorite(
        userId: string,
        audioId: string,
        isFavorite: boolean,
    ): Promise<string[]> {
        const existing = await this.progressRepo.findOne({
            where: { userId, audioId },
        });
        if (existing) {
            existing.isFavorite = isFavorite;
            await this.progressRepo.save(existing);
        } else {
            await this.progressRepo.save({
                userId,
                audioId,
                isFavorite,
            });
        }
        return this.getFavorites(userId);
    }
}

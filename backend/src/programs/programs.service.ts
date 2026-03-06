import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Program, ProgramAudio, ProgramShare, User, AudioTrack, UserProgress, ProgramUserProgress } from '../entities';
import { StorageService } from '../storage/storage.service';

interface AudioItemDto {
    audioId: string;
    order: number;
    requiredListens: number;
}

@Injectable()
export class ProgramsService {
    constructor(
        @InjectRepository(Program) private programRepo: Repository<Program>,
        @InjectRepository(ProgramAudio) private programAudioRepo: Repository<ProgramAudio>,
        @InjectRepository(ProgramShare) private shareRepo: Repository<ProgramShare>,
        @InjectRepository(User) private userRepo: Repository<User>,
        @InjectRepository(AudioTrack) private audioRepo: Repository<AudioTrack>,
        @InjectRepository(UserProgress) private progressRepo: Repository<UserProgress>,
        @InjectRepository(ProgramUserProgress) private programProgressRepo: Repository<ProgramUserProgress>,
        private storageService: StorageService,
    ) {}

    private async mapProgram(program: Program, userId?: string) {
        const pas = program.programAudios || [];
        const sorted = [...pas].sort((a, b) => a.order - b.order);

        let listenMap = new Map<string, number>();
        if (userId && sorted.length > 0) {
            const audioIds = sorted.map(pa => pa.audioId);
            const progressRecords = await this.programProgressRepo.find({
                where: { userId, audioId: In(audioIds), programId: program.id },
                select: ['audioId', 'timesListened'],
            });
            listenMap = new Map(progressRecords.map(p => [p.audioId, p.timesListened || 0]));
        }

        let totalRequired = 0;
        let totalDone = 0;

        const audios = await Promise.all(
            sorted.map(async (pa) => {
                const audio = pa.audio;
                if (!audio) return null;
                const url = audio.storageKey ? await this.storageService.getSignedUrl(audio.storageKey, 3600) : '';
                const listenCount = listenMap.get(pa.audioId) || 0;

                totalRequired += pa.requiredListens;
                totalDone += Math.min(listenCount, pa.requiredListens);

                return {
                    id: audio.id,
                    title: audio.title,
                    description: audio.description,
                    duration: audio.duration,
                    url,
                    coverUrl: audio.coverUrl,
                    mimeType: audio.mimeType,
                    type: audio.type,
                    dominance: audio.dominance,
                    phasing: audio.phasing,
                    language: audio.language,
                    voiceType: audio.voiceType,
                    order: pa.order,
                    requiredListens: pa.requiredListens,
                    listenCount,
                };
            })
        );

        const completionPercent = totalRequired > 0 ? Math.round((totalDone / totalRequired) * 100) : 0;

        return {
            id: program.id,
            name: program.name,
            description: program.description,
            createdById: program.createdById,
            createdBy: program.createdBy,
            audios: audios.filter(Boolean),
            completionPercent,
            createdAt: program.createdAt,
            updatedAt: program.updatedAt,
        };
    }

    async create(data: { name: string; description?: string; audioItems?: AudioItemDto[] }, currentUser: any) {
        if (currentUser.role === 'ATHLETE') throw new ForbiddenException('Athletes cannot create programs');

        const program = this.programRepo.create({
            name: data.name,
            description: data.description,
            createdById: currentUser.id,
        });
        const saved = await this.programRepo.save(program);

        if (data.audioItems?.length) {
            const entities = data.audioItems.map(item =>
                this.programAudioRepo.create({
                    programId: saved.id,
                    audioId: item.audioId,
                    order: item.order,
                    requiredListens: item.requiredListens || 1,
                })
            );
            await this.programAudioRepo.save(entities);
        }

        const full = await this.programRepo.findOne({
            where: { id: saved.id },
            relations: ['programAudios', 'programAudios.audio', 'createdBy'],
        });
        return this.mapProgram(full!, currentUser.id);
    }

    async findAll(currentUser: any) {
        let programs: Program[] = [];
        const relations = ['programAudios', 'programAudios.audio', 'createdBy'];

        if (currentUser.role === 'ADMIN') {
            programs = await this.programRepo.find({ relations });
        } else {
            const shared = await this.shareRepo.find({ where: { userId: currentUser.id }, select: ['programId'] });
            const sharedIds = shared.map(s => s.programId);

            if (currentUser.role === 'TEACHER') {
                const where: any[] = [{ createdById: currentUser.id }];
                if (sharedIds.length > 0) where.push({ id: In(sharedIds) });
                programs = await this.programRepo.find({ where, relations });
            } else {
                if (sharedIds.length > 0) {
                    programs = await this.programRepo.find({
                        where: { id: In(sharedIds) },
                        relations,
                    });
                }
            }
        }
        return Promise.all(programs.map(p => this.mapProgram(p, currentUser.id)));
    }

    async findOne(id: string, currentUser: any) {
        const program = await this.programRepo.findOne({
            where: { id },
            relations: ['programAudios', 'programAudios.audio', 'createdBy'],
        });
        if (!program) throw new NotFoundException('Program not found');
        return this.mapProgram(program, currentUser.id);
    }

    async update(id: string, data: { name?: string; description?: string; audioItems?: AudioItemDto[] }, currentUser: any) {
        const program = await this.programRepo.findOne({ where: { id }, relations: ['programAudios'] });
        if (!program) throw new NotFoundException('Program not found');

        if (currentUser.role === 'TEACHER' && program.createdById !== currentUser.id) {
            throw new ForbiddenException('Cannot update programs you did not create');
        }

        if (data.name) program.name = data.name;
        if (data.description !== undefined) program.description = data.description;
        await this.programRepo.save(program);

        if (data.audioItems) {
            await this.programAudioRepo.delete({ programId: id });
            if (data.audioItems.length > 0) {
                const entities = data.audioItems.map(item =>
                    this.programAudioRepo.create({
                        programId: id,
                        audioId: item.audioId,
                        order: item.order,
                        requiredListens: item.requiredListens || 1,
                    })
                );
                await this.programAudioRepo.save(entities);
            }
        }

        const full = await this.programRepo.findOne({
            where: { id },
            relations: ['programAudios', 'programAudios.audio', 'createdBy'],
        });
        return this.mapProgram(full!, currentUser.id);
    }

    async findForUser(targetUserId: string, currentUser: any) {
        if (currentUser.role === 'ATHLETE') throw new ForbiddenException();

        if (currentUser.role === 'TEACHER') {
            const targetUser = await this.userRepo.findOne({ where: { id: targetUserId } });
            if (!targetUser || targetUser.createdById !== currentUser.id) {
                throw new ForbiddenException('You can only view your own athletes');
            }
        }

        const shared = await this.shareRepo.find({ where: { userId: targetUserId }, select: ['programId'] });
        const sharedIds = shared.map(s => s.programId);

        if (sharedIds.length === 0) return [];

        const programs = await this.programRepo.find({
            where: { id: In(sharedIds) },
            relations: ['programAudios', 'programAudios.audio', 'createdBy'],
        });

        return Promise.all(programs.map(p => this.mapProgram(p, targetUserId)));
    }

    async remove(id: string, currentUser: any) {
        const program = await this.programRepo.findOne({ where: { id } });
        if (!program) throw new NotFoundException('Program not found');

        if (currentUser.role !== 'ADMIN' && program.createdById !== currentUser.id) {
            throw new ForbiddenException('Cannot delete program');
        }

        await this.shareRepo.delete({ programId: id });
        await this.programAudioRepo.delete({ programId: id });
        await this.programRepo.delete(id);
        return { success: true };
    }

    async shareProgram(programId: string, userId: string, currentUser: any) {
        if (currentUser.role === 'ATHLETE') throw new ForbiddenException();

        const program = await this.programRepo.findOne({ where: { id: programId } });
        const targetUser = await this.userRepo.findOne({ where: { id: userId } });
        if (!program || !targetUser) throw new NotFoundException('Program or User not found');

        if (currentUser.role === 'TEACHER') {
            if (targetUser.createdById !== currentUser.id) {
                throw new ForbiddenException('You can only share with your own athletes');
            }
            const hasAccess = program.createdById === currentUser.id ||
                await this.shareRepo.findOne({ where: { programId, userId: currentUser.id }});
            if (!hasAccess) throw new ForbiddenException('You do not have access to this program');
        }

        const existing = await this.shareRepo.findOne({ where: { programId, userId }});
        if (existing) return existing;

        const share = this.shareRepo.create({
            programId,
            userId,
            sharedById: currentUser.id,
        });

        return this.shareRepo.save(share);
    }

    async getShares(programId: string) {
        return this.shareRepo.find({ where: { programId }, relations: ['user'] });
    }

    async removeShare(programId: string, userId: string, currentUser: any) {
        if (currentUser.role === 'ATHLETE') throw new ForbiddenException();

        if (currentUser.role === 'TEACHER') {
            const share = await this.shareRepo.findOne({ where: { programId, userId }, relations: ['user'] });
            if (!share || share.user.createdById !== currentUser.id) {
                throw new ForbiddenException('Cannot remove access for this user');
            }
        }
        await this.shareRepo.delete({ programId, userId });
        return { success: true };
    }
}

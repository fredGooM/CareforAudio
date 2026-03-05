import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
    AudioTrack,
    AudioAccess,
    UserProgress,
    Program,
    ProgramShare,
} from '../entities';
import {
    AudioDominance,
    AudioPhasing,
    AudioLanguage,
    AudioVoiceType
} from '../entities/audio-track.entity';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class AudiosService {
    constructor(
        @InjectRepository(AudioTrack)
        private readonly audioRepo: Repository<AudioTrack>,
        @InjectRepository(AudioAccess)
        private readonly audioAccessRepo: Repository<AudioAccess>,
        @InjectRepository(UserProgress)
        private readonly progressRepo: Repository<UserProgress>,
        @InjectRepository(Program)
        private readonly programRepo: Repository<Program>,
        @InjectRepository(ProgramShare)
        private readonly programShareRepo: Repository<ProgramShare>,
        private readonly storageService: StorageService,
    ) { }

    async findAllForUser(userId: string, role: string) {
        let audios: AudioTrack[];

        const directAccess = await this.audioAccessRepo.find({
            where: { userId },
            select: ['audioId'],
        });
        const directIds = directAccess.map((a) => a.audioId);

        // Get audio IDs accessible via shared programs
        const sharedPrograms = await this.programShareRepo.find({
            where: { userId },
            select: ['programId'],
        });
        const sharedProgramIds = sharedPrograms.map(s => s.programId);
        let programAudioIds: string[] = [];
        if (sharedProgramIds.length > 0) {
            const programsWithAudios = await this.programRepo.find({
                where: { id: In(sharedProgramIds) },
                relations: ['programAudios'],
            });
            programsWithAudios.forEach(p => {
                p.programAudios?.forEach(pa => programAudioIds.push(pa.audioId));
            });
        }

        const allIds = [...new Set([...directIds, ...programAudioIds])];
        
        const whereConditions: any[] = [{ createdById: userId }];
        if (allIds.length > 0) {
            whereConditions.push({ id: In(allIds) });
        }

        audios = await this.audioRepo.find({
            where: whereConditions,
            relations: ['allowedUsers'],
        });

        // For Athletes, filter out unpublished audios if they are somehow pulled
        if (role === 'ATHLETE') {
            audios = audios.filter(a => a.published);
        }

        // Fetch progress for this user to get listenCount
        const allAudioIds = audios.map(a => a.id);
        const progressRecords = allAudioIds.length > 0
            ? await this.progressRepo.find({
                where: { userId, audioId: In(allAudioIds) },
                select: ['audioId', 'timesListened'],
            })
            : [];
        const listenMap = new Map(progressRecords.map(p => [p.audioId, p.timesListened || 0]));

        return Promise.all(
            audios.map(async (a: any) => {
                const signedUrl = a.storageKey
                    ? await this.storageService.getSignedUrl(a.storageKey, 3600)
                    : '';
                return {
                    id: a.id,
                    title: a.title,
                    description: a.description,
                    duration: a.duration,
                    url: signedUrl,
                    coverUrl: a.coverUrl || 'https://picsum.photos/400/400',

                    mimeType: a.mimeType || 'audio/mpeg',
                    type: a.type || 'Training',
                    orderToListen: a.orderToListen || 1,
                    tags: [],
                    createdAt: a.createdAt,
                    published: a.published,
                    dominance: a.dominance,
                    phasing: a.phasing,
                    language: a.language,
                    voiceType: a.voiceType,

                    allowedUserIds:
                        a.allowedUsers?.map((u: any) => u.userId) || [],
                    listenCount: listenMap.get(a.id) || 0,
                };
            }),
        );
    }

    async getFavoriteAudios(userId: string, role: string) {
        const favRecords = await this.progressRepo.find({
            where: { userId, isFavorite: true },
            select: ['audioId'],
        });
        const favIds = favRecords.map((r) => r.audioId);
        if (favIds.length === 0) return [];

        let audios: AudioTrack[];
        if (role === 'ADMIN') {
            audios = await this.audioRepo.find({
                where: { id: In(favIds) },
                relations: ['allowedUsers'],
            });
        } else {
            audios = await this.audioRepo.find({
                where: { id: In(favIds), published: true },
                relations: ['allowedUsers'],
            });
        }

        // Fetch progress for this user to get listenCount
        const allFavIds = audios.map(a => a.id);
        const favProgressRecords = allFavIds.length > 0
            ? await this.progressRepo.find({
                where: { userId, audioId: In(allFavIds) },
                select: ['audioId', 'timesListened'],
            })
            : [];
        const favListenMap = new Map(favProgressRecords.map(p => [p.audioId, p.timesListened || 0]));

        return Promise.all(
            audios.map(async (a: any) => {
                const signedUrl = a.storageKey
                    ? await this.storageService.getSignedUrl(a.storageKey, 3600)
                    : '';
                return {
                    id: a.id,
                    title: a.title,
                    description: a.description,
                    duration: a.duration,
                    url: signedUrl,
                    coverUrl: a.coverUrl || 'https://picsum.photos/400/400',
                    mimeType: a.mimeType || 'audio/mpeg',
                    type: a.type || 'Training',
                    orderToListen: a.orderToListen || 1,
                    tags: [],
                    createdAt: a.createdAt,
                    published: a.published,
                    dominance: a.dominance,
                    phasing: a.phasing,
                    language: a.language,
                    voiceType: a.voiceType,

                    allowedUserIds: a.allowedUsers?.map((u: any) => u.userId) || [],
                    listenCount: favListenMap.get(a.id) || 0,
                };
            }),
        );
    }

    async getMyProgram(userId: string) {
        const records = await this.progressRepo.find({
            where: { userId, isMyProgram: true },
            relations: ['audio'],
        });
        return records
            .filter((r) => r.audio)
            .map((r: any) => ({
                id: r.audio.id,
                title: r.audio.title,
                duration: r.audio.duration,
                type: r.audio.type || 'Training',
                timesListened: r.timesListened || 0,
            }));
    }

    async getMyProgramAdmin(userId: string) {
        return this.getMyProgram(userId);
    }

    async setMyProgramAdmin(
        userId: string,
        audioId: string,
        isMyProgram: boolean,
    ) {
        const existing = await this.progressRepo.findOne({
            where: { userId, audioId },
        });
        if (existing) {
            existing.isMyProgram = isMyProgram;
            await this.progressRepo.save(existing);
        } else {
            await this.progressRepo.save({ userId, audioId, isMyProgram });
        }
        return { success: true };
    }

    async create(
        data: {
            title: string;
            description?: string;
            published?: string;
            duration?: string;
            type?: string;
            orderToListen?: string;
            allowedUserIds?: string;
            myProgramUserIds?: string;
            dominance?: AudioDominance;
            phasing?: AudioPhasing;
            language?: AudioLanguage;
            voiceType?: AudioVoiceType;
        },
        file: Express.Multer.File,
        user: any,
    ) {
        if (!file || !file.buffer) {
            throw new BadRequestException('No file uploaded');
        }

        const uploadResult = await this.storageService.upload(
            file.buffer,
            file.mimetype,
            file.originalname,
            'audios',
        );

        const newAudio = this.audioRepo.create({
            title: data.title,
            description: data.description,
            duration: parseInt(data.duration || '0') || 0,
            published: data.published === 'true',
            type: data.type || 'Training',
            orderToListen: data.orderToListen ? parseInt(data.orderToListen) : 1,
            storageKey: uploadResult.objectName,
            mimeType: file.mimetype,
            size: uploadResult.size,
            dominance: data.dominance,
            phasing: data.phasing,
            language: data.language || AudioLanguage.FRENCH,
            voiceType: data.voiceType || AudioVoiceType.MALE,
            coverUrl: `https://picsum.photos/400/400?random=${Date.now()}`,
            createdById: user.id,
        });

        const saved = await this.audioRepo.save(newAudio);



        // Handle direct user permissions
        if (data.allowedUserIds) {
            try {
                const userIds = JSON.parse(data.allowedUserIds);
                if (Array.isArray(userIds)) {
                    await this.audioAccessRepo.save(
                        userIds.map((uid: string) => ({
                            userId: uid,
                            audioId: saved.id,
                        })),
                    );
                }
            } catch { }
        }

        // Handle my-program assignments
        if (data.myProgramUserIds) {
            try {
                const myProgramUserIds = JSON.parse(data.myProgramUserIds);
                if (Array.isArray(myProgramUserIds)) {
                    for (const uid of myProgramUserIds) {
                        const existing = await this.progressRepo.findOne({
                            where: { userId: uid, audioId: saved.id },
                        });
                        if (existing) {
                            existing.isMyProgram = true;
                            await this.progressRepo.save(existing);
                        } else {
                            await this.progressRepo.save({
                                userId: uid,
                                audioId: saved.id,
                                isMyProgram: true,
                            });
                        }
                    }
                }
            } catch { }
        }

        const signedUrl = await this.storageService.getSignedUrl(
            uploadResult.objectName,
            3600,
        );

        return { ...saved, url: signedUrl };
    }

    async update(
        id: string,
        data: {
            title?: string;
            description?: string;
            published?: boolean;
            duration?: number;
            type?: string;
            orderToListen?: number;
            allowedUserIds?: string[];
            myProgramUserIds?: string[];
            dominance?: AudioDominance;
            phasing?: AudioPhasing;
            language?: AudioLanguage;
            voiceType?: AudioVoiceType;
        },
        user: any,
    ) {
        const audio = await this.audioRepo.findOne({ where: { id } });
        if (!audio) throw new NotFoundException('Audio not found');

        // Teacher can only update their own audios. Admins can update any.
        if (user.role === 'TEACHER' && audio.createdById !== user.id) {
            throw new BadRequestException('You do not have permission to update this audio.');
        }

        const updateData: any = {};
        if (data.title !== undefined) updateData.title = data.title;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.published !== undefined) updateData.published = data.published;
        if (data.duration !== undefined) updateData.duration = data.duration;
        if (data.type !== undefined) updateData.type = data.type;
        if (data.orderToListen !== undefined) updateData.orderToListen = data.orderToListen;
        if (data.dominance !== undefined) updateData.dominance = data.dominance;
        if (data.phasing !== undefined) updateData.phasing = data.phasing;
        if (data.language !== undefined) updateData.language = data.language;
        if (data.voiceType !== undefined) updateData.voiceType = data.voiceType;
        
        Object.assign(audio, updateData);
        await this.audioRepo.save(audio);

        if (Array.isArray(data.allowedUserIds)) {
            await this.audioAccessRepo.delete({ audioId: id });
            if (data.allowedUserIds.length > 0) {
                await this.audioAccessRepo.save(
                    data.allowedUserIds.map((uid) => ({ userId: uid, audioId: id })),
                );
            }
        }

        if (Array.isArray(data.myProgramUserIds)) {
            await this.progressRepo.update({ audioId: id }, { isMyProgram: false });
            for (const uid of data.myProgramUserIds) {
                const existing = await this.progressRepo.findOne({
                    where: { userId: uid, audioId: id },
                });
                if (existing) {
                    existing.isMyProgram = true;
                    await this.progressRepo.save(existing);
                } else {
                    await this.progressRepo.save({
                        userId: uid,
                        audioId: id,
                        isMyProgram: true,
                    });
                }
            }
        }

        return { success: true };
    }

    async remove(id: string, user: any) {
        const audio = await this.audioRepo.findOne({ where: { id } });
        if (!audio) throw new NotFoundException('Audio not found');

        if (user.role === 'TEACHER' && audio.createdById !== user.id) {
            throw new BadRequestException('You do not have permission to delete this audio.');
        }

        await this.audioRepo.delete(id);
        if (audio.storageKey) {
            await this.storageService.delete(audio.storageKey).catch(() => { });
        }
        return { success: true };
    }
}

import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Program, ProgramShare, User, AudioTrack, UserProgress } from '../entities';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class ProgramsService {
    constructor(
        @InjectRepository(Program) private programRepo: Repository<Program>,
        @InjectRepository(ProgramShare) private shareRepo: Repository<ProgramShare>,
        @InjectRepository(User) private userRepo: Repository<User>,
        @InjectRepository(AudioTrack) private audioRepo: Repository<AudioTrack>,
        @InjectRepository(UserProgress) private progressRepo: Repository<UserProgress>,
        private storageService: StorageService,
    ) {}

    private async mapProgramAudios(program: Program, userId?: string) {
        if (!program.audios) return program;

        // Fetch listen counts for this user
        let listenMap = new Map<string, number>();
        if (userId && program.audios.length > 0) {
            const audioIds = program.audios.map(a => a.id);
            const progressRecords = await this.progressRepo.find({
                where: { userId, audioId: In(audioIds) },
                select: ['audioId', 'timesListened'],
            });
            listenMap = new Map(progressRecords.map(p => [p.audioId, p.timesListened || 0]));
        }

        const audiosWithUrls = await Promise.all(
            program.audios.map(async (a) => {
                const url = a.storageKey ? await this.storageService.getSignedUrl(a.storageKey, 3600) : '';
                return { ...a, url, listenCount: listenMap.get(a.id) || 0 };
            })
        );
        return { ...program, audios: audiosWithUrls };
    }

    async create(data: { name: string; description?: string; audioIds: string[] }, currentUser: any) {
        if (currentUser.role === 'ATHLETE') throw new ForbiddenException('Athletes cannot create programs');

        const audios = data.audioIds?.length ? await this.audioRepo.find({ where: { id: In(data.audioIds) } }) : [];

        const program = this.programRepo.create({
            name: data.name,
            description: data.description,
            createdById: currentUser.id,
            audios,
        });

        const saved = await this.programRepo.save(program);
        return this.mapProgramAudios(saved, currentUser.id);
    }

    async findAll(currentUser: any) {
        let programs: Program[] = [];
        if (currentUser.role === 'ADMIN') {
            programs = await this.programRepo.find({ relations: ['audios', 'createdBy'] });
        } else {
            const shared = await this.shareRepo.find({ where: { userId: currentUser.id }, select: ['programId'] });
            const sharedIds = shared.map(s => s.programId);

            if (currentUser.role === 'TEACHER') {
                programs = await this.programRepo.find({
                    where: [{ createdById: currentUser.id }, { id: In(sharedIds) }],
                    relations: ['audios', 'createdBy']
                });
            } else {
                if (sharedIds.length > 0) {
                    programs = await this.programRepo.find({
                        where: { id: In(sharedIds) },
                        relations: ['audios']
                    });
                }
            }
        }
        return Promise.all(programs.map(p => this.mapProgramAudios(p, currentUser.id)));
    }

    async findOne(id: string, currentUser: any) {
        const program = await this.programRepo.findOne({
            where: { id },
            relations: ['audios', 'createdBy']
        });
        if (!program) throw new NotFoundException('Program not found');
        return this.mapProgramAudios(program, currentUser.id);
    }

    async update(id: string, data: { name?: string; description?: string; audioIds?: string[] }, currentUser: any) {
        const program = await this.programRepo.findOne({ where: { id }, relations: ['audios'] });
        if (!program) throw new NotFoundException('Program not found');

        if (currentUser.role === 'TEACHER' && program.createdById !== currentUser.id) {
            throw new ForbiddenException('Cannot update programs you did not create');
        }

        if (data.name) program.name = data.name;
        if (data.description !== undefined) program.description = data.description;
        
        if (data.audioIds) {
            program.audios = await this.audioRepo.find({ where: { id: In(data.audioIds) } });
        }

        const saved = await this.programRepo.save(program);
        return this.mapProgramAudios(saved, currentUser.id);
    }

    async remove(id: string, currentUser: any) {
        const program = await this.programRepo.findOne({ where: { id } });
        if (!program) throw new NotFoundException('Program not found');

        if (currentUser.role !== 'ADMIN' && program.createdById !== currentUser.id) {
            throw new ForbiddenException('Cannot delete program');
        }

        await this.shareRepo.delete({ programId: id });
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

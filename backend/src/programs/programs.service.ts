import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Program, ProgramShare, User, AudioTrack } from '../entities';

@Injectable()
export class ProgramsService {
    constructor(
        @InjectRepository(Program) private programRepo: Repository<Program>,
        @InjectRepository(ProgramShare) private shareRepo: Repository<ProgramShare>,
        @InjectRepository(User) private userRepo: Repository<User>,
        @InjectRepository(AudioTrack) private audioRepo: Repository<AudioTrack>,
    ) {}

    async create(data: { name: string; description?: string; audioIds: string[] }, currentUser: any) {
        if (currentUser.role === 'ATHLETE') throw new ForbiddenException('Athletes cannot create programs');

        const audios = data.audioIds?.length ? await this.audioRepo.find({ where: { id: In(data.audioIds) } }) : [];

        const program = this.programRepo.create({
            name: data.name,
            description: data.description,
            createdById: currentUser.id,
            audios,
        });

        return this.programRepo.save(program);
    }

    async findAll(currentUser: any) {
        if (currentUser.role === 'ADMIN') {
            return this.programRepo.find({ relations: ['audios', 'createdBy'] });
        }

        const shared = await this.shareRepo.find({ where: { userId: currentUser.id }, select: ['programId'] });
        const sharedIds = shared.map(s => s.programId);

        if (currentUser.role === 'TEACHER') {
            return this.programRepo.find({
                where: [{ createdById: currentUser.id }, { id: In(sharedIds) }],
                relations: ['audios', 'createdBy']
            });
        }

        if (sharedIds.length === 0) return [];
        return this.programRepo.find({
            where: { id: In(sharedIds) },
            relations: ['audios']
        });
    }

    async findOne(id: string, currentUser: any) {
        const program = await this.programRepo.findOne({
            where: { id },
            relations: ['audios', 'createdBy']
        });
        if (!program) throw new NotFoundException('Program not found');
        return program;
    }

    async update(id: string, data: { name?: string; description?: string; audioIds?: string[] }, currentUser: any) {
        const program = await this.programRepo.findOne({ where: { id } });
        if (!program) throw new NotFoundException('Program not found');

        if (currentUser.role === 'TEACHER' && program.createdById !== currentUser.id) {
            throw new ForbiddenException('Cannot update programs you did not create');
        }

        if (data.name) program.name = data.name;
        if (data.description !== undefined) program.description = data.description;
        
        if (data.audioIds) {
            program.audios = await this.audioRepo.find({ where: { id: In(data.audioIds) } });
        }

        return this.programRepo.save(program);
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

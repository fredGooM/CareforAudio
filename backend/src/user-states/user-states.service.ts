import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserState, StateType } from '../entities';

@Injectable()
export class UserStatesService {
    constructor(
        @InjectRepository(UserState)
        private readonly repo: Repository<UserState>,
    ) {}

    async create(userId: string, type: StateType, data: Record<string, number>): Promise<UserState> {
        const entry = this.repo.create({ userId, type, data });
        return this.repo.save(entry);
    }

    async createForUser(targetUserId: string, type: StateType, data: Record<string, number>): Promise<UserState> {
        const entry = this.repo.create({ userId: targetUserId, type, data });
        return this.repo.save(entry);
    }

    async findByUser(userId: string, type?: StateType): Promise<UserState[]> {
        const where: any = { userId };
        if (type) where.type = type;
        return this.repo.find({ where, order: { createdAt: 'DESC' } });
    }
}

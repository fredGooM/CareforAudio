import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Group } from '../entities';

@Injectable()
export class GroupsService {
    constructor(
        @InjectRepository(Group) private readonly groupRepo: Repository<Group>,
    ) { }

    findAll() {
        return this.groupRepo.find({ order: { name: 'ASC' } });
    }

    create(name: string) {
        const group = this.groupRepo.create({ id: crypto.randomUUID(), name });
        return this.groupRepo.save(group);
    }

    async update(id: string, name: string) {
        await this.groupRepo.update(id, { name });
        return this.groupRepo.findOne({ where: { id } });
    }
}

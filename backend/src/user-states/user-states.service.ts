import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserStateFieldConfig, UserStateHistory, StateType } from '../entities';

const DEFAULT_FIELDS: Record<StateType, { fieldKey: string; label: string; position: number }[]> = {
    [StateType.EN_COMPETITION]: [
        { fieldKey: 'plaisir', label: 'Plaisir', position: 0 },
        { fieldKey: 'confiance', label: 'Confiance', position: 1 },
        { fieldKey: 'concentration', label: 'Concentration', position: 2 },
        { fieldKey: 'precision', label: 'Précision', position: 3 },
        { fieldKey: 'gestionEmotions', label: 'Gestion des émotions', position: 4 },
        { fieldKey: 'sommeil', label: 'Sommeil', position: 5 },
    ],
    [StateType.AU_QUOTIDIEN]: [
        { fieldKey: 'stress', label: 'Stress', position: 0 },
        { fieldKey: 'sommeil', label: 'Sommeil', position: 1 },
        { fieldKey: 'motivation', label: 'Motivation', position: 2 },
        { fieldKey: 'confiance', label: 'Confiance', position: 3 },
        { fieldKey: 'apaisement', label: 'Apaisement', position: 4 },
    ],
};

@Injectable()
export class UserStatesService {
    constructor(
        @InjectRepository(UserStateFieldConfig)
        private readonly configRepo: Repository<UserStateFieldConfig>,
        @InjectRepository(UserStateHistory)
        private readonly historyRepo: Repository<UserStateHistory>,
    ) {}

    async getConfigs(athleteId: string): Promise<UserStateFieldConfig[]> {
        const existing = await this.configRepo.find({
            where: { athleteId },
            order: { stateType: 'ASC', position: 'ASC' },
        });

        const presentTypes = new Set(existing.map(c => c.stateType));
        const toCreate: UserStateFieldConfig[] = [];

        for (const type of Object.values(StateType)) {
            if (!presentTypes.has(type)) {
                for (const f of DEFAULT_FIELDS[type]) {
                    toCreate.push(this.configRepo.create({ athleteId, stateType: type, ...f }));
                }
            }
        }

        if (toCreate.length) {
            const saved = await this.configRepo.save(toCreate);
            return [...existing, ...saved].sort((a, b) =>
                a.stateType.localeCompare(b.stateType) || a.position - b.position,
            );
        }

        return existing;
    }

    async setConfigs(
        athleteId: string,
        stateType: StateType,
        fields: { fieldKey: string; label: string }[],
    ): Promise<UserStateFieldConfig[]> {
        const existing = await this.configRepo.find({ where: { athleteId, stateType } });
        const existingByKey = new Map(existing.map(c => [c.fieldKey, c]));
        const incomingKeys = new Set(fields.map(f => f.fieldKey));

        // Delete only removed fields (cascades history only for those)
        const toDelete = existing.filter(c => !incomingKeys.has(c.fieldKey));
        if (toDelete.length) await this.configRepo.remove(toDelete);

        // Upsert remaining + new
        const entities = fields.map((f, i) => {
            const current = existingByKey.get(f.fieldKey);
            if (current) {
                current.label = f.label;
                current.position = i;
                return current;
            }
            return this.configRepo.create({ athleteId, stateType, fieldKey: f.fieldKey, label: f.label, position: i });
        });
        return this.configRepo.save(entities);
    }

    async submitValues(
        athleteId: string,
        entries: { fieldConfigId: string; value: number }[],
    ): Promise<UserStateHistory[]> {
        const rows = entries.map(e =>
            this.historyRepo.create({ athleteId, fieldConfigId: e.fieldConfigId, value: e.value }),
        );
        return this.historyRepo.save(rows);
    }

    async getHistory(athleteId: string): Promise<UserStateHistory[]> {
        return this.historyRepo.find({
            where: { athleteId },
            relations: { fieldConfig: true },
            order: { recordedAt: 'DESC' },
        });
    }
}

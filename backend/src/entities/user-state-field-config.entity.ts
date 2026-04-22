import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    OneToMany,
} from 'typeorm';
import { User } from './user.entity';

export enum StateType {
    EN_COMPETITION = 'EN_COMPETITION',
    AU_QUOTIDIEN = 'AU_QUOTIDIEN',
}

@Entity('user_state_field_configs')
export class UserStateFieldConfig {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    athleteId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'athleteId' })
    athlete: User;

    @Column({ type: 'varchar', length: 50 })
    stateType: StateType;

    @Column({ type: 'varchar', length: 100 })
    fieldKey: string;

    @Column({ type: 'varchar', length: 100 })
    label: string;

    @Column({ type: 'int', default: 0 })
    position: number;
}

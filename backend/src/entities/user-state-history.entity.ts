import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { UserStateFieldConfig } from './user-state-field-config.entity';

@Entity('user_state_history')
export class UserStateHistory {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    athleteId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'athleteId' })
    athlete: User;

    @Column()
    fieldConfigId: string;

    @ManyToOne(() => UserStateFieldConfig, { onDelete: 'CASCADE', eager: true })
    @JoinColumn({ name: 'fieldConfigId' })
    fieldConfig: UserStateFieldConfig;

    @Column({ type: 'int' })
    value: number;

    @CreateDateColumn()
    recordedAt: Date;
}

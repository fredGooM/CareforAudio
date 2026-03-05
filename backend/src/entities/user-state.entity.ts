import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum StateType {
    GENERAL = 'GENERAL',
    SLEEP = 'SLEEP',
    POST_COMPETITION = 'POST_COMPETITION',
}

@Entity('user_states')
export class UserState {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({ type: 'enum', enum: StateType })
    type: StateType;

    @Column({ type: 'jsonb' })
    data: Record<string, number>;

    @CreateDateColumn()
    createdAt: Date;
}

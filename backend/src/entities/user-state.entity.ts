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
    EN_COMPETITION = 'EN_COMPETITION',
    AU_QUOTIDIEN = 'AU_QUOTIDIEN',
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

    @Column({ type: 'varchar', length: 50 })
    type: StateType;

    @Column({ type: 'jsonb' })
    data: Record<string, number>;

    @CreateDateColumn()
    createdAt: Date;
}

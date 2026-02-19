import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Unique,
} from 'typeorm';
import { User } from './user.entity';
import { AudioTrack } from './audio-track.entity';

@Entity('user_progress')
@Unique(['userId', 'audioId'])
export class UserProgress {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @Column()
    audioId: string;

    @Column({ type: 'float', default: 0 })
    lastPosition: number;

    @Column({ default: false })
    isCompleted: boolean;

    @Column({ default: false })
    isFavorite: boolean;

    @Column({ default: false })
    isMyProgram: boolean;

    @Column({ default: 0 })
    timesListened: number;

    @Column({ default: 1 })
    timesToListened: number;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToOne(() => User, (u) => u.progressRecords, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @ManyToOne(() => AudioTrack, (a) => a.progressRecords, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'audioId' })
    audio: AudioTrack;
}

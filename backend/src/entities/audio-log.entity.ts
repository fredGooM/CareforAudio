import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { AudioTrack } from './audio-track.entity';

@Entity('audio_logs')
export class AudioLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @Column()
    audioId: string;

    @Column()
    duration: number;

    @CreateDateColumn()
    createdAt: Date;

    @ManyToOne(() => User, (u) => u.audioLogs, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @ManyToOne(() => AudioTrack, (a) => a.audioLogs, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'audioId' })
    audio: AudioTrack;
}

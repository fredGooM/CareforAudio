import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { AudioAccess } from './audio-access.entity';
import { UserProgress } from './user-progress.entity';
import { AudioLog } from './audio-log.entity';
export enum AudioDominance {
    MIND = 'MIND',
    BODY = 'BODY',
    EMOTION = 'EMOTION',
}

export enum AudioPhasing {
    PRE_COMPETITION = 'PRE_COMPETITION',
    DURING_COMPETITION = 'DURING_COMPETITION',
    POST_COMPETITION = 'POST_COMPETITION',
}

export enum AudioVoiceType {
    MALE = 'MALE',
    FEMALE = 'FEMALE',
}

export enum AudioLanguage {
    FRENCH = 'FRENCH',
    ENGLISH = 'ENGLISH',
}

@Entity('audio_tracks')
export class AudioTrack {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    title: string;

    @Column({ nullable: true })
    description: string;

    @Column({ default: 0 })
    duration: number;

    @Column({ unique: true })
    storageKey: string;

    @Column({ nullable: true })
    mimeType: string;

    @Column({ nullable: true })
    size: number;



    @Column({ nullable: true })
    createdById: string;

    @ManyToOne(() => User, undefined, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'createdById' })
    createdBy: User;

    @Column({ default: 'Training' })
    type: string;

    @Column({ default: 1 })
    orderToListen: number;

    @Column({ default: false })
    published: boolean;

    @Column({ nullable: true })
    coverUrl: string;

    @Column({ type: 'enum', enum: AudioDominance, nullable: true })
    dominance: AudioDominance;

    @Column({ type: 'enum', enum: AudioPhasing, nullable: true })
    phasing: AudioPhasing;

    @Column({ type: 'enum', enum: AudioLanguage, default: AudioLanguage.FRENCH })
    language: AudioLanguage;

    @Column({ type: 'enum', enum: AudioVoiceType, default: AudioVoiceType.MALE })
    voiceType: AudioVoiceType;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToMany(() => AudioAccess, (aa) => aa.audio)
    allowedUsers: AudioAccess[];



    @OneToMany(() => UserProgress, (up) => up.audio)
    progressRecords: UserProgress[];

    @OneToMany(() => AudioLog, (al) => al.audio)
    audioLogs: AudioLog[];
}

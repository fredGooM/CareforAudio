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
import { Category } from './category.entity';
import { AudioAccess } from './audio-access.entity';
import { GroupAccess } from './group-access.entity';
import { UserProgress } from './user-progress.entity';
import { AudioLog } from './audio-log.entity';

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
    categoryId: string;

    @ManyToOne(() => Category, (c) => c.audios, { nullable: true })
    @JoinColumn({ name: 'categoryId' })
    category: Category;

    @Column({ default: 'Training' })
    type: string;

    @Column({ default: 1 })
    orderToListen: number;

    @Column({ default: false })
    published: boolean;

    @Column({ nullable: true })
    coverUrl: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToMany(() => AudioAccess, (aa) => aa.audio)
    allowedUsers: AudioAccess[];

    @OneToMany(() => GroupAccess, (ga) => ga.audio)
    allowedGroups: GroupAccess[];

    @OneToMany(() => UserProgress, (up) => up.audio)
    progressRecords: UserProgress[];

    @OneToMany(() => AudioLog, (al) => al.audio)
    audioLogs: AudioLog[];
}

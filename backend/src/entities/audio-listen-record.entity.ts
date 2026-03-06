import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('audio_listen_record')
export class AudioListenRecord {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @Column()
    audioId: string;

    @Column({ nullable: true, type: 'uuid' })
    programId: string | null;

    @CreateDateColumn()
    listenedAt: Date;
}

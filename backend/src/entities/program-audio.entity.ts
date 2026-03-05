import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Program } from './program.entity';
import { AudioTrack } from './audio-track.entity';

@Entity('program_audios')
export class ProgramAudio {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    programId: string;

    @Column()
    audioId: string;

    @Column({ type: 'int', default: 0 })
    order: number;

    @Column({ type: 'int', default: 1 })
    requiredListens: number;

    @ManyToOne(() => Program, (p) => p.programAudios, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'programId' })
    program: Program;

    @ManyToOne(() => AudioTrack, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'audioId' })
    audio: AudioTrack;
}

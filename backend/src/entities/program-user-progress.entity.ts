import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, Unique } from 'typeorm';

@Entity('program_user_progress')
@Unique(['userId', 'audioId', 'programId'])
export class ProgramUserProgress {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @Column()
    audioId: string;

    @Column()
    programId: string;

    @Column({ default: 0 })
    timesListened: number;

    @Column({ default: false })
    isCompleted: boolean;

    @UpdateDateColumn()
    updatedAt: Date;
}

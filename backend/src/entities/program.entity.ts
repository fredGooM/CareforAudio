import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn
} from 'typeorm';
import { User } from './user.entity';
import { ProgramAudio } from './program-audio.entity';

@Entity('programs')
export class Program {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    description: string;

    @Column({ nullable: true })
    createdById: string;

    @ManyToOne(() => User, undefined, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'createdById' })
    createdBy: User;

    @OneToMany(() => ProgramAudio, (pa) => pa.program, { cascade: true })
    programAudios: ProgramAudio[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

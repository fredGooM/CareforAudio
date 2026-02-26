import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn
} from 'typeorm';
import { User } from './user.entity';
import { Program } from './program.entity';

@Entity('program_shares')
export class ProgramShare {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    programId: string;

    @ManyToOne(() => Program, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'programId' })
    program: Program;

    @Column()
    userId: string; // The person receiving the program (Teacher or Athlete)

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({ nullable: true })
    sharedById: string; // The person sharing it (Admin or Teacher)

    @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'sharedById' })
    sharedBy: User;

    @CreateDateColumn()
    createdAt: Date;
}

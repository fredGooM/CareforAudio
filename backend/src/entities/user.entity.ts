import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserGroup } from './user-group.entity';
import { AudioAccess } from './audio-access.entity';
import { UserProgress } from './user-progress.entity';
import { RefreshToken } from './refresh-token.entity';

export enum Role {
  ADMIN = 'ADMIN',
  TEACHER = 'TEACHER',
  ATHLETE = 'ATHLETE',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ type: 'enum', enum: Role, default: Role.ATHLETE })
  role: Role;

  @Column({ nullable: true })
  createdById: string;

  @ManyToOne(() => User, (user) => user.createdUsers, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @OneToMany(() => User, (user) => user.createdBy)
  createdUsers: User[];

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: true })
  mustChangePassword: boolean;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true })
  gender: string;

  @Column({ type: 'date', nullable: true })
  birthDate: Date;

  @Column({ type: 'simple-array', nullable: true })
  preferredTrainingDays: string[];

  @Column({ type: 'int', nullable: true })
  predominanceAnalytique: number;

  @Column({ type: 'int', nullable: true })
  predominanceAffectif: number;

  @Column({ type: 'int', nullable: true })
  predominanceInstinctif: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => UserGroup, (ug) => ug.user)
  groups: UserGroup[];

  @OneToMany(() => AudioAccess, (aa) => aa.user)
  audioAccesses: AudioAccess[];

  @OneToMany(() => UserProgress, (up) => up.user)
  progressRecords: UserProgress[];

  @OneToMany(() => RefreshToken, (rt) => rt.user)
  refreshTokens: RefreshToken[];
}

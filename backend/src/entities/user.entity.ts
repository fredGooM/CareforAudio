import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserGroup } from './user-group.entity';
import { AudioAccess } from './audio-access.entity';
import { UserProgress } from './user-progress.entity';
import { AudioLog } from './audio-log.entity';
import { RefreshToken } from './refresh-token.entity';

export enum Role {
  ADMIN = 'ADMIN',
  USER = 'USER',
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

  @Column({ type: 'enum', enum: Role, default: Role.USER })
  role: Role;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: true })
  mustChangePassword: boolean;

  @Column({ nullable: true })
  avatar: string;

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

  @OneToMany(() => AudioLog, (al) => al.user)
  audioLogs: AudioLog[];

  @OneToMany(() => RefreshToken, (rt) => rt.user)
  refreshTokens: RefreshToken[];
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum EventType {
  EVENEMENT = 'EVENEMENT',
  COMPETITION = 'COMPETITION',
  RDV_LIVE_COACH = 'RDV_LIVE_COACH',
  RDV_TRAINING = 'RDV_TRAINING',
}

@Entity('events')
export class CalendarEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'timestamp' })
  date: Date;

  @Column({ type: 'enum', enum: EventType, default: EventType.EVENEMENT })
  type: EventType;

  @Column({ type: 'int', default: 60 })
  duration: number;

  @Column()
  userId: string; // The athlete for whom the event is scheduled

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  createdById: string; // The teacher who created the event

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

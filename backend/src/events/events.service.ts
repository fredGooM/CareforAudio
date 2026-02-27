import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalendarEvent, User } from '../entities';

export class CreateEventDto {
  title: string;
  description?: string;
  date: Date;
  type?: string;
  userId: string;
}

export class UpdateEventDto {
  title?: string;
  description?: string;
  date?: Date;
  type?: string;
}

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(CalendarEvent)
    private readonly eventsRepo: Repository<CalendarEvent>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  private async verifyTeacherAccess(teacherId: string, athleteId: string) {
    const teacher = await this.userRepo.findOne({ where: { id: teacherId } });
    if (teacher?.role === 'ADMIN') return;

    const athlete = await this.userRepo.findOne({ where: { id: athleteId } });
    if (!athlete) throw new NotFoundException('Athlete not found');
    
    if (athlete.createdById !== teacherId) {
      throw new ForbiddenException('Vous ne pouvez gérer que les calendriers de vos propres athlètes.');
    }
  }

  async create(createDto: CreateEventDto, createdById: string): Promise<CalendarEvent> {
    await this.verifyTeacherAccess(createdById, createDto.userId);
    const event = this.eventsRepo.create({
      ...createDto,
      createdById,
    });
    return this.eventsRepo.save(event);
  }

  async findAllForUser(userId: string): Promise<CalendarEvent[]> {
    return this.eventsRepo.find({
      where: { userId },
      order: { date: 'ASC' },
      relations: ['createdBy'],
    });
  }

  async findAllForUserByTeacher(userId: string, teacherId: string): Promise<CalendarEvent[]> {
    await this.verifyTeacherAccess(teacherId, userId);
    return this.eventsRepo.find({
      where: { userId },
      order: { date: 'ASC' },
      relations: ['createdBy'],
    });
  }

  async findAllForTeacher(teacherId: string): Promise<CalendarEvent[]> {
    const teacher = await this.userRepo.findOne({ where: { id: teacherId } });
    if (teacher?.role === 'ADMIN') {
      return this.eventsRepo.find({
        order: { date: 'ASC' },
        relations: ['user', 'createdBy'],
      });
    }

    return this.eventsRepo.find({
      where: { user: { createdById: teacherId } },
      order: { date: 'ASC' },
      relations: ['user', 'createdBy'],
    });
  }

  async update(id: string, updateDto: UpdateEventDto, teacherId: string): Promise<CalendarEvent> {
    const event = await this.eventsRepo.findOne({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    await this.verifyTeacherAccess(teacherId, event.userId);
    
    Object.assign(event, updateDto);
    return this.eventsRepo.save(event);
  }

  async remove(id: string, teacherId: string): Promise<void> {
    const event = await this.eventsRepo.findOne({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    await this.verifyTeacherAccess(teacherId, event.userId);

    await this.eventsRepo.remove(event);
  }
}

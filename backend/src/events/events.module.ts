import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarEvent, User } from '../entities';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [TypeOrmModule.forFeature([CalendarEvent, User])],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}

import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Request } from '@nestjs/common';
import { EventsService, CreateEventDto, UpdateEventDto, AthleteCreateEventDto } from './events.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminOrTeacherGuard } from '../auth/roles.guard';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMyEvents(@Request() req: any) {
    return this.eventsService.findAllForUser(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me')
  async createMyEvent(@Body() createDto: AthleteCreateEventDto, @Request() req: any) {
    return this.eventsService.createForSelf(createDto, req.user.id);
  }

  @UseGuards(JwtAuthGuard, AdminOrTeacherGuard)
  @Get('teacher')
  async getTeacherEvents(@Request() req: any) {
    return this.eventsService.findAllForTeacher(req.user.id);
  }

  @UseGuards(JwtAuthGuard, AdminOrTeacherGuard)
  @Get('user/:userId')
  async getUserEvents(@Param('userId') userId: string, @Request() req: any) {
    return this.eventsService.findAllForUserByTeacher(userId, req.user.id);
  }

  @UseGuards(JwtAuthGuard, AdminOrTeacherGuard)
  @Post()
  async createEvent(@Body() createDto: CreateEventDto, @Request() req: any) {
    return this.eventsService.create(createDto, req.user.id);
  }

  @UseGuards(JwtAuthGuard, AdminOrTeacherGuard)
  @Put(':id')
  async updateEvent(@Param('id') id: string, @Body() updateDto: UpdateEventDto, @Request() req: any) {
    return this.eventsService.update(id, updateDto, req.user.id);
  }

  @UseGuards(JwtAuthGuard, AdminOrTeacherGuard)
  @Delete(':id')
  async deleteEvent(@Param('id') id: string, @Request() req: any) {
    return this.eventsService.remove(id, req.user.id);
  }
}

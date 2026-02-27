import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Param,
    UseGuards,
    Request,
    BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard, AdminOrTeacherGuard } from '../auth/roles.guard';
import { UsersService } from './users.service';
import { EmailService } from '../email/email.service';

@Controller('users')
export class UsersController {
    constructor(
        private readonly usersService: UsersService,
        private readonly emailService: EmailService,
    ) { }

    @UseGuards(JwtAuthGuard, AdminOrTeacherGuard)
    @Get()
    findAll(@Request() req: any) {
        return this.usersService.findAll(req.user);
    }

    @UseGuards(JwtAuthGuard, AdminOrTeacherGuard)
    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.usersService.findByIdForProfile(id);
    }

    @UseGuards(JwtAuthGuard)
    @Get('me/favorites')
    getFavorites(@Request() req: any) {
        return this.usersService.getFavorites(req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Put('me/favorites')
    setFavorite(@Request() req: any, @Body() body: { audioId: string; isFavorite: boolean }) {
        if (!body.audioId) throw new BadRequestException('audioId is required');
        return this.usersService.setFavorite(req.user.id, body.audioId, body.isFavorite);
    }

    @UseGuards(JwtAuthGuard, AdminOrTeacherGuard)
    @Post()
    create(@Body() body: any, @Request() req: any) {
        return this.usersService.create(body, req.user);
    }

    @UseGuards(JwtAuthGuard, AdminOrTeacherGuard)
    @Put(':id')
    update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
        return this.usersService.update(id, body, req.user);
    }

    @UseGuards(JwtAuthGuard, AdminOrTeacherGuard)
    @Put(':id/audio-access')
    updateAudioAccess(@Param('id') id: string, @Body() body: { audioIds: string[] }, @Request() req: any) {
        if (!Array.isArray(body.audioIds)) throw new BadRequestException('audioIds must be an array');
        return this.usersService.updateAudioAccess(id, body.audioIds, req.user);
    }

    @UseGuards(JwtAuthGuard, AdminOrTeacherGuard)
    @Post(':id/reset-password')
    resetPassword(@Param('id') id: string, @Request() req: any) {
        return this.usersService.resetPassword(id, req.user);
    }

    @UseGuards(JwtAuthGuard, AdminOrTeacherGuard)
    @Post(':id/send-welcome')
    async sendWelcome(@Param('id') id: string, @Request() req: any) {
        return this.usersService.sendWelcome(id, req.user, this.emailService);
    }
}

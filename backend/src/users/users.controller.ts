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
    NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/roles.guard';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @UseGuards(JwtAuthGuard, AdminGuard)
    @Get()
    findAll() {
        return this.usersService.findAll();
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

    @UseGuards(JwtAuthGuard, AdminGuard)
    @Post()
    create(@Body() body: any) {
        return this.usersService.create(body);
    }

    @UseGuards(JwtAuthGuard, AdminGuard)
    @Put(':id')
    update(@Param('id') id: string, @Body() body: any) {
        return this.usersService.update(id, body);
    }

    @UseGuards(JwtAuthGuard, AdminGuard)
    @Put(':id/audio-access')
    updateAudioAccess(@Param('id') id: string, @Body() body: { audioIds: string[] }) {
        if (!Array.isArray(body.audioIds)) throw new BadRequestException('audioIds must be an array');
        return this.usersService.updateAudioAccess(id, body.audioIds);
    }

    @UseGuards(JwtAuthGuard, AdminGuard)
    @Post(':id/reset-password')
    resetPassword(@Param('id') id: string) {
        return this.usersService.resetPassword(id);
    }

    @UseGuards(JwtAuthGuard, AdminGuard)
    @Post(':id/send-welcome')
    async sendWelcome(@Param('id') id: string) {
        // TODO: Implement Brevo email sending (same logic as POC)
        return { success: true, message: 'Email sending not yet configured' };
    }
}

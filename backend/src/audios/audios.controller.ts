import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard, AdminOrTeacherGuard } from '../auth/roles.guard';
import { AudiosService } from './audios.service';
import { memoryStorage } from 'multer';

const audioFileFilter = (req: any, file: Express.Multer.File, cb: any) => {
    const allowedMimes = [
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav',
        'audio/wave', 'audio/aiff', 'audio/x-aiff', 'audio/webm',
        'audio/mp4', 'audio/m4a'
    ];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only audio files are allowed'), false);
    }
};

@Controller('audios')
export class AudiosController {
    constructor(private readonly audiosService: AudiosService) { }

    @UseGuards(JwtAuthGuard)
    @Get()
    findAll(@Request() req: any) {
        return this.audiosService.findAllForUser(req.user.id, req.user.role);
    }

    @UseGuards(JwtAuthGuard)
    @Get('favorites')
    getFavoriteAudios(@Request() req: any) {
        return this.audiosService.getFavoriteAudios(req.user.id, req.user.role);
    }

    @UseGuards(JwtAuthGuard)
    @Get('my-program')
    getMyProgram(@Request() req: any) {
        return this.audiosService.getMyProgram(req.user.id);
    }

    @UseGuards(JwtAuthGuard, AdminGuard)
    @Get('my-program/admin')
    getMyProgramAdmin(@Query('userId') userId: string) {
        return this.audiosService.getMyProgramAdmin(userId);
    }

    @UseGuards(JwtAuthGuard, AdminGuard)
    @Post('my-program/admin')
    setMyProgramAdmin(
        @Body() body: { userId: string; audioId: string; isMyProgram: boolean },
    ) {
        return this.audiosService.setMyProgramAdmin(
            body.userId,
            body.audioId,
            body.isMyProgram,
        );
    }

    @UseGuards(JwtAuthGuard, AdminOrTeacherGuard)
    @Post()
    @UseInterceptors(
        FileInterceptor('file', {
            storage: memoryStorage(),
            fileFilter: audioFileFilter,
            limits: { fileSize: 50 * 1024 * 1024 },
        }),
    )
    create(@Body() body: any, @UploadedFile() file: Express.Multer.File, @Request() req: any) {
        return this.audiosService.create(body, file, req.user);
    }

    @UseGuards(JwtAuthGuard, AdminOrTeacherGuard)
    @Put(':id')
    update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
        return this.audiosService.update(id, body, req.user);
    }

    @UseGuards(JwtAuthGuard, AdminOrTeacherGuard)
    @Delete(':id')
    remove(@Param('id') id: string, @Request() req: any) {
        return this.audiosService.remove(id, req.user);
    }
}

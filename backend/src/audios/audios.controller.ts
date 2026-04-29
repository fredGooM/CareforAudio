import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    Request,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminOrTeacherGuard } from '../auth/roles.guard';
import { AudiosService } from './audios.service';
import { memoryStorage } from 'multer';

const audioFileFilter = (req: any, file: Express.Multer.File, cb: any) => {
    const allowedMimes = [
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav',
        'audio/wave', 'audio/aiff', 'audio/x-aiff', 'audio/webm',
        'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac', 'audio/x-aac'
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

    @UseGuards(JwtAuthGuard, AdminOrTeacherGuard)
    @Post()
    @UseInterceptors(
        FileInterceptor('file', {
            storage: memoryStorage(),
            fileFilter: audioFileFilter,
            limits: { fileSize: 500 * 1024 * 1024 },
        }),
    )
    create(@Body() body: any, @UploadedFile() file: Express.Multer.File, @Request() req: any) {
        return this.audiosService.create(body, file, req.user);
    }

    @UseGuards(JwtAuthGuard, AdminOrTeacherGuard)
    @Post('upload-session')
    startUploadSession(@Body() body: { mimeType?: string }, @Request() req: any) {
        return this.audiosService.startUploadSession(req.user.id, body.mimeType || 'audio/webm');
    }

    @UseGuards(JwtAuthGuard, AdminOrTeacherGuard)
    @Post('upload-chunk/:sessionId')
    @UseInterceptors(FileInterceptor('chunk', { storage: memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } }))
    appendChunk(@Param('sessionId') sessionId: string, @UploadedFile() file: Express.Multer.File) {
        if (!file) throw new BadRequestException('No chunk provided');
        return this.audiosService.appendChunk(sessionId, file.buffer);
    }

    @UseGuards(JwtAuthGuard, AdminOrTeacherGuard)
    @Post('upload-finalize/:sessionId')
    finalizeUpload(@Param('sessionId') sessionId: string, @Body() body: any, @Request() req: any) {
        return this.audiosService.finalizeUpload(sessionId, body, req.user);
    }

    @UseGuards(JwtAuthGuard, AdminOrTeacherGuard)
    @Delete('upload-session/:sessionId')
    cancelUploadSession(@Param('sessionId') sessionId: string, @Request() req: any) {
        return this.audiosService.cancelUploadSession(sessionId, req.user.id);
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

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AudiosService } from './audios.service';
import { AudiosController } from './audios.controller';
import {
    AudioTrack,
    AudioAccess,
    GroupAccess,
    UserGroup,
    UserProgress,
} from '../entities';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            AudioTrack,
            AudioAccess,
            GroupAccess,
            UserGroup,
            UserProgress,
        ]),
    ],
    controllers: [AudiosController],
    providers: [AudiosService],
    exports: [AudiosService],
})
export class AudiosModule { }

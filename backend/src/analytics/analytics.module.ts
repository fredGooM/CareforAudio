import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { AudioLog, UserProgress, AudioTrack, User, UserGroup } from '../entities';

@Module({
    imports: [
        TypeOrmModule.forFeature([AudioLog, UserProgress, AudioTrack, User, UserGroup]),
    ],
    controllers: [AnalyticsController],
    providers: [AnalyticsService],
})
export class AnalyticsModule { }

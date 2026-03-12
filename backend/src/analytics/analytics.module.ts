import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import {
  UserProgress,
  AudioTrack,
  User,
  ProgramShare,
  ProgramAudio,
  AudioListenRecord,
  Program,
} from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserProgress,
      AudioTrack,
      User,
      ProgramShare,
      ProgramAudio,
      AudioListenRecord,
      Program,
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}

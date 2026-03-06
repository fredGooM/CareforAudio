import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProgramsService } from './programs.service';
import { ProgramsController } from './programs.controller';
import { Program, ProgramAudio, ProgramShare, User, AudioTrack, UserProgress, ProgramUserProgress } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([Program, ProgramAudio, ProgramShare, User, AudioTrack, UserProgress, ProgramUserProgress])],
  controllers: [ProgramsController],
  providers: [ProgramsService],
  exports: [ProgramsService],
})
export class ProgramsModule {}

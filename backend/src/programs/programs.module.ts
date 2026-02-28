import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProgramsService } from './programs.service';
import { ProgramsController } from './programs.controller';
import { Program, ProgramShare, User, AudioTrack, UserProgress } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([Program, ProgramShare, User, AudioTrack, UserProgress])],
  controllers: [ProgramsController],
  providers: [ProgramsService],
  exports: [ProgramsService],
})
export class ProgramsModule {}

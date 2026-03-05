import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserStatesService } from './user-states.service';
import { UserStatesController } from './user-states.controller';
import { UserState } from '../entities';

@Module({
    imports: [TypeOrmModule.forFeature([UserState])],
    controllers: [UserStatesController],
    providers: [UserStatesService],
    exports: [UserStatesService],
})
export class UserStatesModule {}

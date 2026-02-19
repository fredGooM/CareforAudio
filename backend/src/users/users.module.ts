import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User, UserGroup, AudioAccess, UserProgress } from '../entities';

@Module({
    imports: [TypeOrmModule.forFeature([User, UserGroup, AudioAccess, UserProgress])],
    controllers: [UsersController],
    providers: [UsersService],
    exports: [UsersService],
})
export class UsersModule { }

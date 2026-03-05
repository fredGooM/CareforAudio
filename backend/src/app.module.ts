import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AudiosModule } from './audios/audios.module';
import { GroupsModule } from './groups/groups.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { StorageModule } from './storage/storage.module';
import { EmailModule } from './email/email.module';
import { ProgramsModule } from './programs/programs.module';
import { EventsModule } from './events/events.module';
import {
  User,
  Group,
  UserGroup,
  AudioTrack,
  AudioAccess,
  RefreshToken,
  UserProgress,
  AudioLog,
  AppConfig,
  Program,
  ProgramAudio,
  ProgramShare,
  CalendarEvent,
} from './entities';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions => ({
        type: 'postgres',
        host: config.get('DATABASE_HOST', 'localhost'),
        port: config.get<number>('DATABASE_PORT', 5432),
        username: config.get('DATABASE_USER', 'postgres'),
        password: config.get('DATABASE_PASSWORD', 'root'),
        database: config.get('DATABASE_NAME', 'careformance'),
        entities: [
          User,
          Group,
          UserGroup,
          AudioTrack,
          AudioAccess,
          RefreshToken,
          UserProgress,
          AudioLog,
          AppConfig,
          Program,
          ProgramAudio,
          ProgramShare,
          CalendarEvent,
        ],
        synchronize: true, // Dev only — use migrations in production
      }),
    }),
    StorageModule,
    EmailModule,
    AuthModule,
    UsersModule,
    AudiosModule,
    GroupsModule,
    ProgramsModule,
    AnalyticsModule,
    EventsModule,
  ],
})
export class AppModule { }

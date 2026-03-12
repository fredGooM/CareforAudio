import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import {
  User,
  Group,
  UserGroup,
  AudioTrack,
  AudioAccess,
  UserProgress,
  RefreshToken,
  AppConfig,
  Program,
  ProgramAudio,
  ProgramShare,
  CalendarEvent,
  UserState,
  AudioListenRecord,
} from './entities';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'root',
  database: process.env.DATABASE_NAME || 'careformance',
  entities: [
    User,
    Group,
    UserGroup,
    AudioTrack,
    AudioAccess,
    RefreshToken,
    UserProgress,
    AppConfig,
    Program,
    ProgramAudio,
    ProgramShare,
    CalendarEvent,
    UserState,
    AudioListenRecord,
  ],
  synchronize: true,
  dropSchema: true,
});

const groupSeeds = [
  { id: 'g1', name: 'Voiture (GT, kart, F2)' },
  { id: 'g2', name: 'Tennis & padel' },
  { id: 'g3', name: 'Aviron' },
  { id: 'g4', name: 'Rugby' },
];

const athleteSeeds = [
  {
    email: 'athlete@careformance.com',
    firstName: 'Thomas',
    lastName: 'Runner',
    avatar: 'https://picsum.photos/150/150?random=2',
    groups: ['g1', 'g2'],
  },
  {
    email: 'lisa@careformance.com',
    firstName: 'Lisa',
    lastName: 'Swim',
    avatar: 'https://picsum.photos/150/150?random=3',
    groups: ['g2'],
  },
  {
    email: 'david@careformance.com',
    firstName: 'David',
    lastName: 'Focus',
    avatar: 'https://picsum.photos/150/150?random=4',
    groups: ['g1', 'g3'],
  },
];

const teacherSeeds = [
  {
    email: 'teacher@careformance.com',
    firstName: 'Sarah',
    lastName: 'Coach',
    avatar: 'https://picsum.photos/150/150?random=5',
  },
];

const randomBetween = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

async function seed() {
  await AppDataSource.initialize();
  console.log('🌱 Seeding database...');

  const groupRepo = AppDataSource.getRepository(Group);
  const userRepo = AppDataSource.getRepository(User);
  const userGroupRepo = AppDataSource.getRepository(UserGroup);
  const audioRepo = AppDataSource.getRepository(AudioTrack);
  const listenRecordRepo = AppDataSource.getRepository(AudioListenRecord);
  const progressRepo = AppDataSource.getRepository(UserProgress);

  // Groups
  for (const g of groupSeeds) {
    const existing = await groupRepo.findOne({ where: { id: g.id } });
    if (existing) {
      existing.name = g.name;
      await groupRepo.save(existing);
    } else {
      await groupRepo.save(g);
    }
  }

  // Admin user
  const adminPass = await bcrypt.hash('admin', 10);
  let admin = await userRepo.findOne({
    where: { email: 'admin@careformance.com' },
  });
  if (admin) {
    admin.passwordHash = adminPass;
    admin.mustChangePassword = false;
    admin.role = 'ADMIN' as any;
    await userRepo.save(admin);
  } else {
    admin = await userRepo.save(
      userRepo.create({
        email: 'admin@careformance.com',
        passwordHash: adminPass,
        firstName: 'Jean',
        lastName: 'Admin',
        role: 'ADMIN' as any,
        mustChangePassword: false,
        avatar: 'https://picsum.photos/150/150?random=1',
      }),
    );
  }

  // Athlete users
  const athletePassword = await bcrypt.hash('care1234!', 10);
  const userIds: string[] = [];
  const testAthleteEmail = 'athlete@careformance.com';
  for (const a of athleteSeeds) {
    let user = await userRepo.findOne({ where: { email: a.email } });
    if (user) {
      user.firstName = a.firstName;
      user.lastName = a.lastName;
      user.avatar = a.avatar;
      user.passwordHash = athletePassword;
      user.mustChangePassword = false;
      await userRepo.save(user);
    } else {
      user = await userRepo.save(
        userRepo.create({
          email: a.email,
          passwordHash: athletePassword,
          firstName: a.firstName,
          lastName: a.lastName,
          role: 'ATHLETE' as any,
          mustChangePassword: false,
          avatar: a.avatar,
        }),
      );
    }
    // Only add demo athletes (not the test account) to analytics seeding
    if (a.email !== testAthleteEmail) {
      userIds.push(user.id);
    }

    for (const groupId of a.groups) {
      const existing = await userGroupRepo.findOne({
        where: { userId: user.id, groupId },
      });
      if (!existing) {
        await userGroupRepo.save({ userId: user.id, groupId });
      }
    }
  }

  // Teacher users
  const teacherPassword = await bcrypt.hash('care1234!', 10);
  for (const t of teacherSeeds) {
    let user = await userRepo.findOne({ where: { email: t.email } });
    if (user) {
      user.firstName = t.firstName;
      user.lastName = t.lastName;
      user.avatar = t.avatar;
      user.passwordHash = teacherPassword;
      user.mustChangePassword = false;
      await userRepo.save(user);
    } else {
      user = await userRepo.save(
        userRepo.create({
          email: t.email,
          passwordHash: teacherPassword,
          firstName: t.firstName,
          lastName: t.lastName,
          role: 'TEACHER' as any,
          mustChangePassword: false,
          avatar: t.avatar,
        }),
      );
    }
    userIds.push(user.id);
  }

  // Audio tracks
  const audioSeeds = [
    {
      title: 'Bienvenue sur Careformance',
      description: 'Introduction à la plateforme.',
      duration: 600,
      coverUrl: 'https://picsum.photos/400/400?random=10',
    },
    {
      title: 'Pré-compétition – Visualisation',
      description: 'Prépare ton esprit avant la compétition.',
      duration: 900,
      coverUrl: 'https://picsum.photos/400/400?random=11',
    },
    {
      title: 'Sommeil profond',
      description: 'Routine audio pour optimiser le sommeil.',
      duration: 1200,
      coverUrl: 'https://picsum.photos/400/400?random=12',
    },
    {
      title: 'Récupération active',
      description: 'Ramène le calme après un entrainement intense.',
      duration: 780,
      coverUrl: 'https://picsum.photos/400/400?random=13',
    },
  ];

  const savedAudioIds: string[] = [];
  for (let i = 0; i < audioSeeds.length; i++) {
    const a = audioSeeds[i];
    let audio = await audioRepo.findOne({
      where: { storageKey: `seed-a${i + 1}.mp3` },
    });
    if (audio) {
      audio.title = a.title;
      audio.description = a.description;
      audio.duration = a.duration;
      audio.coverUrl = a.coverUrl;
      audio.published = true;
      await audioRepo.save(audio);
    } else {
      audio = await audioRepo.save(
        audioRepo.create({
          title: a.title,
          description: a.description,
          duration: a.duration,
          storageKey: `seed-a${i + 1}.mp3`,
          mimeType: 'audio/mpeg',
          size: 1024,
          published: true,
          coverUrl: a.coverUrl,
        }),
      );
    }
    savedAudioIds.push(audio.id);
  }

  // Analytics data — seed AudioListenRecord for demo users (not the test athlete)
  const existingRecords = await listenRecordRepo.count();
  if (existingRecords === 0) {
    console.log('➡️  Populating analytics data...');
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    const recordEntries: any[] = [];
    for (const uid of userIds) {
      const sessions = randomBetween(10, 20);
      for (let i = 0; i < sessions; i++) {
        const audioId =
          savedAudioIds[Math.floor(Math.random() * savedAudioIds.length)];
        const duration = randomBetween(180, 900);
        const daysAgo = randomBetween(0, 29);
        const listenedAt = new Date(
          now - daysAgo * dayMs - randomBetween(0, dayMs),
        );
        recordEntries.push({ userId: uid, audioId, duration, listenedAt });
      }
    }
    if (recordEntries.length > 0) {
      await listenRecordRepo.save(recordEntries);
    }

    for (const uid of userIds) {
      const shuffled = [...savedAudioIds]
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(savedAudioIds.length, 5));
      for (const audioId of shuffled) {
        const completionRatio = Math.random();
        const isCompleted = completionRatio > 0.85;
        const lastPosition = isCompleted
          ? 600
          : Math.round(600 * completionRatio);
        const timesListened = isCompleted ? randomBetween(1, 4) : 0;
        const existing = await progressRepo.findOne({
          where: { userId: uid, audioId },
        });
        if (existing) {
          existing.lastPosition = lastPosition;
          existing.isCompleted = isCompleted;
          existing.timesListened = timesListened;
          existing.isFavorite = Math.random() > 0.6;
          await progressRepo.save(existing);
        } else {
          await progressRepo.save(
            progressRepo.create({
              userId: uid,
              audioId,
              lastPosition,
              isCompleted,
              timesListened,
              isFavorite: Math.random() > 0.6,
            }),
          );
        }
      }
    }
    console.log(`✅ Injected ${recordEntries.length} listen records.`);
  }

  console.log('✅ Seeding completed.');
  await AppDataSource.destroy();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});

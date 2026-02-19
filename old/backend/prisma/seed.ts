// @ts-ignore
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const groupSeeds = [
  { id: 'g1', name: 'Voiture (GT, kart, F2)' },
  { id: 'g2', name: 'Tennis & padel' },
  { id: 'g3', name: 'Aviron' },
  { id: 'g4', name: 'Rugby' }
];

const categorySeeds = [
  {
    id: 'c1',
    name: 'Pré-compétition',
    color: 'bg-blue-100 text-blue-800',
    image: '/images/pre_competition.png'
  },
  {
    id: 'c2',
    name: 'Récupération',
    color: 'bg-green-100 text-green-800',
    image: '/images/recuperation.png'
  },
  {
    id: 'c3',
    name: 'Sommeil',
    color: 'bg-indigo-100 text-indigo-800',
    image: '/images/sommeil.png'
  },
  {
    id: 'c4',
    name: 'Concentration',
    color: 'bg-purple-100 text-purple-800',
    image: '/images/concentration.png'
  }
];

const athleteSeeds = [
  {
    email: 'athlete@careformance.com',
    firstName: 'Thomas',
    lastName: 'Runner',
    avatar: 'https://picsum.photos/150/150?random=2',
    groups: ['g1', 'g2']
  },
  {
    email: 'lisa@careformance.com',
    firstName: 'Lisa',
    lastName: 'Swim',
    avatar: 'https://picsum.photos/150/150?random=3',
    groups: ['g2']
  },
  {
    email: 'david@careformance.com',
    firstName: 'David',
    lastName: 'Focus',
    avatar: 'https://picsum.photos/150/150?random=4',
    groups: ['g1', 'g3']
  }
];

const audioSeeds = [
  {
    id: 'a1',
    title: 'Bienvenue sur Careformance',
    description: 'Introduction à la plateforme.',
    duration: 600,
    categoryId: 'c1',
    coverUrl: 'https://picsum.photos/400/400?random=10',
    groups: ['g1', 'g2', 'g3']
  },
  {
    id: 'a2',
    title: 'Pré-compétition – Visualisation',
    description: 'Prépare ton esprit avant la compétition.',
    duration: 900,
    categoryId: 'c1',
    coverUrl: 'https://picsum.photos/400/400?random=11',
    groups: ['g1']
  },
  {
    id: 'a3',
    title: 'Sommeil profond',
    description: 'Routine audio pour optimiser le sommeil.',
    duration: 1200,
    categoryId: 'c3',
    coverUrl: 'https://picsum.photos/400/400?random=12',
    groups: ['g2', 'g3']
  },
  {
    id: 'a4',
    title: 'Récupération active',
    description: 'Ramène le calme après un entrainement intense.',
    duration: 780,
    categoryId: 'c2',
    coverUrl: 'https://picsum.photos/400/400?random=13',
    groups: ['g1', 'g2']
  }
];

const randomBetween = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

async function ensureBaseData() {
  console.log('➡️  Ensuring base data (groups, categories, users, audios)...');

  for (const group of groupSeeds) {
    await prisma.group.upsert({
      where: { id: group.id },
      update: { name: group.name },
      create: group
    });
  }

  for (const category of categorySeeds) {
    await prisma.category.upsert({
      where: { id: category.id },
      update: {
        name: category.name,
        color: category.color,
        image: category.image
      },
      create: category
    });
  }

  const adminPass = await bcrypt.hash('admin', 10);
  await prisma.user.upsert({
    where: { email: 'admin@careformance.com' },
    update: {
      firstName: 'Jean',
      lastName: 'Admin',
      passwordHash: adminPass,
      mustChangePassword: false,
      role: 'ADMIN'
    },
    create: {
      email: 'admin@careformance.com',
      passwordHash: adminPass,
      firstName: 'Jean',
      lastName: 'Admin',
      role: 'ADMIN',
      mustChangePassword: false,
      avatar: 'https://picsum.photos/150/150?random=1'
    }
  });

  const athletePassword = await bcrypt.hash('care1234!', 10);
  for (const athlete of athleteSeeds) {
    const result = await prisma.user.upsert({
      where: { email: athlete.email },
      update: {
        firstName: athlete.firstName,
        lastName: athlete.lastName,
        avatar: athlete.avatar,
        passwordHash: athletePassword,
        mustChangePassword: true,
        role: 'USER'
      },
      create: {
        email: athlete.email,
        passwordHash: athletePassword,
        firstName: athlete.firstName,
        lastName: athlete.lastName,
        role: 'USER',
        mustChangePassword: true,
        avatar: athlete.avatar
      }
    });

    for (const groupId of athlete.groups) {
      await prisma.userGroup.upsert({
        where: { userId_groupId: { userId: result.id, groupId } },
        update: {},
        create: { userId: result.id, groupId }
      });
    }
  }

  for (const audio of audioSeeds) {
    const created = await prisma.audioTrack.upsert({
      where: { id: audio.id },
      update: {
        title: audio.title,
        description: audio.description,
        duration: audio.duration,
        categoryId: audio.categoryId,
        coverUrl: audio.coverUrl,
        published: true
      },
      create: {
        id: audio.id,
        title: audio.title,
        description: audio.description,
        duration: audio.duration,
        storageKey: `seed-${audio.id}.mp3`,
        mimeType: 'audio/mpeg',
        size: 1024,
        categoryId: audio.categoryId,
        published: true,
        coverUrl: audio.coverUrl
      }
    });

    for (const groupId of audio.groups) {
      await prisma.groupAccess.upsert({
        where: { groupId_audioId: { groupId, audioId: created.id } },
        update: {},
        create: { groupId, audioId: created.id }
      });
    }
  }
}

async function seedAnalyticsData() {
  console.log('➡️  Populating analytics data...');
  const users = await prisma.user.findMany({ where: { role: 'USER' } });
  const audios = await prisma.audioTrack.findMany({ where: { published: true } });

  if (!users.length || !audios.length) {
    console.log('⚠️  Not enough users/audios to seed analytics. Skipping.');
    return;
  }

  const existingLogs = await prisma.audioLog.count();
  if (existingLogs > 0) {
    console.log('ℹ️  Analytics tables already contain data. Skipping analytics seed.');
    return;
  }

  const logEntries: { userId: string; audioId: string; duration: number; createdAt: Date }[] = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (const user of users) {
    const sessions = randomBetween(10, 20);
    for (let i = 0; i < sessions; i++) {
      const audio = audios[Math.floor(Math.random() * audios.length)];
      const totalDuration = audio.duration && audio.duration > 0 ? audio.duration : 600;
      const duration = randomBetween(Math.floor(totalDuration * 0.3), totalDuration);
      const daysAgo = randomBetween(0, 29);
      const createdAt = new Date(now - daysAgo * dayMs - randomBetween(0, dayMs));

      logEntries.push({
        userId: user.id,
        audioId: audio.id,
        duration,
        createdAt
      });
    }
  }

  if (logEntries.length) {
    await prisma.audioLog.createMany({ data: logEntries });
  }

  for (const user of users) {
    const shuffled = [...audios].sort(() => Math.random() - 0.5).slice(0, Math.min(audios.length, 5));
    for (const audio of shuffled) {
      const duration = audio.duration && audio.duration > 0 ? audio.duration : 600;
      const completionRatio = Math.random();
      const isCompleted = completionRatio > 0.85;
      const lastPosition = isCompleted ? duration : Math.round(duration * completionRatio);
      const timesListened = isCompleted ? randomBetween(1, 4) : 0;

      await prisma.userProgress.upsert({
        where: { userId_audioId: { userId: user.id, audioId: audio.id } },
        update: {
          lastPosition,
          isCompleted,
          timesListened,
          isFavorite: Math.random() > 0.6
        },
        create: {
          userId: user.id,
          audioId: audio.id,
          lastPosition,
          isCompleted,
          timesListened,
          isFavorite: Math.random() > 0.6
        }
      });
    }
  }

  console.log(`✅ Injected ${logEntries.length} audio sessions and progress rows for analytics.`);
}

export async function seed() {
  console.log('🌱 Seeding database...');
  await ensureBaseData();
  await seedAnalyticsData();
  console.log('✅ Seeding completed.');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

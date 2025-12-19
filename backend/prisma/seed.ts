// @ts-ignore
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export async function seed() {
  console.log('🌱 Seeding database...');

  // Check if already seeded
  const count = await prisma.user.count();
  if (count > 0) {
      console.log('Database already has data. Skipping seed.');
      return;
  }

  // Create Groups
  const groupA = await prisma.group.create({ data: { id: 'g1', name: 'Équipe A - Olympique' } });
  const groupB = await prisma.group.create({ data: { id: 'g2', name: 'Athlètes Endurance' } });
  const groupC = await prisma.group.create({ data: { id: 'g3', name: 'Réhabilitation' } });

  // Create Admin
  const adminPass = await bcrypt.hash('admin', 10);
  await prisma.user.create({
    data: {
      email: 'admin@careformance.com',
      passwordHash: adminPass,
      firstName: 'Jean',
      lastName: 'Admin',
      role: 'ADMIN',
      mustChangePassword: false,
      avatar: 'https://picsum.photos/150/150?random=1'
    }
  });

  // Create Athlete
  const userPass = await bcrypt.hash('care1234!', 10);
  const athlete = await prisma.user.create({
    data: {
      email: 'athlete@careformance.com',
      passwordHash: userPass,
      firstName: 'Thomas',
      lastName: 'Runner',
      role: 'USER',
      mustChangePassword: true,
      avatar: 'https://picsum.photos/150/150?random=2'
    }
  });

  // Assign Athlete to Groups
  await prisma.userGroup.create({ data: { userId: athlete.id, groupId: groupA.id } });
  await prisma.userGroup.create({ data: { userId: athlete.id, groupId: groupB.id } });

  // Create Fake Podcast (Note: storageKey is fake, won't play until real file upload)
  // To test audio, user should upload a real file via Admin Interface
  const a1 = await prisma.audioTrack.create({
    data: {
      id: 'a1',
      title: 'Bienvenue sur Careformance',
      description: 'Introduction à la plateforme.',
      duration: 60,
      storageKey: 'fake-file.mp3',
      categoryId: 'c1',
      published: true,
      mimeType: 'audio/mpeg',
      size: 1024,
      coverUrl: 'https://picsum.photos/400/400?random=10'
    }
  });

  // Permissions
  await prisma.groupAccess.create({ data: { groupId: groupA.id, audioId: a1.id } });

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

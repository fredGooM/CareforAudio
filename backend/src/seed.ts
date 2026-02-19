import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import {
    User,
    Group,
    UserGroup,
    AudioTrack,
    Category,
    GroupAccess,
    AudioAccess,
    UserProgress,
    AudioLog,
    RefreshToken,
    AppConfig,
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
        User, Group, UserGroup, AudioTrack, Category,
        GroupAccess, AudioAccess, RefreshToken, UserProgress, AudioLog, AppConfig,
    ],
    synchronize: true,
});

const groupSeeds = [
    { id: 'g1', name: 'Voiture (GT, kart, F2)' },
    { id: 'g2', name: 'Tennis & padel' },
    { id: 'g3', name: 'Aviron' },
    { id: 'g4', name: 'Rugby' },
];

const categorySeeds = [
    { id: undefined as any, name: 'Pré-compétition', color: 'bg-blue-100 text-blue-800', image: '/images/pre_competition.png' },
    { id: undefined as any, name: 'Récupération', color: 'bg-green-100 text-green-800', image: '/images/recuperation.png' },
    { id: undefined as any, name: 'Sommeil', color: 'bg-indigo-100 text-indigo-800', image: '/images/sommeil.png' },
    { id: undefined as any, name: 'Concentration', color: 'bg-purple-100 text-purple-800', image: '/images/concentration.png' },
];

const athleteSeeds = [
    { email: 'athlete@careformance.com', firstName: 'Thomas', lastName: 'Runner', avatar: 'https://picsum.photos/150/150?random=2', groups: ['g1', 'g2'] },
    { email: 'lisa@careformance.com', firstName: 'Lisa', lastName: 'Swim', avatar: 'https://picsum.photos/150/150?random=3', groups: ['g2'] },
    { email: 'david@careformance.com', firstName: 'David', lastName: 'Focus', avatar: 'https://picsum.photos/150/150?random=4', groups: ['g1', 'g3'] },
];

const randomBetween = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

async function seed() {
    await AppDataSource.initialize();
    console.log('🌱 Seeding database...');

    const groupRepo = AppDataSource.getRepository(Group);
    const categoryRepo = AppDataSource.getRepository(Category);
    const userRepo = AppDataSource.getRepository(User);
    const userGroupRepo = AppDataSource.getRepository(UserGroup);
    const audioRepo = AppDataSource.getRepository(AudioTrack);
    const groupAccessRepo = AppDataSource.getRepository(GroupAccess);
    const audioLogRepo = AppDataSource.getRepository(AudioLog);
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

    // Categories
    const categoryIds: string[] = [];
    for (const c of categorySeeds) {
        const existing = await categoryRepo.findOne({ where: { name: c.name } });
        if (existing) {
            existing.color = c.color;
            existing.image = c.image;
            await categoryRepo.save(existing);
            categoryIds.push(existing.id);
        } else {
            const saved = await categoryRepo.save(categoryRepo.create({
                name: c.name, color: c.color, image: c.image,
            }));
            categoryIds.push(saved.id);
        }
    }

    // Admin user
    const adminPass = await bcrypt.hash('admin', 10);
    let admin = await userRepo.findOne({ where: { email: 'admin@careformance.com' } });
    if (admin) {
        admin.passwordHash = adminPass;
        admin.mustChangePassword = false;
        admin.role = 'ADMIN' as any;
        await userRepo.save(admin);
    } else {
        admin = await userRepo.save(userRepo.create({
            email: 'admin@careformance.com',
            passwordHash: adminPass,
            firstName: 'Jean',
            lastName: 'Admin',
            role: 'ADMIN' as any,
            mustChangePassword: false,
            avatar: 'https://picsum.photos/150/150?random=1',
        }));
    }

    // Athlete users
    const athletePassword = await bcrypt.hash('care1234!', 10);
    const userIds: string[] = [];
    for (const a of athleteSeeds) {
        let user = await userRepo.findOne({ where: { email: a.email } });
        if (user) {
            user.firstName = a.firstName;
            user.lastName = a.lastName;
            user.avatar = a.avatar;
            user.passwordHash = athletePassword;
            user.mustChangePassword = true;
            await userRepo.save(user);
        } else {
            user = await userRepo.save(userRepo.create({
                email: a.email,
                passwordHash: athletePassword,
                firstName: a.firstName,
                lastName: a.lastName,
                role: 'USER' as any,
                mustChangePassword: true,
                avatar: a.avatar,
            }));
        }
        userIds.push(user.id);

        for (const groupId of a.groups) {
            const existing = await userGroupRepo.findOne({
                where: { userId: user.id, groupId },
            });
            if (!existing) {
                await userGroupRepo.save({ userId: user.id, groupId });
            }
        }
    }

    // Audio tracks
    const audioSeeds = [
        { title: 'Bienvenue sur Careformance', description: 'Introduction à la plateforme.', duration: 600, categoryId: categoryIds[0], coverUrl: 'https://picsum.photos/400/400?random=10', groups: ['g1', 'g2', 'g3'] },
        { title: 'Pré-compétition – Visualisation', description: 'Prépare ton esprit avant la compétition.', duration: 900, categoryId: categoryIds[0], coverUrl: 'https://picsum.photos/400/400?random=11', groups: ['g1'] },
        { title: 'Sommeil profond', description: 'Routine audio pour optimiser le sommeil.', duration: 1200, categoryId: categoryIds[2], coverUrl: 'https://picsum.photos/400/400?random=12', groups: ['g2', 'g3'] },
        { title: 'Récupération active', description: 'Ramène le calme après un entrainement intense.', duration: 780, categoryId: categoryIds[1], coverUrl: 'https://picsum.photos/400/400?random=13', groups: ['g1', 'g2'] },
    ];

    const savedAudioIds: string[] = [];
    for (let i = 0; i < audioSeeds.length; i++) {
        const a = audioSeeds[i];
        let audio = await audioRepo.findOne({ where: { storageKey: `seed-a${i + 1}.mp3` } });
        if (audio) {
            audio.title = a.title;
            audio.description = a.description;
            audio.duration = a.duration;
            audio.categoryId = a.categoryId;
            audio.coverUrl = a.coverUrl;
            audio.published = true;
            await audioRepo.save(audio);
        } else {
            audio = await audioRepo.save(audioRepo.create({
                title: a.title,
                description: a.description,
                duration: a.duration,
                storageKey: `seed-a${i + 1}.mp3`,
                mimeType: 'audio/mpeg',
                size: 1024,
                categoryId: a.categoryId,
                published: true,
                coverUrl: a.coverUrl,
            }));
        }
        savedAudioIds.push(audio.id);

        for (const groupId of a.groups) {
            const existing = await groupAccessRepo.findOne({
                where: { groupId, audioId: audio.id },
            });
            if (!existing) {
                await groupAccessRepo.save({ groupId, audioId: audio.id });
            }
        }
    }

    // Analytics data
    const existingLogs = await audioLogRepo.count();
    if (existingLogs === 0) {
        console.log('➡️  Populating analytics data...');
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;

        const logEntries: any[] = [];
        for (const uid of userIds) {
            const sessions = randomBetween(10, 20);
            for (let i = 0; i < sessions; i++) {
                const audioId = savedAudioIds[Math.floor(Math.random() * savedAudioIds.length)];
                const duration = randomBetween(180, 900);
                const daysAgo = randomBetween(0, 29);
                const createdAt = new Date(now - daysAgo * dayMs - randomBetween(0, dayMs));
                logEntries.push({ userId: uid, audioId, duration, createdAt });
            }
        }
        if (logEntries.length > 0) {
            await audioLogRepo.save(logEntries);
        }

        for (const uid of userIds) {
            const shuffled = [...savedAudioIds].sort(() => Math.random() - 0.5).slice(0, Math.min(savedAudioIds.length, 5));
            for (const audioId of shuffled) {
                const completionRatio = Math.random();
                const isCompleted = completionRatio > 0.85;
                const lastPosition = isCompleted ? 600 : Math.round(600 * completionRatio);
                const timesListened = isCompleted ? randomBetween(1, 4) : 0;
                const existing = await progressRepo.findOne({ where: { userId: uid, audioId } });
                if (existing) {
                    existing.lastPosition = lastPosition;
                    existing.isCompleted = isCompleted;
                    existing.timesListened = timesListened;
                    existing.isFavorite = Math.random() > 0.6;
                    await progressRepo.save(existing);
                } else {
                    await progressRepo.save(progressRepo.create({
                        userId: uid,
                        audioId,
                        lastPosition,
                        isCompleted,
                        timesListened,
                        isFavorite: Math.random() > 0.6,
                    }));
                }
            }
        }
        console.log(`✅ Injected ${logEntries.length} audio sessions.`);
    }

    console.log('✅ Seeding completed.');
    await AppDataSource.destroy();
}

seed().catch((e) => {
    console.error(e);
    process.exit(1);
});

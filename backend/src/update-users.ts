import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { User, Group, UserGroup, AudioTrack, Category, GroupAccess, AudioAccess, RefreshToken, UserProgress, AudioLog, AppConfig, Program, ProgramShare } from './entities';

dotenv.config();

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'root',
    database: process.env.DATABASE_NAME || 'careformance',
    entities: [
        User, Group, UserGroup, AudioTrack, Category, GroupAccess, AudioAccess,
        RefreshToken, UserProgress, AudioLog, AppConfig, Program, ProgramShare
    ],
});

async function run() {
    await AppDataSource.initialize();
    
    const userRepo = AppDataSource.getRepository(User);
    
    const teacher = await userRepo.findOne({ where: { email: 'teacher@careformance.com' } });
    
    if (teacher) {
        await userRepo.createQueryBuilder()
            .update(User)
            .set({ createdById: teacher.id })
            .where("role = :role", { role: 'ATHLETE' })
            .andWhere("createdById IS NULL")
            .execute();
            
        console.log(`Updated athletes to be owned by teacher ${teacher.id}`);
    } else {
        console.log('Teacher not found!');
    }
    
    await AppDataSource.destroy();
}

run().catch(console.error);

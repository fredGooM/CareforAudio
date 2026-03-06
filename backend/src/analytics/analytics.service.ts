import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, In } from 'typeorm';
import { AudioLog, UserProgress, AudioTrack, User, UserGroup, ProgramShare, ProgramAudio, ProgramUserProgress } from '../entities';

@Injectable()
export class AnalyticsService {
    constructor(
        @InjectRepository(AudioLog)
        private readonly logRepo: Repository<AudioLog>,
        @InjectRepository(UserProgress)
        private readonly progressRepo: Repository<UserProgress>,
        @InjectRepository(AudioTrack)
        private readonly audioRepo: Repository<AudioTrack>,
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        @InjectRepository(UserGroup)
        private readonly userGroupRepo: Repository<UserGroup>,
        @InjectRepository(ProgramShare)
        private readonly programShareRepo: Repository<ProgramShare>,
        @InjectRepository(ProgramAudio)
        private readonly programAudioRepo: Repository<ProgramAudio>,
        @InjectRepository(ProgramUserProgress)
        private readonly programProgressRepo: Repository<ProgramUserProgress>,
    ) { }

    async heartbeat(
        userId: string,
        data: {
            audioId: string;
            position: number;
            sessionDuration?: number;
            completed?: boolean;
            programId?: string;
        },
    ) {
        const audio = await this.audioRepo.findOne({
            where: { id: data.audioId },
        });
        if (!audio) return { error: 'Audio not found' };

        const existing = await this.progressRepo.findOne({
            where: { userId, audioId: data.audioId },
        });

        const audioDuration = audio.duration || 0;
        const completionThreshold =
            audioDuration > 0
                ? Math.max(audioDuration * 0.9, audioDuration - 0.5)
                : 0;
        const completedNow =
            data.completed ||
            (audioDuration > 0 && data.position >= completionThreshold);

        let timesListened = existing?.timesListened ?? 0;
        let isCompleted = existing?.isCompleted ?? false;

        // If the frontend explicitly passed completed: true, it means they hit the end of the track.
        // Increment timesListened each time the user finishes the track (including re-listens).
        if (completedNow) {
            if (!isCompleted || data.completed) {
                // First completion OR explicit re-completion from frontend
                timesListened += 1;
            }
            isCompleted = true;
        }

        if (existing) {
            existing.lastPosition = data.position;
            existing.isCompleted = isCompleted;
            existing.timesListened = timesListened;
            await this.progressRepo.save(existing);
        } else {
            await this.progressRepo.save({
                userId,
                audioId: data.audioId,
                lastPosition: data.position,
                isCompleted,
                timesListened,
            });
        }

        if (data.sessionDuration && data.sessionDuration > 0) {
            await this.logRepo.save({
                userId,
                audioId: data.audioId,
                duration: Math.round(data.sessionDuration),
            });
        }

        // Update per-program progress when a programId is provided
        if (completedNow && data.programId) {
            const prog = await this.programProgressRepo.findOne({
                where: { userId, audioId: data.audioId, programId: data.programId },
            });
            if (prog) {
                if (!prog.isCompleted || data.completed) prog.timesListened += 1;
                prog.isCompleted = true;
                await this.programProgressRepo.save(prog);
            } else {
                await this.programProgressRepo.save({
                    userId,
                    audioId: data.audioId,
                    programId: data.programId,
                    timesListened: 1,
                    isCompleted: true,
                });
            }
        }

        return { success: true };
    }

    async getTeacherOverview(teacherId: string) {
        const athletes = await this.userRepo.find({
            where: { createdById: teacherId, role: 'ATHLETE' as any },
            select: ['id', 'firstName', 'lastName'],
        });

        const athleteIds = athletes.map(a => a.id);
        const now = new Date();

        let dropoffs: { userId: string; name: string; daysSince: number | null }[] = [];
        if (athleteIds.length > 0) {
            const logs = await this.logRepo.find({
                where: { userId: In(athleteIds) },
                select: ['userId', 'createdAt'],
            });

            const lastLogByUser = new Map<string, Date>();
            logs.forEach(log => {
                const current = lastLogByUser.get(log.userId);
                if (!current || log.createdAt > current) lastLogByUser.set(log.userId, log.createdAt);
            });

            dropoffs = athletes
                .map(a => {
                    const lastDate = lastLogByUser.get(a.id);
                    const daysSince = lastDate
                        ? Math.floor((now.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000))
                        : null;
                    return { userId: a.id, name: `${a.firstName} ${a.lastName}`, daysSince };
                })
                .sort((a, b) => (b.daysSince ?? Infinity) - (a.daysSince ?? Infinity));
        }

        return {
            athletes: athletes.map(a => ({ id: a.id, name: `${a.firstName} ${a.lastName}` })),
            dropoffs,
        };
    }

    async getEngagement(targetUserId: string, currentUser: any) {
        if (currentUser.role === 'TEACHER') {
            const target = await this.userRepo.findOne({ where: { id: targetUserId } });
            if (!target || target.createdById !== currentUser.id) throw new ForbiddenException();
        }

        const thirtyDaysAgo = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
        const logs = await this.logRepo.find({
            where: { userId: targetUserId, createdAt: MoreThanOrEqual(thirtyDaysAgo) },
        });

        const trendMap = new Map<string, number>();
        for (let i = 0; i < 30; i++) {
            const date = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
            trendMap.set(date.toISOString().slice(0, 10), 0);
        }
        logs.forEach(log => {
            const key = log.createdAt.toISOString().slice(0, 10);
            trendMap.set(key, (trendMap.get(key) || 0) + Math.round(log.duration / 60));
        });

        return Array.from(trendMap.entries()).map(([key, minutes]) => ({
            date: new Date(key).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
            minutes,
        }));
    }

    async getDashboard(role: string, userId: string, filterUserId?: string) {
        if (role === 'ADMIN') {
            return this.buildAdminDashboard(filterUserId || null);
        }
        return this.buildUserDashboard(userId);
    }

    private async buildAdminDashboard(filterUserId: string | null) {
        const now = new Date();
        const thirtyDaysAgo = new Date(
            now.getTime() - 29 * 24 * 60 * 60 * 1000,
        );
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Total listening hours
        const logWhere = filterUserId ? { userId: filterUserId } : {};
        const allLogs = await this.logRepo.find({ where: logWhere });
        const totalSeconds = allLogs.reduce((sum, l) => sum + l.duration, 0);
        const totalHours = parseFloat((totalSeconds / 3600).toFixed(1));

        // Completion rate
        const progressWhere = filterUserId
            ? { userId: filterUserId }
            : undefined;
        const totalProgress = await this.progressRepo.count({
            where: progressWhere,
        });
        const completedProgress = await this.progressRepo.count({
            where: { ...progressWhere, isCompleted: true },
        });
        const completionRate =
            totalProgress > 0
                ? Math.round((completedProgress / totalProgress) * 100)
                : 0;

        // Active athletes
        let activeAthletes: number | null = null;
        if (!filterUserId) {
            const recentLogs = await this.logRepo.find({
                where: { createdAt: MoreThanOrEqual(sevenDaysAgo) },
            });
            const map = new Map<string, number>();
            recentLogs.forEach((log) => {
                map.set(log.userId, (map.get(log.userId) || 0) + log.duration);
            });
            activeAthletes = Array.from(map.values()).filter(
                (seconds) => seconds >= 600,
            ).length;
        }

        // Engagement trend
        const trendLogs = await this.logRepo.find({
            where: {
                ...(filterUserId ? { userId: filterUserId } : {}),
                createdAt: MoreThanOrEqual(thirtyDaysAgo),
            },
        });
        const trendMap = new Map<string, number>();
        for (let i = 0; i < 30; i++) {
            const date = new Date(
                thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000,
            );
            trendMap.set(date.toISOString().slice(0, 10), 0);
        }
        trendLogs.forEach((log) => {
            const key = log.createdAt.toISOString().slice(0, 10);
            trendMap.set(key, (trendMap.get(key) || 0) + Math.round(log.duration / 60));
        });
        const engagementTrend = Array.from(trendMap.entries()).map(
            ([key, minutes]) => ({
                date: new Date(key).toLocaleDateString('fr-FR', {
                    month: 'short',
                    day: 'numeric',
                }),
                minutes,
            }),
        );

        // Popular audios (top 5 by duration)
        const audioLogSums = new Map<string, number>();
        allLogs.forEach((log) => {
            audioLogSums.set(
                log.audioId,
                (audioLogSums.get(log.audioId) || 0) + log.duration,
            );
        });
        const sorted = Array.from(audioLogSums.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        const audioIds = sorted.map(([id]) => id);
        const audioMap =
            audioIds.length > 0
                ? await this.audioRepo.find({
                    where: { id: In(audioIds) },
                    select: ['id', 'title'],
                })
                : [];
        const titleMap = new Map(audioMap.map((a) => [a.id, a.title]));

        const popularAudios = sorted.map(([audioId, totalDur]) => ({
            audioId,
            title: titleMap.get(audioId) || 'Audio',
            minutes: Math.round(totalDur / 60),
            completionRate: 0,
        }));

        // Athletes list
        const athletes = await this.userRepo.find({
            where: { role: 'ATHLETE' as any },
            select: ['id', 'firstName', 'lastName'],
        });

        // Dropoffs
        const lastLogByUser = new Map<string, Date>();
        allLogs.forEach((log) => {
            const current = lastLogByUser.get(log.userId);
            if (!current || log.createdAt > current) {
                lastLogByUser.set(log.userId, log.createdAt);
            }
        });
        const dropoffs = athletes
            .map((a) => {
                const lastDate = lastLogByUser.get(a.id);
                const daysSince = lastDate
                    ? Math.floor(
                        (now.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000),
                    )
                    : Infinity;
                return {
                    userId: a.id,
                    name: `${a.firstName} ${a.lastName}`,
                    daysSince,
                };
            })
            .filter((item) => item.daysSince > 7)
            .sort((a, b) => b.daysSince - a.daysSince)
            .slice(0, 5);

        return {
            role: 'ADMIN',
            totalListeningHours: totalHours,
            completionRate,
            activeAthletes,
            engagementTrend,
            popularAudios,
            dropoffs,
            athletes: athletes.map((a) => ({
                id: a.id,
                name: `${a.firstName} ${a.lastName}`,
            })),
            filterUserId,
        };
    }

    private async buildUserDashboard(userId: string) {
        const allLogs = await this.logRepo.find({ where: { userId } });
        const totalMinutes = Math.round(
            allLogs.reduce((sum, l) => sum + l.duration, 0) / 60,
        );

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const weeklyLogs = allLogs.filter((l) => l.createdAt >= sevenDaysAgo);
        const last7DaysMinutes = Math.round(
            weeklyLogs.reduce((sum, l) => sum + l.duration, 0) / 60,
        );

        const progressRecords = await this.progressRepo.find({
            where: { userId },
            relations: ['audio'],
        });
        const completedCount = progressRecords.filter((r) => r.isCompleted).length;

        // Average completion rate across assigned programs
        const shares = await this.programShareRepo.find({ where: { userId }, select: ['programId'] });
        let completionPercent = 0;
        if (shares.length > 0) {
            const programIds = shares.map(s => s.programId);
            const programAudios = await this.programAudioRepo.find({
                where: { programId: In(programIds) },
                select: ['programId', 'audioId', 'requiredListens'],
            });
            const listenMap = new Map(progressRecords.map(r => [r.audioId, r.timesListened || 0]));

            const programTotals = new Map<string, { required: number; done: number }>();
            for (const pa of programAudios) {
                const entry = programTotals.get(pa.programId) ?? { required: 0, done: 0 };
                entry.required += pa.requiredListens;
                entry.done += Math.min(listenMap.get(pa.audioId) ?? 0, pa.requiredListens);
                programTotals.set(pa.programId, entry);
            }

            const perProgramPercents = programIds.map(id => {
                const t = programTotals.get(id);
                return t && t.required > 0 ? (t.done / t.required) * 100 : 0;
            });
            completionPercent = Math.round(
                perProgramPercents.reduce((sum, p) => sum + p, 0) / perProgramPercents.length,
            );
        }

        const categoryProgress: { categoryId: string; percent: number }[] = [];

        // My program progress
        const myProgramTotal = await this.progressRepo.count({
            where: { userId, isMyProgram: true },
        });
        const myProgramCompleted = await this.progressRepo.count({
            where: { userId, isMyProgram: true, isCompleted: true },
        });
        const myProgramPercent =
            myProgramTotal > 0
                ? Math.round((myProgramCompleted / myProgramTotal) * 100)
                : 0;

        // Streak
        const daySet = new Set(
            allLogs.map((log) => log.createdAt.toISOString().slice(0, 10)),
        );
        let streak = 0;
        const today = new Date();
        for (let i = 0; i < 365; i++) {
            const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
            const key = date.toISOString().slice(0, 10);
            if (daySet.has(key)) {
                streak += 1;
            } else if (i > 0) {
                break;
            } else {
                break;
            }
        }

        // Continue listening
        const continueListening = progressRecords
            .filter((r) => !r.isCompleted && r.lastPosition > 0)
            .sort(
                (a, b) =>
                    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
            )
            .slice(0, 3)
            .map((r) => {
                const dur = r.audio?.duration || 1;
                return {
                    audioId: r.audioId,
                    title: r.audio?.title || 'Audio',
                    progressPercent: Math.min(
                        100,
                        Math.round((r.lastPosition / dur) * 100),
                    ),
                };
            });

        return {
            role: 'ATHLETE',
            totalMinutes,
            last7DaysMinutes,
            completionPercent,
            streakDays: streak,
            completedCount,
            categoryProgress,
            myProgramProgress: {
                percent: myProgramPercent,
                total: myProgramTotal,
                completed: myProgramCompleted,
            },
            continueListening,
        };
    }
}

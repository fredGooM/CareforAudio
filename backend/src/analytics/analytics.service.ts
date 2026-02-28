import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, In } from 'typeorm';
import { AudioLog, UserProgress, AudioTrack, User, UserGroup } from '../entities';

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
    ) { }

    async heartbeat(
        userId: string,
        data: {
            audioId: string;
            position: number;
            sessionDuration?: number;
            completed?: boolean;
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

        return { success: true };
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
            relations: ['audio', 'audio.categories'],
        });
        const completedCount = progressRecords.filter((r) => r.isCompleted).length;
        const completionPercent =
            progressRecords.length > 0
                ? Math.round((completedCount / progressRecords.length) * 100)
                : 0;

        // Category progress
        const categoryMap = new Map<
            string,
            { total: number; completed: number }
        >();
        progressRecords.forEach((record) => {
            const categories = record.audio?.categories || [];
            if (categories.length === 0) {
                const catId = 'autre';
                const cur = categoryMap.get(catId) || { total: 0, completed: 0 };
                cur.total += 1;
                if (record.isCompleted) cur.completed += 1;
                categoryMap.set(catId, cur);
            } else {
                categories.forEach((cat: any) => {
                    const catId = cat.id;
                    const cur = categoryMap.get(catId) || { total: 0, completed: 0 };
                    // Avoid double counting total listenings per category for the same record?
                    // actually if it's counting per category, it's fine.
                    cur.total += 1;
                    if (record.isCompleted) cur.completed += 1;
                    categoryMap.set(catId, cur);
                });
            }
        });
        const categoryProgress = Array.from(categoryMap.entries()).map(
            ([categoryId, stats]) => ({
                categoryId,
                percent:
                    stats.total > 0
                        ? Math.round((stats.completed / stats.total) * 100)
                        : 0,
            }),
        );

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

import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, In } from 'typeorm';
import { AudioLog, UserProgress, AudioTrack, User, ProgramShare, ProgramAudio, AudioListenRecord, Program } from '../entities';

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
        @InjectRepository(ProgramShare)
        private readonly programShareRepo: Repository<ProgramShare>,
        @InjectRepository(ProgramAudio)
        private readonly programAudioRepo: Repository<ProgramAudio>,
        @InjectRepository(AudioListenRecord)
        private readonly listenRecordRepo: Repository<AudioListenRecord>,
        @InjectRepository(Program)
        private readonly programRepo: Repository<Program>,
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

        // Insert a new listen record per completion (programId optional)
        if (completedNow) {
            await this.listenRecordRepo.save({
                userId,
                audioId: data.audioId,
                programId: data.programId ?? null,
            });
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
            const listenRecords = await this.listenRecordRepo.find({
                where: { userId: In(athleteIds) },
                select: ['userId', 'listenedAt'],
            });

            const lastActivityByUser = new Map<string, Date>();
            listenRecords.forEach(r => {
                const current = lastActivityByUser.get(r.userId);
                if (!current || r.listenedAt > current) lastActivityByUser.set(r.userId, r.listenedAt);
            });

            dropoffs = athletes
                .map(a => {
                    const lastDate = lastActivityByUser.get(a.id);
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

        // Accumulate in seconds to avoid losing short audios when rounding to minutes
        const trendMap = new Map<string, number>();
        for (let i = 0; i < 30; i++) {
            const date = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
            trendMap.set(date.toISOString().slice(0, 10), 0);
        }

        const listenRecords = await this.listenRecordRepo.find({
            where: { userId: targetUserId, listenedAt: MoreThanOrEqual(thirtyDaysAgo) },
        });

        if (listenRecords.length > 0) {
            const audioIds = [...new Set(listenRecords.map(r => r.audioId))];
            const audios = await this.audioRepo.find({ where: { id: In(audioIds) }, select: ['id', 'duration'] });
            const durationMap = new Map(audios.map(a => [a.id, a.duration || 0]));

            listenRecords.forEach(r => {
                const key = r.listenedAt.toISOString().slice(0, 10);
                if (trendMap.has(key)) {
                    trendMap.set(key, (trendMap.get(key) || 0) + (durationMap.get(r.audioId) || 0));
                }
            });
        }

        return Array.from(trendMap.entries()).map(([key, seconds]) => ({
            date: new Date(key).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
            minutes: parseFloat((seconds / 60).toFixed(2)),
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

        // Average completion rate across assigned programs (using AudioListenRecord + recurrenceDays)
        const shares = await this.programShareRepo.find({ where: { userId }, select: ['programId'] });
        let completionPercent = 0;
        if (shares.length > 0) {
            const programIds = shares.map(s => s.programId);
            const programs = await this.programRepo.find({
                where: { id: In(programIds) },
                relations: ['programAudios'],
            });

            const perProgramPercents = await Promise.all(programs.map(async prog => {
                const since = prog.recurrenceDays
                    ? new Date(Date.now() - prog.recurrenceDays * 24 * 60 * 60 * 1000)
                    : null;
                const records = await this.listenRecordRepo.find({
                    where: {
                        userId,
                        programId: prog.id,
                        ...(since ? { listenedAt: MoreThanOrEqual(since) } : {}),
                    },
                    select: ['audioId'],
                });
                const listenMap = new Map<string, number>();
                records.forEach(r => listenMap.set(r.audioId, (listenMap.get(r.audioId) || 0) + 1));

                let required = 0, done = 0;
                for (const pa of (prog.programAudios || [])) {
                    required += pa.requiredListens;
                    done += Math.min(listenMap.get(pa.audioId) ?? 0, pa.requiredListens);
                }
                return required > 0 ? (done / required) * 100 : 0;
            }));

            completionPercent = Math.round(
                perProgramPercents.reduce((sum, p) => sum + p, 0) / perProgramPercents.length,
            );
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
            completedCount,
            continueListening,
            lastListenedAt: await this.listenRecordRepo
                .findOne({ where: { userId }, order: { listenedAt: 'DESC' }, select: ['listenedAt'] })
                .then(r => r?.listenedAt?.toISOString() ?? null),
        };
    }
}

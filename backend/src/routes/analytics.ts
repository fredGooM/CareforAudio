import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
// @ts-ignore
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

router.post('/heartbeat', authenticateToken, async (req: any, res: any) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    const { audioId, position, sessionDuration } = req.body || {};

    if (!userId || !audioId || typeof position !== 'number') {
      res.status(400).json({ error: 'Invalid payload' });
      return;
    }

    const audio = await prisma.audioTrack.findUnique({ where: { id: audioId } });
    if (!audio) {
      res.status(404).json({ error: 'Audio not found' });
      return;
    }

    const progressKey = { userId_audioId: { userId, audioId } };
    const existingProgress = await prisma.userProgress.findUnique({ where: progressKey });

    const audioDuration = audio.duration || 0;
    const completedNow = audioDuration > 0 && position >= audioDuration * 0.9;
    let timesListened = existingProgress?.timesListened ?? 0;
    let isCompleted = existingProgress?.isCompleted ?? false;

    if (completedNow && !isCompleted) {
      isCompleted = true;
      timesListened += 1;
    }

    if (existingProgress) {
      await prisma.userProgress.update({
        where: progressKey,
        data: {
          lastPosition: position,
          isCompleted,
          timesListened
        }
      });
    } else {
      await prisma.userProgress.create({
        data: {
          userId,
          audioId,
          lastPosition: position,
          isCompleted,
          timesListened
        }
      });
    }

    if (sessionDuration && sessionDuration > 0) {
      await prisma.audioLog.create({
        data: {
          userId,
          audioId,
          duration: Math.round(sessionDuration)
        }
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Heartbeat failed' });
  }
});

router.get('/dashboard', authenticateToken, async (req: any, res: any) => {
  try {
    const authReq = req as AuthRequest;
    const role = authReq.user?.role;
    const requesterId = authReq.user?.id;

    if (role === 'ADMIN') {
      const filterUserId = typeof req.query.userId === 'string' && req.query.userId.length > 0 ? req.query.userId : null;
      const response = await buildAdminDashboard(filterUserId);
      res.json(response);
      return;
    }

    if (!requesterId) {
      res.status(401).json({ error: 'Utilisateur non authentifié' });
      return;
    }

    const response = await buildUserDashboard(requesterId);
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Dashboard unavailable' });
  }
});

async function buildAdminDashboard(filterUserId: string | null) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const logWhere = filterUserId ? { userId: filterUserId } : {};

  const totalDurationAgg = await prisma.audioLog.aggregate({
    where: Object.keys(logWhere).length ? logWhere : undefined,
    _sum: { duration: true }
  });
  const totalHours = ((totalDurationAgg._sum.duration || 0) / 3600).toFixed(1);

  const progressWhere = filterUserId ? { userId: filterUserId } : undefined;
  const totalProgress = await prisma.userProgress.count({ where: progressWhere });
  const completedProgress = await prisma.userProgress.count({ where: { ...progressWhere, isCompleted: true } });
  const completionRate = totalProgress > 0 ? Math.round((completedProgress / totalProgress) * 100) : 0;

  let activeAthletes: number | null = null;
  if (!filterUserId) {
    const recentLogs = await prisma.audioLog.findMany({ where: { createdAt: { gte: sevenDaysAgo } } });
    const map = new Map<string, number>();
    recentLogs.forEach((log) => {
      map.set(log.userId, (map.get(log.userId) || 0) + log.duration);
    });
    activeAthletes = Array.from(map.values()).filter((seconds) => seconds >= 600).length;
  }

  const trendLogs = await prisma.audioLog.findMany({
    where: {
      ...(logWhere || {}),
      createdAt: { gte: thirtyDaysAgo }
    }
  });
  const trendMap = new Map<string, number>();
  const fillDates: { date: string; minutes: number }[] = [];
  for (let i = 0; i < 30; i++) {
    const date = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
    const key = date.toISOString().slice(0, 10);
    trendMap.set(key, 0);
  }
  trendLogs.forEach((log) => {
    const key = log.createdAt.toISOString().slice(0, 10);
    const current = trendMap.get(key) || 0;
    trendMap.set(key, current + Math.round(log.duration / 60));
  });
  trendMap.forEach((minutes, key) => {
    const dateObj = new Date(key);
    fillDates.push({ date: dateObj.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }), minutes });
  });
  const engagementTrend = fillDates;

  const popularGroup = await prisma.audioLog.groupBy({
    by: ['audioId'],
    _sum: { duration: true },
    where: logWhere && Object.keys(logWhere).length ? logWhere : undefined,
    orderBy: { _sum: { duration: 'desc' } },
    take: 5
  });
  const audioIds = popularGroup.map((g) => g.audioId);
  const audioMap = audioIds.length
    ? await prisma.audioTrack.findMany({ where: { id: { in: audioIds } }, select: { id: true, title: true } })
    : [];
  const titleMap = new Map(audioMap.map((a) => [a.id, a.title]));

  const completionTotals = audioIds.length
    ? await prisma.userProgress.groupBy({
        by: ['audioId'],
        _count: { _all: true },
        where: { audioId: { in: audioIds } }
      })
    : [];
  const completionCompleted = audioIds.length
    ? await prisma.userProgress.groupBy({
        by: ['audioId'],
        _count: { _all: true },
        where: { audioId: { in: audioIds }, isCompleted: true }
      })
    : [];
  const totalMap = new Map(completionTotals.map((c) => [c.audioId, c._count._all]));
  const completedMap = new Map(completionCompleted.map((c) => [c.audioId, c._count._all]));
  const popularAudios = popularGroup.map((group) => {
    const total = totalMap.get(group.audioId) || 0;
    const completed = completedMap.get(group.audioId) || 0;
    const avgCompletion = total > 0 ? Math.round((completed / total) * 100) : 0;
    return {
      audioId: group.audioId,
      title: titleMap.get(group.audioId) || 'Podcast',
      minutes: Math.round((group._sum.duration || 0) / 60),
      completionRate: avgCompletion
    };
  });

  const athletes = await prisma.user.findMany({
    where: { role: 'USER' },
    select: { id: true, firstName: true, lastName: true }
  });

  const lastLogGroup = await prisma.audioLog.groupBy({
    by: ['userId'],
    _max: { createdAt: true }
  });
  const lastLogMap = new Map(lastLogGroup.map((g) => [g.userId, g._max.createdAt]));
  const dropoffs = athletes
    .map((athlete) => {
      const lastDate = lastLogMap.get(athlete.id);
      const daysSince = lastDate ? Math.floor((now.getTime() - new Date(lastDate).getTime()) / (24 * 60 * 60 * 1000)) : Infinity;
      return {
        userId: athlete.id,
        name: `${athlete.firstName} ${athlete.lastName}`,
        daysSince
      };
    })
    .filter((item) => item.daysSince > 7)
    .sort((a, b) => b.daysSince - a.daysSince)
    .slice(0, 5);

  return {
    role: 'ADMIN',
    totalListeningHours: parseFloat(totalHours),
    completionRate,
    activeAthletes,
    engagementTrend,
    popularAudios,
    dropoffs,
    athletes: athletes.map((athlete) => ({ id: athlete.id, name: `${athlete.firstName} ${athlete.lastName}` })),
    filterUserId
  };
}

async function buildUserDashboard(userId: string) {
  const totalDurationAgg = await prisma.audioLog.aggregate({
    where: { userId },
    _sum: { duration: true }
  });
  const totalMinutes = Math.round((totalDurationAgg._sum.duration || 0) / 60);

  const progressRecords = await prisma.userProgress.findMany({
    where: { userId },
    include: { audio: true }
  });
  const completedCount = progressRecords.filter((r) => r.isCompleted).length;
  const completionPercent = progressRecords.length > 0 ? Math.round((completedCount / progressRecords.length) * 100) : 0;

  const categoryMap = new Map<string, { total: number; completed: number }>();
  progressRecords.forEach((record) => {
    const categoryId = record.audio?.categoryId || 'autre';
    const current = categoryMap.get(categoryId) || { total: 0, completed: 0 };
    current.total += 1;
    if (record.isCompleted) current.completed += 1;
    categoryMap.set(categoryId, current);
  });
  const categoryProgress = Array.from(categoryMap.entries()).map(([categoryId, stats]) => ({
    categoryId,
    percent: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
  }));

  const logs = await prisma.audioLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  const daySet = new Set(logs.map((log) => log.createdAt.toISOString().slice(0, 10)));
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

  const continueListening = progressRecords
    .filter((record) => !record.isCompleted && record.lastPosition > 0)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3)
    .map((record) => {
      const duration = record.audio?.duration || 1;
      return {
        audioId: record.audioId,
        title: record.audio?.title || 'Audio',
        progressPercent: Math.min(100, Math.round((record.lastPosition / duration) * 100))
      };
    });

  return {
    role: 'USER',
    totalMinutes,
    completionPercent,
    streakDays: streak,
    completedCount,
    categoryProgress,
    continueListening
  };
}

export default router;

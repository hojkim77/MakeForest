import { Router, Request, Response } from 'express';
import { prisma } from '@makeforest/db';
import type { FocusSession } from '@makeforest/db';
import { redis, RedisKeys, SESSION_TTL_SECONDS, setSession, getSession, addActiveDong, getDongActiveCount, addDailyOverlaySession } from '@makeforest/redis';
import { broadcastHeatmap, broadcastToRegion, broadcastUsersOverlay, broadcastToUser } from './sse';
import { getKstDateString } from './water.logic';
import { regionOf, CreateSessionBody, UpdateTodosBody, UpdateSessionBody, GetSessionQuery } from '@makeforest/types';
import { incrementCollection } from './collection';
import { getDongCoords, getDongFullName, getDongShortName } from '../dongCache';
import { buildTodayState } from './sessions.logic';

export const sessionsRouter = Router();

interface SyncParams {
  session: FocusSession;
  userId: string;
  dongCode: string;
  todos: unknown[];
  isNewSession: boolean;
  today: string;
}

async function syncAndBroadcast({ session, userId, dongCode, todos, isNewSession, today }: SyncParams) {
  try {
    const cached = await getSession(session.id);
    if (cached) {
      await setSession(session.id, {
        ...cached,
        startedAt: session.startedAt.toISOString(),
        status: 'RUNNING',
        focusLengthMin: session.focusLengthMin ?? 30,
        segmentCount: session.segmentCount ?? 12,
        todayGoal: session.todayGoal ?? null,
      });
    } else {
      const [user, dongCoords, creature] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { nickname: true, todosPublic: true },
        }),
        getDongCoords(dongCode),
        prisma.userCreature.findUnique({
          where: { userId },
          select: { totalWaterCount: true, totalFocusMinutes: true, stage: true },
        }),
      ]);
      const { toPixel } = await import('./map');
      const { pixelX, pixelY } = dongCoords ? toPixel(dongCoords.lat, dongCoords.lng) : { pixelX: 0, pixelY: 0 };

      await setSession(session.id, {
        userId,
        dongCode,
        startedAt: session.startedAt.toISOString(),
        todos: todos as never,
        status: 'RUNNING',
        nickname: user?.nickname ?? '누군가',
        pixelX,
        pixelY,
        totalWaterCount: creature?.totalWaterCount ?? 0,
        totalFocusMinutes: creature?.totalFocusMinutes ?? 0,
        todayWaterCount: session.waterCount ?? 0,
        creatureStage: creature?.stage ?? 0,
        todosPublic: user?.todosPublic ?? true,
        focusLengthMin: session.focusLengthMin ?? 30,
        segmentCount: session.segmentCount ?? 12,
        todayGoal: session.todayGoal ?? null,
      });
    }

    await redis.set(RedisKeys.userSession(userId), session.id, 'EX', SESSION_TTL_SECONDS);
    await addActiveDong(dongCode, session.id);
    await addDailyOverlaySession(today, session.id);

    const activeCount = await getDongActiveCount(dongCode);
    await redis.hset(RedisKeys.heatmapDong(), { [dongCode]: activeCount });
    const heatmapRaw = await redis.hgetall(RedisKeys.heatmapDong()) ?? {};
    const activity: Record<string, number> = {};
    for (const [code, cnt] of Object.entries(heatmapRaw)) activity[code] = Number(cnt);
    broadcastHeatmap(activity);
    broadcastUsersOverlay();

    void (async () => {
      try {
        const friendships = await prisma.friendship.findMany({
          where: { status: 'ACCEPTED', OR: [{ requesterId: userId }, { addresseeId: userId }] },
          select: { requesterId: true, addresseeId: true },
        });
        const friendIds = friendships.map((f) =>
          f.requesterId === userId ? f.addresseeId : f.requesterId,
        );
        friendIds.forEach((fid) =>
          broadcastToUser(fid, { type: 'friend:status:changed', data: { userId, status: 'RUNNING' } }),
        );
      } catch (err) {
        console.error('[sessions] friend status broadcast error:', err);
      }
    })();

    if (isNewSession) {
      const [dongFullName, cachedSession] = await Promise.all([
        getDongFullName(dongCode),
        getSession(session.id),
      ]);
      const regionCode = dongFullName ? regionOf(dongCode, dongFullName) : dongCode.substring(0, 5);
      const nickname = cachedSession?.nickname ?? '누군가';
      const dongName = await getDongShortName(dongCode);
      const [collectionProgress] = await Promise.all([
        incrementCollection(regionCode, today),
        prisma.communityPost.create({ data: { userId, sessionId: session.id, date: today, dongName, regionCode, goal: session.todayGoal ?? null } }),
      ]);
      broadcastToRegion(regionCode, {
        type: 'session:toast',
        data: { dongCode, nickname, collectionProgress },
      });
    }
  } catch (err) {
    console.error('[sessions] Redis/SSE sync error:', err);
  }
}

// GET /sessions/today — 오늘 세션 전체 상태 조회 (stage machine 기반)
sessionsRouter.get('/today', async (req: Request, res: Response) => {
  try {
    const { userId } = GetSessionQuery.parse(req.query);
    const today = getKstDateString();

    const [session, user] = await Promise.all([
      prisma.focusSession.findUnique({
        where: { userId_date: { userId, date: today } },
        select: {
          id: true,
          startedAt: true,
          status: true,
          todayGoal: true,
          focusLengthMin: true,
          segmentCount: true,
          waterCount: true,
        },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { lastFocusLengthMin: true, lastSegmentCount: true },
      }),
    ]);

    if (!user) return res.status(404).json({ error: 'User not found' });

    return res.json(buildTodayState(session, user));
  } catch (err) {
    console.error('[sessions] GET /today error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /sessions — 세션 시작 또는 재개 (하루 1개 upsert)
sessionsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { dongCode, todos, userId, todayGoal: rawGoal, focusLengthMin: rawFLen, segmentCount: rawSegs } = CreateSessionBody.parse(req.body);

    const today = getKstDateString();

    // Lock + validate + upsert in transaction
    const session = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{
        id: string;
        status: string;
        createdAt: Date;
        startedAt: Date;
        waterCount: number;
        totalElapsedSec: number;
      }>>`
        SELECT id, status, "createdAt", "startedAt", "waterCount", "totalElapsedSec"
        FROM "FocusSession"
        WHERE "userId" = ${userId} AND "date" = ${today}
        FOR UPDATE
      `;
      const existing = rows[0] ?? null;

      // If a session is already running/paused/completed/abandoned, reject
      if (existing && existing.status !== 'IDLE') {
        throw Object.assign(new Error('session already started'), { code: 'SESSION_ALREADY_STARTED' });
      }

      // Validate goal
      const trimmedGoal = rawGoal.trim();
      if (trimmedGoal.length === 0) {
        throw Object.assign(new Error('goal required'), { code: 'GOAL_REQUIRED' });
      }
      if (trimmedGoal.length > 50) {
        throw Object.assign(new Error('goal too long'), { code: 'GOAL_TOO_LONG' });
      }

      // Validate timer config
      if (rawFLen < 5 || rawFLen > 120 || rawFLen % 5 !== 0) {
        throw Object.assign(new Error('invalid focus length'), { code: 'INVALID_FOCUS_LENGTH' });
      }
      if (rawSegs < 1) {
        throw Object.assign(new Error('invalid segment count'), { code: 'INVALID_SEGMENT_COUNT' });
      }
      if (rawFLen * rawSegs > 1440) {
        throw Object.assign(new Error('daily cap exceeded'), { code: 'DAILY_CAP_EXCEEDED' });
      }

      const now = new Date();

      await tx.focusSession.upsert({
        where: { userId_date: { userId, date: today } },
        update: {
          todayGoal: trimmedGoal,
          focusLengthMin: rawFLen,
          segmentCount: rawSegs,
          startedAt: now,
          status: 'RUNNING',
          dongCode,
          todos: todos as unknown as never,
        },
        create: {
          userId,
          date: today,
          dongCode,
          todayGoal: trimmedGoal,
          focusLengthMin: rawFLen,
          segmentCount: rawSegs,
          startedAt: now,
          status: 'RUNNING',
          todos: todos as unknown as never,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { lastFocusLengthMin: rawFLen, lastSegmentCount: rawSegs },
      });

      const updated = await tx.focusSession.findUniqueOrThrow({
        where: { userId_date: { userId, date: today } },
      });
      return { session: updated, isFirstRunning: !existing };
    });

    const isNewSession =
      Math.abs(session.session.createdAt.getTime() - session.session.startedAt.getTime()) < 2000;

    const result = {
      sessionId: session.session.id,
      startedAt: session.session.startedAt,
      isNewSession,
      focusLengthMin: session.session.focusLengthMin!,
      segmentCount: session.session.segmentCount!,
      todayGoal: session.session.todayGoal!,
    };

    // Redis 캐싱 + SSE 브로드캐스트
    void syncAndBroadcast({ session: session.session, userId, dongCode, todos, isNewSession, today });

    return res.json(result);
  } catch (err) {
    if (err instanceof Error) {
      const code = (err as Error & { code?: string }).code;
      if (code === 'SESSION_ALREADY_STARTED') {
        return res.status(409).json({ error: '이미 시작된 세션이 있습니다.', code: 'SESSION_ALREADY_STARTED' });
      }
      if (code === 'GOAL_REQUIRED') {
        return res.status(400).json({ error: '오늘의 목표를 먼저 입력해주세요.', code: 'GOAL_REQUIRED' });
      }
      if (code === 'GOAL_TOO_LONG') {
        return res.status(400).json({ error: '목표는 50자 이내로 입력해주세요.', code: 'GOAL_TOO_LONG' });
      }
      if (code === 'INVALID_FOCUS_LENGTH') {
        return res.status(400).json({ error: '집중 시간은 5~120분, 5분 단위여야 합니다.', code: 'INVALID_FOCUS_LENGTH' });
      }
      if (code === 'INVALID_SEGMENT_COUNT') {
        return res.status(400).json({ error: '반복 횟수는 1 이상이어야 합니다.', code: 'INVALID_SEGMENT_COUNT' });
      }
      if (code === 'DAILY_CAP_EXCEEDED') {
        return res.status(400).json({ error: '총 시간은 하루 24시간을 넘을 수 없어요.', code: 'DAILY_CAP_EXCEEDED' });
      }
    }
    console.error('[sessions] POST error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /sessions/:id/todos — 할일 목록 업데이트
sessionsRouter.patch('/:id/todos', async (req: Request, res: Response) => {
  try {
    const id = String(req.params['id']);
    const { todos } = UpdateTodosBody.parse(req.body);

    await prisma.focusSession.update({
      where: { id },
      data: { todos: todos as unknown as never },
    });

    // Redis 캐시 갱신
    const cached = await getSession(id);
    if (cached) {
      await setSession(id, { ...cached, todos: todos as never });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('[sessions] PATCH /todos error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /sessions/:id
sessionsRouter.get('/:id', async (req: Request, res: Response) => {
  const id = String(req.params['id']);
  const session = await prisma.focusSession.findUnique({ where: { id } });
  if (!session) return res.status(404).json({ error: 'Not found' });
  return res.json(session);
});

// PATCH /sessions/:id — complete(사이클 완료) | abandon(강제 종료)
sessionsRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { action } = UpdateSessionBody.parse(req.body);
    const id = String(req.params['id']);

    const newStatus = action === 'complete' ? 'COMPLETED' : 'ABANDONED';

    const session = await prisma.focusSession.update({
      where: { id },
      data: { status: newStatus },
    });

    // Redis cache status 업데이트 + SSE 브로드캐스트
    void (async () => {
      try {
        const cached = await getSession(id);
        if (cached) {
          if (action === 'complete') {
            await setSession(id, { ...cached, status: 'COMPLETED' });
          } else {
            await setSession(id, { ...cached, status: 'ABANDONED' });
          }
          await redis.del(RedisKeys.userSession(session.userId));
        }
        broadcastUsersOverlay();

        void (async () => {
          try {
            const friendships = await prisma.friendship.findMany({
              where: { status: 'ACCEPTED', OR: [{ requesterId: session.userId }, { addresseeId: session.userId }] },
              select: { requesterId: true, addresseeId: true },
            });
            const friendIds = friendships.map((f) =>
              f.requesterId === session.userId ? f.addresseeId : f.requesterId,
            );
            friendIds.forEach((fid) =>
              broadcastToUser(fid, { type: 'friend:status:changed', data: { userId: session.userId, status: 'IDLE' } }),
            );
          } catch (err) {
            console.error('[sessions] friend status broadcast error:', err);
          }
        })();
      } catch (err) {
        console.error('[sessions] Redis/SSE sync error:', err);
      }
    })();

    return res.json(session);
  } catch (err) {
    console.error('[sessions] PATCH error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

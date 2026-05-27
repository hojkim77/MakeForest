import { Router, Request, Response } from 'express';
import { prisma } from '@makeforest/db';
import { redis, RedisKeys } from '@makeforest/redis';
import {
  FriendSearchQuery,
  CreateFriendRequestBody,
  RespondFriendRequestBody,
} from '@makeforest/types';
import { getKstDateString } from './water.logic';
import { determineFriendStatus } from './friends.logic';
import { broadcastToUser } from './sse';
import { getDongShortName } from '../dongCache';

const COOLDOWN_MS = parseInt(process.env['POKE_COOLDOWN_SECONDS'] ?? '1800') * 1000;

export const friendsRouter = Router();

// GET /friends/search?nickname=
friendsRouter.get('/search', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query as { userId?: string };
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { nickname } = FriendSearchQuery.parse(req.query);

    const found = await prisma.user.findMany({
      where: { nickname },
      select: { id: true, nickname: true, dongCode: true, userCreatures: { select: { stage: true } } },
    });

    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { requesterId: userId },
          { addresseeId: userId },
        ],
        AND: [
          {
            OR: [
              { addresseeId: { in: found.map((u) => u.id) } },
              { requesterId: { in: found.map((u) => u.id) } },
            ],
          },
        ],
      },
    });

    const results = await Promise.all(
      found.map(async (u) => {
        const dongName = u.dongCode ? await getDongShortName(u.dongCode) : null;
        const creatureStage = u.userCreatures[0]?.stage ?? 0;

        if (u.id === userId) {
          return { userId: u.id, nickname: u.nickname, dongName, creatureStage, relation: 'SELF' as const };
        }

        const fs = friendships.find(
          (f) =>
            (f.requesterId === userId && f.addresseeId === u.id) ||
            (f.addresseeId === userId && f.requesterId === u.id),
        );

        let relation: 'NONE' | 'PENDING_OUTGOING' | 'PENDING_INCOMING' | 'FRIENDS' = 'NONE';
        if (fs) {
          if (fs.status === 'ACCEPTED') {
            relation = 'FRIENDS';
          } else if (fs.requesterId === userId) {
            relation = 'PENDING_OUTGOING';
          } else {
            relation = 'PENDING_INCOMING';
          }
        }

        return { userId: u.id, nickname: u.nickname, dongName, creatureStage, relation };
      }),
    );

    return res.json({ results });
  } catch (err) {
    console.error('[friends] GET /search error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /friends/requests/incoming
friendsRouter.get('/requests/incoming', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query as { userId?: string };
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const incoming = await prisma.friendship.findMany({
      where: { addresseeId: userId, status: 'PENDING' },
      include: {
        requester: { select: { id: true, nickname: true, dongCode: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const requests = await Promise.all(
      incoming.map(async (f) => {
        const dongName = f.requester.dongCode ? await getDongShortName(f.requester.dongCode) : null;
        return {
          friendshipId: f.id,
          requester: { userId: f.requester.id, nickname: f.requester.nickname, dongName },
          createdAt: f.createdAt.toISOString(),
        };
      }),
    );

    return res.json({ requests });
  } catch (err) {
    console.error('[friends] GET /requests/incoming error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /friends
friendsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query as { userId?: string };
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const today = getKstDateString();

    const [acceptedFriendships, pendingOutgoing] = await Promise.all([
      prisma.friendship.findMany({
        where: {
          status: 'ACCEPTED',
          OR: [{ requesterId: userId }, { addresseeId: userId }],
        },
        include: {
          requester: {
            select: { id: true, nickname: true, dongCode: true, userCreatures: { select: { stage: true } } },
          },
          addressee: {
            select: { id: true, nickname: true, dongCode: true, userCreatures: { select: { stage: true } } },
          },
        },
      }),
      prisma.friendship.findMany({
        where: { requesterId: userId, status: 'PENDING' },
        include: {
          addressee: {
            select: { id: true, nickname: true, dongCode: true, userCreatures: { select: { stage: true } } },
          },
        },
      }),
    ]);

    // Collect all friend userIds for Redis MGET pipeline
    const friendUsers = acceptedFriendships.map((f) =>
      f.requesterId === userId ? f.addressee : f.requester,
    );

    // MGET pipeline for userSession keys
    const sessionKeys = friendUsers.map((u) => RedisKeys.userSession(u.id));
    const sessionValues =
      sessionKeys.length > 0
        ? await redis.mget(...sessionKeys)
        : [];

    // Get today's FocusSessions for IDLE determination
    const friendIds = friendUsers.map((u) => u.id);
    const todaySessions = await prisma.focusSession.findMany({
      where: { userId: { in: friendIds }, date: today },
      select: { userId: true },
    });
    const todaySessionUserIds = new Set(todaySessions.map((s) => s.userId));

    // Get poke cooldowns: last poke FROM me TO each friend within COOLDOWN_MS
    const cooldownCutoff = new Date(Date.now() - COOLDOWN_MS);
    const recentPokes = await prisma.poke.findMany({
      where: {
        fromUserId: userId,
        toUserId: { in: friendIds },
        createdAt: { gt: cooldownCutoff },
      },
      select: { toUserId: true, createdAt: true },
    });
    const pokeCooldownMap = new Map<string, Date>();
    for (const p of recentPokes) {
      const existing = pokeCooldownMap.get(p.toUserId);
      if (!existing || p.createdAt > existing) {
        pokeCooldownMap.set(p.toUserId, p.createdAt);
      }
    }

    const acceptedItems = await Promise.all(
      friendUsers.map(async (u, idx) => {
        const dongName = u.dongCode ? await getDongShortName(u.dongCode) : null;
        const creatureStage = u.userCreatures[0]?.stage ?? 0;
        const sessionVal = sessionValues[idx];

        const status = determineFriendStatus(!!sessionVal, todaySessionUserIds.has(u.id));

        const lastPoke = pokeCooldownMap.get(u.id);
        const pokeCooldownEndsAt = lastPoke
          ? new Date(lastPoke.getTime() + COOLDOWN_MS).toISOString()
          : null;

        return {
          userId: u.id,
          nickname: u.nickname,
          dongName,
          creatureStage,
          status,
          pokeCooldownEndsAt,
          friendStatus: 'ACCEPTED' as const,
        };
      }),
    );

    const pendingItems = await Promise.all(
      pendingOutgoing.map(async (f) => {
        const u = f.addressee;
        const dongName = u.dongCode ? await getDongShortName(u.dongCode) : null;
        const creatureStage = u.userCreatures[0]?.stage ?? 0;
        return {
          userId: u.id,
          nickname: u.nickname,
          dongName,
          creatureStage,
          status: 'OFFLINE' as const,
          pokeCooldownEndsAt: null,
          friendStatus: 'PENDING_OUTGOING' as const,
        };
      }),
    );

    return res.json({ friends: [...acceptedItems, ...pendingItems] });
  } catch (err) {
    console.error('[friends] GET / error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /friends/requests
friendsRouter.post('/requests', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body as { userId?: string };
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { targetUserId } = CreateFriendRequestBody.parse(req.body);

    if (userId === targetUserId) {
      return res.status(400).json({ error: '자기 자신에게 친구 요청을 보낼 수 없습니다.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Lock both users in order to prevent reverse-request races
      const [idA, idB] = [userId, targetUserId].sort();
      await tx.$queryRaw`SELECT id FROM "User" WHERE id IN (${idA}, ${idB}) ORDER BY id FOR UPDATE`;

      const target = await tx.user.findUnique({ where: { id: targetUserId }, select: { id: true } });
      if (!target) throw Object.assign(new Error('NOT_FOUND'), { code: 'NOT_FOUND' });

      // Check existing relationship (both directions)
      const existing = await tx.friendship.findFirst({
        where: {
          OR: [
            { requesterId: userId, addresseeId: targetUserId },
            { requesterId: targetUserId, addresseeId: userId },
          ],
        },
      });

      if (existing) {
        if (existing.status === 'ACCEPTED') {
          throw Object.assign(new Error('CONFLICT'), { code: 'CONFLICT' });
        }
        if (existing.requesterId === userId) {
          // Already sent PENDING request
          throw Object.assign(new Error('CONFLICT'), { code: 'CONFLICT' });
        }
        // Reverse request exists (PENDING from target to me) → auto-accept
        const accepted = await tx.friendship.update({
          where: { id: existing.id },
          data: { status: 'ACCEPTED', acceptedAt: new Date() },
        });
        return { status: 'ACCEPTED' as const, friendshipId: accepted.id, isReverse: true, reverseId: accepted.id };
      }

      // Create new PENDING request
      const created = await tx.friendship.create({
        data: { requesterId: userId, addresseeId: targetUserId },
      });
      return { status: 'PENDING' as const, friendshipId: created.id, isReverse: false };
    });

    // SSE notifications after commit
    if (result.status === 'ACCEPTED') {
      const [requester, addressee] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { nickname: true, dongCode: true } }),
        prisma.user.findUnique({ where: { id: targetUserId }, select: { nickname: true, dongCode: true } }),
      ]);
      const [requesterDong, addresseeDong] = await Promise.all([
        requester?.dongCode ? getDongShortName(requester.dongCode) : Promise.resolve(null),
        addressee?.dongCode ? getDongShortName(addressee.dongCode) : Promise.resolve(null),
      ]);
      broadcastToUser(userId, {
        type: 'friend:accepted',
        data: {
          friendshipId: result.friendshipId,
          friend: { userId: targetUserId, nickname: addressee?.nickname ?? '', dongName: addresseeDong },
        },
      });
      broadcastToUser(targetUserId, {
        type: 'friend:accepted',
        data: {
          friendshipId: result.friendshipId,
          friend: { userId, nickname: requester?.nickname ?? '', dongName: requesterDong },
        },
      });
    } else {
      const requester = await prisma.user.findUnique({ where: { id: userId }, select: { nickname: true, dongCode: true } });
      const requesterDong = requester?.dongCode ? await getDongShortName(requester.dongCode) : null;
      broadcastToUser(targetUserId, {
        type: 'friend:request:incoming',
        data: {
          friendshipId: result.friendshipId,
          requester: { userId, nickname: requester?.nickname ?? '', dongName: requesterDong },
        },
      });
    }

    return res.json({ status: result.status, friendshipId: result.friendshipId });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e.code === 'NOT_FOUND') return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    if (e.code === 'CONFLICT' || (e as { code?: string }).code === 'P2002') {
      return res.status(409).json({ error: '이미 친구 요청이 존재합니다.' });
    }
    console.error('[friends] POST /requests error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /friends/requests/:friendshipId
friendsRouter.patch('/requests/:friendshipId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body as { userId?: string };
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const friendshipId = String(req.params['friendshipId']);
    const { action } = RespondFriendRequestBody.parse(req.body);

    const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } });
    if (!friendship || friendship.status === 'ACCEPTED') {
      return res.status(404).json({ error: '친구 요청을 찾을 수 없습니다.' });
    }
    if (friendship.addresseeId !== userId) {
      return res.status(403).json({ error: '권한이 없습니다.' });
    }

    if (action === 'accept') {
      await prisma.friendship.update({
        where: { id: friendshipId },
        data: { status: 'ACCEPTED', acceptedAt: new Date() },
      });

      const [requester, addressee] = await Promise.all([
        prisma.user.findUnique({ where: { id: friendship.requesterId }, select: { nickname: true, dongCode: true } }),
        prisma.user.findUnique({ where: { id: userId }, select: { nickname: true, dongCode: true } }),
      ]);
      const [requesterDong, addresseeDong] = await Promise.all([
        requester?.dongCode ? getDongShortName(requester.dongCode) : Promise.resolve(null),
        addressee?.dongCode ? getDongShortName(addressee.dongCode) : Promise.resolve(null),
      ]);
      broadcastToUser(friendship.requesterId, {
        type: 'friend:accepted',
        data: {
          friendshipId,
          friend: { userId, nickname: addressee?.nickname ?? '', dongName: addresseeDong },
        },
      });
      broadcastToUser(userId, {
        type: 'friend:accepted',
        data: {
          friendshipId,
          friend: { userId: friendship.requesterId, nickname: requester?.nickname ?? '', dongName: requesterDong },
        },
      });
    } else {
      await prisma.friendship.delete({ where: { id: friendshipId } });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('[friends] PATCH /requests/:id error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /friends/:targetUserId
friendsRouter.delete('/:targetUserId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body as { userId?: string };
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const targetUserId = String(req.params['targetUserId']);

    const friendship = await prisma.friendship.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { requesterId: userId, addresseeId: targetUserId },
          { requesterId: targetUserId, addresseeId: userId },
        ],
      },
    });

    if (!friendship) {
      return res.status(404).json({ error: '친구 관계를 찾을 수 없습니다.' });
    }

    await prisma.friendship.delete({ where: { id: friendship.id } });
    return res.json({ ok: true });
  } catch (err) {
    console.error('[friends] DELETE /:targetUserId error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

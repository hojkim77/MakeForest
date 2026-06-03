import { Router, Request, Response } from 'express';
import { prisma } from '@makeforest/db';
import { PokeBody } from '@makeforest/types';
import { broadcastToUser } from './sse';
import { isCooldownActive } from './pokes.logic';

const COOLDOWN_MS = parseInt(process.env['POKE_COOLDOWN_SECONDS'] ?? '1800') * 1000;

export const pokesRouter = Router();

// POST /pokes
pokesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body as { userId?: string };
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { toUserId } = PokeBody.parse(req.body);

    if (userId === toUserId) {
      return res.status(400).json({ error: '자기 자신을 찌를 수 없습니다.' });
    }

    let pointsRemaining: number;
    let pokeId: string;
    let pokeCreatedAt: Date;

    try {
      const result = await prisma.$transaction(async (tx) => {
        // Lock both user rows (ORDER BY id to prevent deadlock)
        const [idA, idB] = [userId, toUserId].sort();
        await tx.$queryRaw`SELECT id FROM "User" WHERE id IN (${idA}, ${idB}) ORDER BY id FOR UPDATE`;

        // Verify friendship (ACCEPTED, either direction)
        const friendship = await tx.friendship.findFirst({
          where: {
            status: 'ACCEPTED',
            OR: [
              { requesterId: userId, addresseeId: toUserId },
              { requesterId: toUserId, addresseeId: userId },
            ],
          },
        });
        if (!friendship) throw Object.assign(new Error('NOT_FRIENDS'), { code: 'NOT_FRIENDS' });

        // Check cooldown: any poke from me to target within COOLDOWN_MS
        const cooldownCutoff = new Date(Date.now() - COOLDOWN_MS);
        const existing = await tx.$queryRaw<Array<{ createdAt: Date }>>`
          SELECT "createdAt" FROM "Poke"
          WHERE "fromUserId" = ${userId} AND "toUserId" = ${toUserId}
            AND "createdAt" > ${cooldownCutoff}
          LIMIT 1
        `;
        if (existing.length > 0) {
          const cooldown = isCooldownActive(existing[0]!.createdAt, COOLDOWN_MS);
          if (cooldown.active) {
            throw Object.assign(new Error('COOLDOWN'), { code: 'COOLDOWN', cooldownEndsAt: cooldown.endsAt });
          }
        }

        // Conditionally deduct 2 points (prevents going negative)
        const updated = await tx.$queryRaw<Array<{ points: number }>>`
          UPDATE "User" SET points = points - 2
          WHERE id = ${userId} AND points >= 2
          RETURNING points
        `;
        if (updated.length === 0) throw Object.assign(new Error('INSUFFICIENT_POINTS'), { code: 'INSUFFICIENT_POINTS' });

        const poke = await tx.poke.create({
          data: { fromUserId: userId, toUserId },
        });

        return { pointsRemaining: updated[0]!.points, pokeId: poke.id, pokeCreatedAt: poke.createdAt };
      });

      pointsRemaining = result.pointsRemaining;
      pokeId = result.pokeId;
      pokeCreatedAt = result.pokeCreatedAt;
    } catch (err: unknown) {
      const e = err as { code?: string; cooldownEndsAt?: Date };
      if (e.code === 'NOT_FRIENDS') return res.status(403).json({ error: '친구 관계가 아닙니다.' });
      if (e.code === 'COOLDOWN') {
        return res.status(409).json({
          error: '쿨다운 중입니다.',
          cooldownEndsAt: e.cooldownEndsAt!.toISOString(),
        });
      }
      if (e.code === 'INSUFFICIENT_POINTS') return res.status(402).json({ error: 'Insufficient points' });
      throw err;
    }

    const cooldownEndsAt = new Date(pokeCreatedAt.getTime() + COOLDOWN_MS).toISOString();

    // After commit: SSE notification to recipient
    void (async () => {
      try {
        const [fromUser, unreadCount] = await Promise.all([
          prisma.user.findUnique({ where: { id: userId }, select: { nickname: true } }),
          prisma.poke.count({ where: { toUserId, readAt: null } }),
        ]);
        broadcastToUser(toUserId, {
          type: 'poke:received',
          data: {
            pokeId,
            fromUserId: userId,
            fromNickname: fromUser?.nickname ?? '누군가',
            createdAt: pokeCreatedAt.toISOString(),
            unreadCount,
          },
        });
      } catch (err) {
        console.error('[pokes] SSE broadcast error:', err);
      }
    })();

    return res.json({ pointsRemaining, cooldownEndsAt });
  } catch (err) {
    console.error('[pokes] POST error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /pokes/inbox?limit=20
pokesRouter.get('/inbox', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query as { userId?: string };
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const limit = Math.min(Number(req.query['limit'] ?? 20), 50);

    const [items, unreadCount] = await Promise.all([
      prisma.poke.findMany({
        where: { toUserId: userId },
        include: { fromUser: { select: { id: true, nickname: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.poke.count({ where: { toUserId: userId, readAt: null } }),
    ]);

    return res.json({
      unreadCount,
      items: items.map((p) => ({
        pokeId: p.id,
        fromUser: { userId: p.fromUser.id, nickname: p.fromUser.nickname },
        createdAt: p.createdAt.toISOString(),
        isRead: p.readAt !== null,
      })),
    });
  } catch (err) {
    console.error('[pokes] GET /inbox error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /pokes/inbox/read
pokesRouter.post('/inbox/read', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body as { userId?: string };
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await prisma.poke.updateMany({
      where: { toUserId: userId, readAt: null },
      data: { readAt: new Date() },
    });

    return res.json({ markedCount: result.count });
  } catch (err) {
    console.error('[pokes] POST /inbox/read error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

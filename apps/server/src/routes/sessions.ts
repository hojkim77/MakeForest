import { Router, Request, Response } from 'express';
import { prisma } from '@makeforest/db';
import type { Prisma } from '@makeforest/db';
import { setSession, addActiveDong, removeActiveDong } from '@makeforest/redis';
import { broadcastToDong } from './sse';
import type { CreateSessionInput, SessionAction } from '@makeforest/types';

export const sessionsRouter = Router();

// POST /sessions — 새 세션 시작
sessionsRouter.post('/', async (req: Request, res: Response) => {
  const { durationSec, dongCode, todos, userId } = req.body as CreateSessionInput & { userId: string };

  await prisma.focusSession.updateMany({
    where: { userId, status: 'RUNNING' },
    data: { status: 'ABANDONED', endedAt: new Date() },
  });

  const session = await prisma.focusSession.create({
    data: {
      userId,
      dongCode,
      durationSec,
      todos: todos as unknown as Prisma.InputJsonValue,
      status: 'RUNNING',
    },
  });

  await setSession(session.id, {
    userId,
    dongCode,
    startedAt: session.startedAt.toISOString(),
    durationSec,
    todos,
    status: 'RUNNING',
  });

  await addActiveDong(dongCode, session.id);

  res.json({ sessionId: session.id, startedAt: session.startedAt });
});

// GET /sessions/:id
sessionsRouter.get('/:id', async (req: Request, res: Response) => {
  const id = String(req.params['id']);
  const session = await prisma.focusSession.findUnique({ where: { id } });
  if (!session) return res.status(404).json({ error: 'Not found' });
  return res.json(session);
});

// PATCH /sessions/:id — 상태 변경
sessionsRouter.patch('/:id', async (req: Request, res: Response) => {
  const { action } = req.body as { action: SessionAction };
  const id = String(req.params['id']);

  const statusMap: Record<SessionAction, 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'ABANDONED'> = {
    pause: 'PAUSED',
    resume: 'RUNNING',
    abandon: 'ABANDONED',
    complete: 'COMPLETED',
  };

  const newStatus = statusMap[action];
  const isEnding = action === 'abandon' || action === 'complete';

  const session = await prisma.focusSession.update({
    where: { id },
    data: {
      status: newStatus,
      ...(isEnding ? { endedAt: new Date() } : {}),
    },
  });

  if (isEnding) {
    await removeActiveDong(session.dongCode, id);
    broadcastToDong(session.dongCode, {
      type: 'dong:users',
      data: { dongCode: session.dongCode, users: [] },
    });
  }

  return res.json(session);
});

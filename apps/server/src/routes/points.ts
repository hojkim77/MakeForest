import { Router, Request, Response } from 'express';
import { prisma } from '@makeforest/db';

export const pointsRouter = Router();

// GET /points/me?userId=
pointsRouter.get('/me', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query as { userId?: string };
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { points: true } });
    if (!user) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });

    return res.json({ balance: user.points });
  } catch (err) {
    console.error('[points] GET /me error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

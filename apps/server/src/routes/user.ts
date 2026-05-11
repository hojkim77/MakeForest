import { Router, Request, Response } from 'express';
import { prisma } from '@makeforest/db';

export const userRouter = Router();

// GET /user/me?userId=
userRouter.get('/me', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query as { userId: string };
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const [user, userCreature] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { nickname: true, avatarUrl: true, dongCode: true, createdAt: true },
      }),
      prisma.userCreature.findUnique({
        where: { userId },
        select: { stage: true, waterCount: true },
      }),
    ]);

    if (!user) return res.status(404).json({ error: 'User not found' });

    const dongName = user.dongCode
      ? (await prisma.dong.findUnique({ where: { code: user.dongCode }, select: { name: true } }))?.name ?? null
      : null;

    return res.json({
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      dongCode: user.dongCode,
      dongName,
      createdAt: user.createdAt,
      userCreature,
    });
  } catch (err) {
    console.error('[user] GET /me error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

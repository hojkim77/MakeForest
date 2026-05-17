import { Router, Request, Response } from 'express';
import { prisma } from '@makeforest/db';
import { requireInternalAuth } from '../middleware/auth';

export const communityRouter = Router();

const ALLOWED_EMOJIS = new Set(['🔥', '💪', '👏']);

function getKstDateString(now: Date = new Date()): string {
  return now
    .toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' })
    .replace(/\. /g, '-')
    .replace(/\.$/, '');
}

function getKstDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return getKstDateString(d);
}

// GET /community/feed?cursor=&limit=20&userId=&period=today|week|all&sort=recent|popular|water&dongName=
communityRouter.get('/feed', async (req: Request, res: Response) => {
  try {
    const { cursor, limit: limitStr, userId, period, sort, dongName } = req.query as Record<string, string | undefined>;
    const limit = Math.min(Number(limitStr ?? 20), 50);
    const effectiveSort = sort === 'popular' || sort === 'water' ? sort : 'recent';
    const effectivePeriod = period === 'today' || period === 'week' ? period : 'all';

    // period → date filter
    const dateWhere: Record<string, unknown> = {};
    if (effectivePeriod === 'today') {
      dateWhere['date'] = getKstDateString();
    } else if (effectivePeriod === 'week') {
      dateWhere['date'] = { gte: getKstDateOffset(6) };
    }

    // dongName → dongCode list
    let dongCodeFilter: string[] | undefined;
    if (dongName?.trim()) {
      const dongs = await prisma.dong.findMany({
        where: { name: { contains: dongName.trim(), mode: 'insensitive' } },
        select: { code: true },
      });
      dongCodeFilter = dongs.map((d) => d.code);
      if (dongCodeFilter.length === 0) {
        return res.json({ items: [], nextCursor: null });
      }
    }

    const userWhere = dongCodeFilter ? { dongCode: { in: dongCodeFilter } } : undefined;

    const postWhere = {
      ...dateWhere,
      ...(userWhere ? { user: userWhere } : {}),
    };

    // For popular/water sorts: no cursor pagination, fetch limit items sorted accordingly
    const useCursor = effectiveSort === 'recent';

    const orderBy =
      effectiveSort === 'popular'
        ? [{ reactions: { _count: 'desc' as const } }, { comments: { _count: 'desc' as const } }]
        : { createdAt: 'desc' as const };

    const posts = await prisma.communityPost.findMany({
      take: useCursor ? limit + 1 : limit,
      ...(useCursor && cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      where: postWhere,
      orderBy,
      include: {
        user: { select: { nickname: true, dongCode: true, todosPublic: true } },
        reactions: { select: { userId: true, emoji: true } },
        comments: { select: { id: true } },
      },
    });

    const hasMore = useCursor && posts.length > limit;
    const items = hasMore ? posts.slice(0, limit) : posts;

    // For water sort: sort in memory by session waterCount
    const sessionIds = items.map((p) => p.sessionId);
    const [sessions, creatures] = await Promise.all([
      prisma.focusSession.findMany({
        where: { id: { in: sessionIds } },
        select: { id: true, waterCount: true, totalElapsedSec: true, todos: true },
      }),
      prisma.userCreature.findMany({
        where: { userId: { in: items.map((p) => p.userId) } },
        select: { userId: true, stage: true },
      }),
    ]);

    const sessionMap = new Map(sessions.map((s) => [s.id, s]));
    const creatureMap = new Map(creatures.map((c) => [c.userId, c]));

    let sortedItems = items;
    if (effectiveSort === 'water') {
      sortedItems = [...items].sort((a, b) => {
        const wa = sessionMap.get(a.sessionId)?.waterCount ?? 0;
        const wb = sessionMap.get(b.sessionId)?.waterCount ?? 0;
        return wb - wa;
      });
    }

    const nextCursor = hasMore ? items[items.length - 1]!.id : null;

    const data = sortedItems.map((post) => {
      const session = sessionMap.get(post.sessionId);
      const creature = creatureMap.get(post.userId);

      const reactionCounts: Record<string, number> = {};
      const myEmojis = new Set<string>();
      for (const r of post.reactions) {
        reactionCounts[r.emoji] = (reactionCounts[r.emoji] ?? 0) + 1;
        if (userId && r.userId === userId) myEmojis.add(r.emoji);
      }

      const reactions = ['🔥', '💪', '👏'].map((emoji) => ({
        emoji,
        count: reactionCounts[emoji] ?? 0,
        myReaction: myEmojis.has(emoji),
      }));

      return {
        id: post.id,
        createdAt: post.createdAt.toISOString(),
        user: { nickname: post.user.nickname, dongCode: post.user.dongCode },
        session: session
          ? {
              waterCount: session.waterCount,
              totalElapsedSec: session.totalElapsedSec,
              todos: session.todos,
              todosPublic: post.user.todosPublic,
            }
          : null,
        creature: { stage: creature?.stage ?? 0 },
        reactions,
        commentCount: post.comments.length,
      };
    });

    return res.json({ items: data, nextCursor });
  } catch (err) {
    console.error('[community] GET /feed error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /community/:postId/reactions — 토글 (있으면 제거, 없으면 추가)
communityRouter.post('/:postId/reactions', requireInternalAuth, async (req: Request, res: Response) => {
  try {
    const postId = String(req.params['postId']);
    const { emoji, userId } = req.body as { emoji: string; userId: string };

    if (!userId || !emoji) return res.status(400).json({ error: 'userId and emoji required' });
    if (!ALLOWED_EMOJIS.has(emoji)) return res.status(400).json({ error: 'invalid emoji' });

    const existing = await prisma.communityReaction.findUnique({
      where: { postId_userId_emoji: { postId, userId, emoji } },
    });

    if (existing) {
      await prisma.communityReaction.delete({ where: { postId_userId_emoji: { postId, userId, emoji } } });
      return res.json({ added: false });
    }

    await prisma.communityReaction.create({ data: { postId, userId, emoji } });
    return res.json({ added: true });
  } catch (err) {
    console.error('[community] POST /reactions error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /community/:postId/comments
communityRouter.get('/:postId/comments', async (req: Request, res: Response) => {
  try {
    const postId = String(req.params['postId']);
    const comments = await prisma.communityComment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { nickname: true } } },
    });
    return res.json(comments.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
      user: c.user,
    })));
  } catch (err) {
    console.error('[community] GET /comments error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /community/:postId/comments — 본인 포스트에도 가능
communityRouter.post('/:postId/comments', requireInternalAuth, async (req: Request, res: Response) => {
  try {
    const postId = String(req.params['postId']);
    const { content, userId } = req.body as { content: string; userId: string };

    if (!userId || !content?.trim()) return res.status(400).json({ error: 'userId and content required' });

    const post = await prisma.communityPost.findUnique({ where: { id: postId }, select: { id: true } });
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const comment = await prisma.communityComment.create({
      data: { postId, userId, content: content.trim() },
      include: { user: { select: { nickname: true } } },
    });

    return res.json({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      user: comment.user,
    });
  } catch (err) {
    console.error('[community] POST /comments error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

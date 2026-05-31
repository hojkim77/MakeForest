import { PrismaClient } from '@prisma/client';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));

// load-test/.env.load-test 가 있으면 최우선 적용 (실서버 테스트용)
config({ path: resolve(__dirname, '.env.load-test'), override: true });
config({ path: resolve(__dirname, '../packages/db/.env') });

const prisma = new PrismaClient();

async function main() {
  const testUsers = await prisma.user.findMany({
    where: { provider: 'test' },
    select: { id: true },
  });

  const ids = testUsers.map((u) => u.id);
  if (ids.length === 0) {
    console.log('정리할 테스트 유저 없음');
    return;
  }
  console.log(`테스트 유저 ${ids.length}명 정리 시작`);

  // Redis — 모든 세션 정리 (status 무관, dotenv 이후 dynamic import)
  const allSessions = await prisma.focusSession.findMany({
    where: { userId: { in: ids } },
    select: { id: true, dongCode: true },
  });
  if (allSessions.length > 0) {
    const { deleteSession, removeActiveDong, removeDailyOverlaySession, getDongActiveCount, redis, RedisKeys } =
      await import('@makeforest/redis');
    const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
    for (const s of allSessions) {
      await deleteSession(s.id);
      await removeActiveDong(s.dongCode, s.id);
      await removeDailyOverlaySession(today, s.id);
    }
    for (const userId of ids) {
      await redis.del(RedisKeys.userSession(userId));
    }
    const affectedDongs = [...new Set(allSessions.map((s) => s.dongCode))];
    for (const dongCode of affectedDongs) {
      const count = await getDongActiveCount(dongCode);
      if (count === 0) {
        await redis.hdel(RedisKeys.heatmapDong(), dongCode);
      } else {
        await redis.hset(RedisKeys.heatmapDong(), { [dongCode]: count });
      }
    }
    console.log(`Redis — ${allSessions.length}건 세션 키 정리`);
  }

  const [
    sessions,
    wateringLogs,
    ,                 // userCreature update — count not returned
    posts,
    reactions,
    comments,
    pokes,
    friendships,
  ] = await prisma.$transaction([
    prisma.focusSession.deleteMany({ where: { userId: { in: ids } } }),
    prisma.wateringLog.deleteMany({ where: { userId: { in: ids } } }),
    prisma.userCreature.updateMany({
      where: { userId: { in: ids } },
      data: { stage: 0, totalWaterCount: 0 },
    }),
    prisma.communityPost.deleteMany({ where: { userId: { in: ids } } }),
    prisma.communityReaction.deleteMany({ where: { userId: { in: ids } } }),
    prisma.communityComment.deleteMany({ where: { userId: { in: ids } } }),
    prisma.poke.deleteMany({
      where: { OR: [{ fromUserId: { in: ids } }, { toUserId: { in: ids } }] },
    }),
    prisma.friendship.deleteMany({
      where: { OR: [{ requesterId: { in: ids } }, { addresseeId: { in: ids } }] },
    }),
  ]);

  console.log(`FocusSession    ${sessions.count}건 삭제`);
  console.log(`WateringLog     ${wateringLogs.count}건 삭제`);
  console.log(`CommunityPost   ${posts.count}건 삭제 (reaction/comment cascade)`);
  console.log(`CommunityReaction (타인 게시글) ${reactions.count}건 삭제`);
  console.log(`CommunityComment  (타인 게시글) ${comments.count}건 삭제`);
  console.log(`Poke            ${pokes.count}건 삭제`);
  console.log(`Friendship      ${friendships.count}건 삭제`);
  console.log('정리 완료');
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());

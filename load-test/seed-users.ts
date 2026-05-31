import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import { regionOf } from '@makeforest/types';

const __dirname = dirname(fileURLToPath(import.meta.url));

// load-test/.env.load-test 가 있으면 최우선 적용 (실서버 테스트용)
config({ path: resolve(__dirname, '.env.load-test'), override: true });
config({ path: resolve(__dirname, '../packages/db/.env') });

const prisma = new PrismaClient();

async function main() {
  // 제주특별자치도 동 코드 조회 (sidoCode = '50')
  const seoulDongs = await prisma.dong.findMany({
    where: { sidoCode: '50' },
    select: { code: true, name: true },
  });

  if (seoulDongs.length === 0) {
    throw new Error('제주 동 코드가 DB에 없습니다. yarn db:seed를 먼저 실행하세요.');
  }

  console.log(`제주 동 ${seoulDongs.length}개 로드됨`);

  const users: Array<{ id: string; dongCode: string; regionCode: string }> = [];

  for (let i = 0; i < 200; i++) {
    const dong = seoulDongs[Math.floor(Math.random() * seoulDongs.length)]!;
    const providerId = `load-test-${String(i).padStart(3, '0')}`;

    const user = await prisma.user.upsert({
      where: { provider_providerId: { provider: 'test', providerId } },
      update: {
        dongCode: dong.code,
        points: 100
      },
      create: {
        provider: 'test',
        providerId,
        nickname: `LoadTest${i}`,
        dongCode: dong.code,
        points: 100,
      },
    });

    users.push({ id: user.id, dongCode: dong.code, regionCode: regionOf(dong.code, dong.name) });
  }

  // Ring topology: user[i] → user[(i+1)%200] (ACCEPTED friendship)
  for (let i = 0; i < users.length; i++) {
    const req = users[i]!;
    const addr = users[(i + 1) % users.length]!;
    await prisma.friendship.upsert({
      where: { requesterId_addresseeId: { requesterId: req.id, addresseeId: addr.id } },
      update: {},
      create: { requesterId: req.id, addresseeId: addr.id, status: 'ACCEPTED', acceptedAt: new Date() },
    });
  }

  const outputPath = resolve(__dirname, 'users.json');
  writeFileSync(outputPath, JSON.stringify(users, null, 2));

  console.log(`테스트 유저 ${users.length}명 + friendship ${users.length}개 생성 완료 → ${outputPath}`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));

// packages/db/.env 또는 루트 .env에서 DATABASE_URL 로드
config({ path: resolve(__dirname, '../packages/db/.env') });
config({ path: resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  // 서울 전체 동 코드 조회 (sidoCode = '11')
  const seoulDongs = await prisma.dong.findMany({
    where: { sidoCode: '11' },
    select: { code: true },
  });

  if (seoulDongs.length === 0) {
    throw new Error('서울 동 코드가 DB에 없습니다. yarn db:seed를 먼저 실행하세요.');
  }

  console.log(`서울 동 ${seoulDongs.length}개 로드됨`);

  const users: Array<{ id: string; dongCode: string }> = [];

  for (let i = 0; i < 100; i++) {
    const dong = seoulDongs[Math.floor(Math.random() * seoulDongs.length)]!;
    const providerId = `load-test-${String(i).padStart(3, '0')}`;

    const user = await prisma.user.upsert({
      where: { provider_providerId: { provider: 'test', providerId } },
      update: { dongCode: dong.code },
      create: {
        provider: 'test',
        providerId,
        nickname: `LoadTest${i}`,
        dongCode: dong.code,
      },
    });

    users.push({ id: user.id, dongCode: dong.code });
  }

  const outputPath = resolve(__dirname, 'users.json');
  writeFileSync(outputPath, JSON.stringify(users, null, 2));

  console.log(`테스트 유저 100명 생성 완료 → ${outputPath}`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());

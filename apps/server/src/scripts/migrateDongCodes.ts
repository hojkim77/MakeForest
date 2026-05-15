import { prisma } from '@makeforest/db';
import { regionOf } from '@makeforest/types';
import aliasMap from '../../../web/public/dong-alias.json';
import pixelMap from '../../../web/public/pixel-map.json';

const alias = aliasMap as Record<string, string>;
const dongNameMap: Record<string, string> = Object.fromEntries(
  (pixelMap as { cells: { code: string; name: string }[] }).cells.map((c) => [c.code, c.name]),
);

function normalizeDongCode(raw: string): string { return alias[raw] ?? raw; }
function getDongName(code: string): string | undefined { return dongNameMap[code]; }

const execute = process.argv.includes('--execute');

async function main() {
  const users = await prisma.user.findMany({
    where: { dongCode: { not: null } },
    select: { id: true, dongCode: true },
  });

  console.log(`총 ${users.length}명 확인 중... (${execute ? '실제 반영' : 'dry-run — --execute 플래그로 실제 반영'})\n`);

  let count = 0;
  for (const user of users) {
    const raw = user.dongCode!;
    const canonical = normalizeDongCode(raw);
    if (canonical === raw) continue;

    const dongName = getDongName(canonical);
    if (!dongName) {
      console.warn(`[SKIP] userId=${user.id}: ${canonical}에 해당하는 dong 없음`);
      continue;
    }

    const newRegionCode = regionOf(canonical, dongName);
    console.log(`[${execute ? 'UPDATE' : 'DRY'}] userId=${user.id}: dongCode ${raw} → ${canonical}, regionCode → ${newRegionCode}`);

    if (execute) {
      await prisma.user.update({
        where: { id: user.id },
        data: { dongCode: canonical, regionCode: newRegionCode },
      });
    }

    count++;
  }

  console.log(`\n${execute ? '완료' : 'dry-run 완료'}: ${count}명 ${execute ? '업데이트됨' : '업데이트 대상'}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });

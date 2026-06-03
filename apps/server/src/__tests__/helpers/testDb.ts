import { PrismaClient } from '@makeforest/db';

// Dedicated test Prisma client — separate from the singleton in @makeforest/db
// so route handlers and test utilities operate on the same DB without caching conflicts.
let _prisma: PrismaClient | null = null;

export function getTestPrisma(): PrismaClient {
  if (!_prisma) {
    _prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL! } },
    });
  }
  return _prisma;
}

export async function truncateAll(): Promise<void> {
  const prisma = getTestPrisma();
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename NOT LIKE '_prisma%'
  `;
  for (const { tablename } of tables) {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "${tablename}" RESTART IDENTITY CASCADE`,
    );
  }
}

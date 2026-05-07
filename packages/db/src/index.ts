import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export { PrismaClient } from '@prisma/client';
export type {
  User,
  FocusSession,
  Dong,
  DailySession,
  UserCreature,
  Fossil,
  WateringLog,
  PushSubscription,
  SessionStatus,
  Prisma,
} from '@prisma/client';

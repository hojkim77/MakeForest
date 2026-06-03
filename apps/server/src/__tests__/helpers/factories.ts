import type { User, FocusSession, UserCreature, Friendship, Poke } from '@makeforest/db';
import { getTestPrisma } from './testDb';

let _seq = 0;
function seq() {
  return ++_seq;
}

// ── User ─────────────────────────────────────────────────────────────────────

export async function makeUser(
  overrides: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>> = {},
): Promise<User> {
  const n = seq();
  const prisma = getTestPrisma();
  return prisma.user.create({
    data: {
      provider: 'kakao',
      providerId: `test-provider-${n}`,
      nickname: `테스터${n}`,
      dongCode: '1168010100',
      regionCode: '11680',
      points: 0,
      ...overrides,
    },
  });
}

// ── FocusSession ──────────────────────────────────────────────────────────────

export async function makeFocusSession(
  userId: string,
  overrides: Partial<Omit<FocusSession, 'id' | 'createdAt'>> = {},
): Promise<FocusSession> {
  const prisma = getTestPrisma();
  const today = new Date().toISOString().slice(0, 10);
  return prisma.focusSession.create({
    data: {
      userId,
      dongCode: '1168010100',
      date: today,
      status: 'RUNNING',
      waterCount: 0,
      totalElapsedSec: 0,
      ...overrides,
    },
  });
}

// ── UserCreature ──────────────────────────────────────────────────────────────

export async function makeUserCreature(
  userId: string,
  overrides: Partial<Omit<UserCreature, 'id' | 'createdAt' | 'updatedAt'>> = {},
): Promise<UserCreature> {
  const prisma = getTestPrisma();
  return prisma.userCreature.create({
    data: {
      userId,
      stage: 0,
      totalWaterCount: 0,
      ...overrides,
    },
  });
}

// ── Friendship ────────────────────────────────────────────────────────────────

export async function makeFriendship(
  requesterId: string,
  addresseeId: string,
  status: 'PENDING' | 'ACCEPTED' = 'ACCEPTED',
): Promise<Friendship> {
  const prisma = getTestPrisma();
  return prisma.friendship.create({
    data: {
      requesterId,
      addresseeId,
      status,
      acceptedAt: status === 'ACCEPTED' ? new Date() : null,
    },
  });
}

// ── Poke ──────────────────────────────────────────────────────────────────────

export async function makePoke(
  fromUserId: string,
  toUserId: string,
  overrides: Partial<Omit<Poke, 'id' | 'createdAt'>> = {},
): Promise<Poke> {
  const prisma = getTestPrisma();
  return prisma.poke.create({
    data: {
      fromUserId,
      toUserId,
      ...overrides,
    },
  });
}

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@makeforest/db';
import { getKstDateString } from '@/shared/utils/date';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = getKstDateString();
  const [focusSession, creature] = await Promise.all([
    prisma.focusSession.findUnique({
      where: { userId_date: { userId: session.user.id, date: today } },
      select: { waterCount: true, focusLengthMin: true, segmentCount: true },
    }),
    prisma.userCreature.findUnique({
      where: { userId: session.user.id },
      select: { stage: true, totalWaterCount: true, totalFocusMinutes: true },
    }),
  ]);

  return NextResponse.json({
    waterCount: focusSession?.waterCount ?? 0,
    date: today,
    focusLengthMin: focusSession?.focusLengthMin ?? 30,
    segmentCount: focusSession?.segmentCount ?? 12,
    creatureStage: creature?.stage ?? 0,
    creatureWaterCount: creature?.totalWaterCount ?? 0,
    creatureFocusMinutes: creature?.totalFocusMinutes ?? 0,
  });
}

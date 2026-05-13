import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@makeforest/db';

function getKstDateString(): string {
  return new Date().toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\. /g, '-').replace(/\.$/, '');
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = getKstDateString();
  const [focusSession, creature] = await Promise.all([
    prisma.focusSession.findUnique({
      where: { userId_date: { userId: session.user.id, date: today } },
      select: { waterCount: true },
    }),
    prisma.userCreature.findUnique({
      where: { userId: session.user.id },
      select: { stage: true, waterCount: true },
    }),
  ]);

  return NextResponse.json({
    waterCount: focusSession?.waterCount ?? 0,
    date: today,
    creatureStage: creature?.stage ?? 0,
    creatureWaterCount: creature?.waterCount ?? 0,
  });
}

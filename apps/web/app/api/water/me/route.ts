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
  const daily = await prisma.dailySession.findUnique({
    where: { userId_date: { userId: session.user.id, date: today } },
  });

  return NextResponse.json({ waterCount: daily?.waterCount ?? 0, date: today });
}

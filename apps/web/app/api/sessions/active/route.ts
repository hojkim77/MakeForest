import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@makeforest/db';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ sessions: [] });
  }

  const sessions = await prisma.focusSession.findMany({
    where: { userId: session.user.id, status: { in: ['RUNNING', 'PAUSED'] } },
    select: { id: true, status: true },
  });

  return NextResponse.json({ sessions });
}

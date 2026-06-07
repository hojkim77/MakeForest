import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import type { CreateSessionResType } from '@makeforest/types';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000';
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? '';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: userId, dongCode } = session.user;
  if (!dongCode) {
    return NextResponse.json({ error: '동네 설정이 필요합니다.' }, { status: 400 });
  }

  const body = await req.json() as { todayGoal: string; focusLengthMin: number; segmentCount: number };

  const res = await fetch(`${SERVER_URL}/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': INTERNAL_SECRET,
    },
    body: JSON.stringify({ ...body, userId, dongCode }),
  });

  const data = await res.json() as CreateSessionResType;
  return NextResponse.json(data, { status: res.status });
}

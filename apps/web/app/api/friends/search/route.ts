import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import type { FriendSearchResType } from '@makeforest/types';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000';
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? '';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const nickname = searchParams.get('nickname') ?? '';

  const res = await fetch(
    `${SERVER_URL}/friends/search?userId=${session.user.id}&nickname=${encodeURIComponent(nickname)}`,
    { headers: { 'x-internal-secret': INTERNAL_SECRET } },
  );

  const data = await res.json() as FriendSearchResType;
  return NextResponse.json(data, { status: res.status });
}

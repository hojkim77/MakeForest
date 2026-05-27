import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import type { FriendListResType } from '@makeforest/types';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000';
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? '';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const res = await fetch(`${SERVER_URL}/friends?userId=${session.user.id}`, {
    headers: { 'x-internal-secret': INTERNAL_SECRET },
  });

  const data = await res.json() as FriendListResType;
  return NextResponse.json(data, { status: res.status });
}

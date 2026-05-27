import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import type { CreateFriendRequestResType, IncomingRequestsResType } from '@makeforest/types';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000';
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? '';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const res = await fetch(
    `${SERVER_URL}/friends/requests/incoming?userId=${session.user.id}`,
    { headers: { 'x-internal-secret': INTERNAL_SECRET } },
  );

  const data = await res.json() as IncomingRequestsResType;
  return NextResponse.json(data, { status: res.status });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json() as { targetUserId: string };

  const res = await fetch(`${SERVER_URL}/friends/requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': INTERNAL_SECRET,
    },
    body: JSON.stringify({ ...body, userId: session.user.id }),
  });

  const data = await res.json() as CreateFriendRequestResType;
  return NextResponse.json(data, { status: res.status });
}

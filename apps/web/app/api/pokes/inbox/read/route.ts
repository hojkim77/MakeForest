import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import type { PokeReadResType } from '@makeforest/types';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000';
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? '';

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const res = await fetch(`${SERVER_URL}/pokes/inbox/read`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': INTERNAL_SECRET,
    },
    body: JSON.stringify({ userId: session.user.id }),
  });

  const data = await res.json() as PokeReadResType;
  return NextResponse.json(data, { status: res.status });
}

import { NextResponse } from 'next/server';
import { auth } from '@/auth';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: userId, dongCode } = session.user;
  const params = new URLSearchParams({ userId });
  if (dongCode) params.set('dongCode', dongCode);

  const res = await fetch(`${SERVER_URL}/stats/me?${params.toString()}`);
  const data = await res.json() as unknown;
  return NextResponse.json(data, { status: res.status });
}

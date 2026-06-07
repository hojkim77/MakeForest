import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000';
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? '';

function headers() {
  return { 'Content-Type': 'application/json', 'x-internal-secret': INTERNAL_SECRET };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const date = req.nextUrl.searchParams.get('date') ?? '';
  const res = await fetch(`${SERVER_URL}/todos?userId=${encodeURIComponent(session.user.id)}&date=${encodeURIComponent(date)}`, {
    headers: headers(),
  });
  const data = await res.json() as unknown;
  return NextResponse.json(data, { status: res.status });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as { date: string; text: string };
  const res = await fetch(`${SERVER_URL}/todos`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ ...body, userId: session.user.id }),
  });
  const data = await res.json() as unknown;
  return NextResponse.json(data, { status: res.status });
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000';
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? '';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const postIds = req.nextUrl.searchParams.get('postIds') ?? '';

  const res = await fetch(
    `${SERVER_URL}/community/my-reactions?postIds=${encodeURIComponent(postIds)}&userId=${session.user.id}`,
    { headers: { 'x-internal-secret': INTERNAL_SECRET } },
  );

  const data = await res.json() as unknown;
  return NextResponse.json(data, { status: res.status });
}

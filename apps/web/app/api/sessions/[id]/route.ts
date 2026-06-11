import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { auth } from '@/auth';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000';
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? '';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await req.json() as { action: string };

  const res = await fetch(`${SERVER_URL}/sessions/${params.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': INTERNAL_SECRET,
    },
    body: JSON.stringify(body),
  });

  if (res.ok && body.action === 'complete') {
    revalidateTag(`user-stats-${userId}`);
  }

  const data = await res.json() as unknown;
  return NextResponse.json(data, { status: res.status });
}

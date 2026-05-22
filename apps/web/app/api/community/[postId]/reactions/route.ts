import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import type { ReactionResType } from '@makeforest/types';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000';
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? '';

export async function POST(req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { postId } = await params;
  const { emoji } = await req.json() as { emoji: string };

  const res = await fetch(`${SERVER_URL}/community/${postId}/reactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-secret': INTERNAL_SECRET },
    body: JSON.stringify({ emoji, userId: session.user.id }),
  });

  const data = await res.json() as ReactionResType;
  return NextResponse.json(data, { status: res.status });
}

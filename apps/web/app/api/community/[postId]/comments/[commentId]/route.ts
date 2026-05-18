import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000';
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? '';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ postId: string; commentId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { postId, commentId } = await params;

  const res = await fetch(`${SERVER_URL}/community/${postId}/comments/${commentId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', 'x-internal-secret': INTERNAL_SECRET },
    body: JSON.stringify({ userId: session.user.id }),
  });

  return new NextResponse(null, { status: res.status });
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000';
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? '';

function headers() {
  return { 'Content-Type': 'application/json', 'x-internal-secret': INTERNAL_SECRET };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as { text?: string; done?: boolean };
  const res = await fetch(`${SERVER_URL}/todos/${params.id}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(body),
  });
  const data = await res.json() as unknown;
  return NextResponse.json(data, { status: res.status });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const res = await fetch(`${SERVER_URL}/todos/${params.id}`, {
    method: 'DELETE',
    headers: headers(),
  });
  if (res.status === 204) return new NextResponse(null, { status: 204 });
  const data = await res.json() as unknown;
  return NextResponse.json(data, { status: res.status });
}

import { NextRequest, NextResponse } from 'next/server';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const cursor = searchParams.get('cursor');
  const limit = searchParams.get('limit') ?? '20';

  const params = new URLSearchParams({ limit });
  if (cursor) params.set('cursor', cursor);

  const period = searchParams.get('period');
  const sort = searchParams.get('sort');
  const dongName = searchParams.get('dongName');
  if (period) params.set('period', period);
  if (sort) params.set('sort', sort);
  if (dongName) params.set('dongName', dongName);

  const res = await fetch(`${SERVER_URL}/community/feed?${params}`);
  const data = await res.json() as unknown;
  return NextResponse.json(data, { status: res.status });
}

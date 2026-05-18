import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@makeforest/db';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (q.length < 1) return NextResponse.json([]);

  const results = await prisma.dong.findMany({
    where: { name: { contains: q, mode: 'insensitive' } },
    take: 10,
    select: { code: true, name: true, sigunguCode: true, sidoCode: true },
  });

  return NextResponse.json(results);
}

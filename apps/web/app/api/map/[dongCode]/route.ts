import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@makeforest/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: { dongCode: string } },
) {
  const { dongCode } = params;

  const fossils = await prisma.fossil.findMany({
    where: { dongCode },
    orderBy: { createdAt: 'asc' },
  });

  const count = fossils.length;
  const baseLevel =
    count === 0 ? 'BARREN' :
    count <= 50 ? 'SPROUT' :
    count <= 200 ? 'MEADOW' :
    count <= 500 ? 'FOREST' : 'DENSE_FOREST';

  return NextResponse.json({ fossils, baseLevel });
}

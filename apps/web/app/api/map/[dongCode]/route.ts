import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@makeforest/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: { dongCode: string } },
) {
  const { dongCode } = params;

  const objects = await prisma.forestObject.findMany({
    where: { dongCode },
    orderBy: { harvestedAt: 'asc' },
  });

  const count = objects.length;
  const baseLevel =
    count === 0 ? 'BARREN' :
    count <= 50 ? 'SPROUT' :
    count <= 200 ? 'MEADOW' :
    count <= 500 ? 'FOREST' : 'DENSE_FOREST';

  return NextResponse.json({ objects, baseLevel });
}

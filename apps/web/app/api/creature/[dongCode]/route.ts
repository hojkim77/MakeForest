import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@makeforest/db';

function getKstDateString(): string {
  return new Date().toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\. /g, '-').replace(/\.$/, '');
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { dongCode: string } },
) {
  const { dongCode } = params;
  const today = getKstDateString();

  const creature = await prisma.creature.findUnique({
    where: { dongCode_date: { dongCode, date: today } },
  });

  return NextResponse.json({
    stage: creature?.stage ?? 0,
    waterCount: creature?.waterCount ?? 0,
    date: today,
  });
}

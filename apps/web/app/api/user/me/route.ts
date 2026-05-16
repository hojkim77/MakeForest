import { NextRequest, NextResponse } from 'next/server';
import { auth, unstable_update } from '@/auth';
import { prisma } from '@makeforest/db';
import { normalizeDongCode, getDongName } from '@/shared/lib/dongUtils';
import { regionOf } from '@makeforest/types';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json() as { nickname?: string; todosPublic?: boolean; dongCode?: string; regionCode?: string };

  if (body.dongCode) {
    body.dongCode = normalizeDongCode(body.dongCode);
    const dongName = getDongName(body.dongCode);
    if (dongName) body.regionCode = regionOf(body.dongCode, dongName);
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: body,
  });

  // dongCode 설정 시(온보딩) JWT 쿠키를 서버 사이드에서 즉시 갱신
  if (body.dongCode && updated.dongCode) {
    await unstable_update({ user: { dongCode: updated.dongCode, ...(updated.regionCode && { regionCode: updated.regionCode }) } });
  }

  return NextResponse.json(updated);
}

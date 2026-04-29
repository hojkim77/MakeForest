import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@makeforest/db';
import webpush from 'web-push';

export async function POST() {
  webpush.setVapidDetails(
    process.env.VAPID_MAILTO!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const subs = await prisma.pushSubscription.findMany({
    where: { userId: session.user.id },
  });

  const payload = JSON.stringify({
    title: '🌱 30분 집중 완료!',
    body: '고생하셨어요! 이제 나무에 물을 주세요.',
  });

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      ).catch(async (err: { statusCode?: number }) => {
        if (err?.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } });
        }
        throw err;
      })
    )
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  return NextResponse.json({ sent });
}

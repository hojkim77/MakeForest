import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@makeforest/db';

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get('lat') ?? '');
  const lng = parseFloat(req.nextUrl.searchParams.get('lng') ?? '');

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
  }

  // Find nearest dong using Haversine distance in PostgreSQL
  const results = await prisma.$queryRaw<{ code: string; name: string; distance: number }[]>`
    SELECT code, name,
      (6371 * acos(
        cos(radians(${lat})) * cos(radians(lat)) *
        cos(radians(lng) - radians(${lng})) +
        sin(radians(${lat})) * sin(radians(lat))
      )) AS distance
    FROM "Dong"
    ORDER BY distance ASC
    LIMIT 1
  `;

  const first = results[0];
  if (!first) {
    return NextResponse.json({ error: 'No dong found' }, { status: 404 });
  }

  return NextResponse.json({ code: first.code, name: first.name });
}

import { NextRequest, NextResponse } from 'next/server';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000';

export async function GET(
  _req: NextRequest,
  { params }: { params: { regionCode: string } },
) {
  const regionCode = encodeURIComponent(params.regionCode);
  const res = await fetch(`${SERVER_URL}/creature/${regionCode}`);
  const data = await res.json() as {
    userCount: number;
    avgStage: number;
    maxStage: number;
    totalWaterCount: number;
    date: string;
  };
  return NextResponse.json(data);
}

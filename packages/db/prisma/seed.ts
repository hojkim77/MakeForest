import { PrismaClient } from '@prisma/client';

const GEOJSON_URL =
  'https://raw.githubusercontent.com/vuski/admdongkor/master/ver20260201/HangJeongDong_ver20260201.geojson';

type Ring = number[][];
type Polygon = Ring[];

interface DongFeature {
  type: 'Feature';
  properties: {
    adm_cd2: string;
    adm_nm: string;
    sido: string;
    sgg: string;
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: Polygon | Polygon[];
  };
}

interface FeatureCollection {
  type: 'FeatureCollection';
  features: DongFeature[];
}

function polygonCentroid(polygon: Polygon): [number, number] {
  const ring = polygon[0]!;
  let lngSum = 0, latSum = 0;
  for (const pt of ring) { lngSum += pt[0]!; latSum += pt[1]!; }
  return [lngSum / ring.length, latSum / ring.length];
}

async function main() {
  console.log('GeoJSON 다운로드 중…');
  const res = await fetch(GEOJSON_URL);
  if (!res.ok) throw new Error(`다운로드 실패: ${res.status}`);
  const geojson = await res.json() as FeatureCollection;
  console.log(`${geojson.features.length}개 행정동 로드 완료`);

  console.log('Dong 테이블 시딩 중…');
  const prisma = new PrismaClient();
  const BATCH = 500;
  let seeded = 0;

  for (let i = 0; i < geojson.features.length; i += BATCH) {
    const batch = geojson.features.slice(i, i + BATCH);
    const data = batch
      .filter((f) => f.properties.adm_cd2)
      .map((f) => {
        const polygons: Polygon[] =
          f.geometry.type === 'Polygon'
            ? [f.geometry.coordinates as Polygon]
            : (f.geometry.coordinates as Polygon[]);
        const [cLng, cLat] = polygonCentroid(polygons[0]!);
        return {
          code: f.properties.adm_cd2,
          name: f.properties.adm_nm,
          sigunguCode: f.properties.sgg,
          sidoCode: f.properties.sido,
          lat: cLat,
          lng: cLng,
        };
      });

    await prisma.dong.createMany({ data, skipDuplicates: true });
    seeded += batch.length;
    process.stdout.write(`\r${seeded}/${geojson.features.length}`);
  }

  console.log('\n시딩 완료');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

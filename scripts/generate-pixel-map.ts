/**
 * generate-pixel-map.ts
 *
 * 1. vuski/admdongkor GeoJSON 다운로드 (~33MB)
 * 2. Dong 테이블 시딩 (code, name, lat, lng, sigunguCode, sidoCode)
 * 3. 픽셀 그리드 래스터화 → apps/web/public/pixel-map.json 저장
 *
 * 실행: npx tsx scripts/generate-pixel-map.ts
 * 또는: npx tsx scripts/generate-pixel-map.ts --skip-seed  (DB 시딩 건너뜀)
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

// packages/db/.env 로드 (DATABASE_URL)
config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../packages/db/.env') });

const __dirname = dirname(fileURLToPath(import.meta.url));

const GEOJSON_URL =
  'https://raw.githubusercontent.com/vuski/admdongkor/master/ver20260201/HangJeongDong_ver20260201.geojson';

// 한반도 위경도 범위 — 그리드 비율은 cos(36°) 보정 반영
const LAT_MIN = 33.0, LAT_MAX = 38.9;
const LNG_MIN = 124.6, LNG_MAX = 131.0;
const GRID_W = 250, GRID_H = 290;

// ── 기하학 유틸 ──────────────────────────────────────────────

type Ring = number[][];
type Polygon = Ring[]; // [outerRing, ...holes]

function pointInRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i] as [number, number];
    const [xj, yj] = ring[j] as [number, number];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function pointInPolygon(lng: number, lat: number, polygon: Polygon): boolean {
  if (!pointInRing(lng, lat, polygon[0]!)) return false;
  for (let i = 1; i < polygon.length; i++) {
    if (pointInRing(lng, lat, polygon[i]!)) return false; // 구멍 안이면 false
  }
  return true;
}

// 폴리곤 외곽 링의 무게중심 (시딩용 lat/lng)
function polygonCentroid(polygon: Polygon): [number, number] {
  const ring = polygon[0]!;
  let lngSum = 0, latSum = 0;
  for (const pt of ring) { lngSum += pt[0]!; latSum += pt[1]!; }
  return [lngSum / ring.length, latSum / ring.length];
}

// 픽셀 좌표 변환
function toPixelCoord(lat: number, lng: number) {
  return {
    px: Math.max(0, Math.min(GRID_W - 1, Math.round(((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * GRID_W))),
    py: Math.max(0, Math.min(GRID_H - 1, Math.round(((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * GRID_H))),
  };
}

// 위경도 → 픽셀 (역방향: 픽셀 → 위경도)
function pixelToLatLng(px: number, py: number): [number, number] {
  const lng = LNG_MIN + (px / GRID_W) * (LNG_MAX - LNG_MIN);
  const lat = LAT_MAX - (py / GRID_H) * (LAT_MAX - LAT_MIN);
  return [lat, lng];
}

// ── GeoJSON 타입 ────────────────────────────────────────────

interface DongFeature {
  type: 'Feature';
  properties: {
    adm_cd: string;   // 통계청 코드 (7자리)
    adm_cd2: string;  // 행정안전부 코드 (10자리) → Dong.code로 사용
    adm_nm: string;   // 행정구역명
    sido: string;     // 시도 코드 (2자리)
    sgg: string;      // 시군구 코드 (5자리)
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

// ── 메인 ───────────────────────────────────────────────────

async function main() {
  const skipSeed = process.argv.includes('--skip-seed');

  // 1. GeoJSON 다운로드
  console.log('[1/3] GeoJSON 다운로드 중…');
  const res = await fetch(GEOJSON_URL);
  if (!res.ok) throw new Error(`다운로드 실패: ${res.status}`);
  const geojson = await res.json() as FeatureCollection;
  console.log(`     ${geojson.features.length}개 행정동 로드 완료`);

  // 2. Dong 테이블 시딩
  if (!skipSeed) {
    console.log('[2/3] Dong 테이블 시딩 중…');
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
      process.stdout.write(`\r     ${seeded}/${geojson.features.length}`);
    }

    console.log('\n     시딩 완료');
    await prisma.$disconnect();
  } else {
    console.log('[2/3] DB 시딩 건너뜀 (--skip-seed)');
  }

  // 3. 픽셀 그리드 래스터화
  console.log('[3/3] 픽셀 그리드 래스터화 중…');

  // 각 피처를 [polygons[], code, name, bbox] 로 전처리
  type PreparedFeature = {
    polygons: Polygon[];
    code: string;
    name: string;
    bboxPxMin: number; bboxPxMax: number;
    bboxPyMin: number; bboxPyMax: number;
  };

  const prepared: PreparedFeature[] = geojson.features
    .filter((f) => f.properties.adm_cd2)
    .map((f) => {
      const polygons: Polygon[] =
        f.geometry.type === 'Polygon'
          ? [f.geometry.coordinates as Polygon]
          : (f.geometry.coordinates as Polygon[]);

      // 모든 좌표의 픽셀 bbox 계산
      let pxMin = GRID_W, pxMax = 0, pyMin = GRID_H, pyMax = 0;
      for (const poly of polygons) {
        for (const ring of poly) {
          for (const [lng, lat] of ring as [number, number][]) {
            const { px, py } = toPixelCoord(lat!, lng!);
            if (px < pxMin) pxMin = px;
            if (px > pxMax) pxMax = px;
            if (py < pyMin) pyMin = py;
            if (py > pyMax) pyMax = py;
          }
        }
      }

      return {
        polygons,
        code: f.properties.adm_cd2,
        name: f.properties.adm_nm,
        bboxPxMin: pxMin, bboxPxMax: pxMax,
        bboxPyMin: pyMin, bboxPyMax: pyMax,
      };
    });

  // 폴리곤 기준 순회 → 각 bbox 내 셀에 할당
  // grid[py][px] = index (prepared 배열 인덱스, -1 = 미할당)
  const grid = new Int16Array(GRID_W * GRID_H).fill(-1);

  for (let fi = 0; fi < prepared.length; fi++) {
    if (fi % 500 === 0) process.stdout.write(`\r     ${fi}/${prepared.length} 피처 처리 중…`);

    const f = prepared[fi]!;
    for (let py = f.bboxPyMin; py <= f.bboxPyMax; py++) {
      for (let px = f.bboxPxMin; px <= f.bboxPxMax; px++) {
        if (grid[py * GRID_W + px] !== -1) continue; // 이미 할당된 셀

        const [lat, lng] = pixelToLatLng(px, py);
        for (const poly of f.polygons) {
          if (pointInPolygon(lng, lat, poly)) {
            grid[py * GRID_W + px] = fi;
            break;
          }
        }
      }
    }
  }

  // 결과 직렬화: 셀 배열 (빈 셀 제외)
  const cells: Array<{ x: number; y: number; code: string; name: string }> = [];
  for (let py = 0; py < GRID_H; py++) {
    for (let px = 0; px < GRID_W; px++) {
      const fi = grid[py * GRID_W + px];
      if (fi !== -1) {
        const f = prepared[fi]!;
        cells.push({ x: px, y: py, code: f.code, name: f.name });
      }
    }
  }

  const output = { w: GRID_W, h: GRID_H, cells };
  const outPath = resolve(__dirname, '../apps/web/public/pixel-map.json');
  writeFileSync(outPath, JSON.stringify(output));

  console.log(`\n     완료: ${cells.length}개 셀 → ${outPath}`);
  console.log(`     파일 크기: ${(JSON.stringify(output).length / 1024).toFixed(0)}KB`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

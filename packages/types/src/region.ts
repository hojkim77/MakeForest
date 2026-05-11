export interface RegionBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

// 특별시/광역시/특별자치시 → 시 전체를 단위로
export const METROPOLITAN = new Set(['11', '26', '27', '28', '29', '30', '31', '36']);

// "고양시덕양구" → "고양시", "부천시소사구" → "부천시", "고성군" → null
export function cityFromSigungu(sigungu: string): string | null {
  const m = sigungu.match(/^(.+시)[가-힣]+구$/);
  return m ? (m[1] ?? null) : null;
}

// 각 동 픽셀의 호버/SSE 단위(시/군)를 결정하는 키
// 예: 서울 강남구 → '11', 경기도 부천시 소사구 → '41:부천시'
export function regionOf(code: string, name: string): string {
  const sido = code.substring(0, 2);
  if (METROPOLITAN.has(sido)) return sido;
  const sigungu = name.split(' ')[1] ?? code.substring(0, 5);
  const city = cityFromSigungu(sigungu);
  return `${sido}:${city ?? sigungu}`;
}

const SIDO_DISPLAY: Record<string, string> = {
  '11': '서울', '26': '부산', '27': '대구', '28': '인천',
  '29': '광주', '30': '대전', '31': '울산', '36': '세종',
};

// regionCode → 화면 표시용 이름
// sampleName(동 전체명)이 있으면 특별시/광역시 이름을 원문에서 추출
// '11'           → '서울' (sampleName 없을 때) / '서울특별시' (있을 때)
// '41:부천시'    → '부천시'
export function regionDisplayName(regionCode: string, sampleName?: string): string {
  if (regionCode.includes(':')) {
    return regionCode.split(':')[1] ?? regionCode;
  }
  if (sampleName) {
    return sampleName.split(' ')[0] ?? sampleName;
  }
  return SIDO_DISPLAY[regionCode] ?? regionCode;
}

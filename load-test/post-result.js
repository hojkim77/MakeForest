import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const PR_NUMBER = process.env.PR_NUMBER;
const REPO = process.env.GITHUB_REPOSITORY || 'hojkimg77/MakeForest';
const BASELINE_PATH = process.env.BASELINE_PATH;

if (!GITHUB_TOKEN || !PR_NUMBER) {
  console.error('GITHUB_TOKEN과 PR_NUMBER 환경변수가 필요합니다.');
  process.exit(1);
}

// baseline 대비 회귀 판정 기준 (script.js thresholds와 별개 — 상대 비교용)
// VU가 15로 줄어 측정 안정성이 높아졌으므로 감도를 25%→20%로 강화
const REGRESSION = {
  p95PctIncrease: 20,        // p95가 baseline 대비 20% 이상 증가
  errorRatePpIncrease: 0.03, // 에러율이 3pp 이상 증가
};

function readResult() {
  try {
    const raw = readFileSync(resolve(__dirname, 'result.json'), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readBaseline() {
  if (!BASELINE_PATH) return null;
  const fullPath = resolve(process.cwd(), BASELINE_PATH);
  if (!existsSync(fullPath)) return null;
  try {
    const raw = readFileSync(fullPath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function extractMetrics(result) {
  const m = result?.metrics || {};
  return {
    // 시나리오 단위 — 전체 플로우 회귀 감지
    mainP95:      m['http_req_duration{scenario:main_users}']?.values?.['p(95)'],
    mainErrRate:  m['http_req_failed{scenario:main_users}']?.values?.rate,
    mypageP95:    m['http_req_duration{scenario:mypage_users}']?.values?.['p(95)'],
    mypageErrRate: m['http_req_failed{scenario:mypage_users}']?.values?.rate,
    // 엔드포인트 단위 (name 태그) — 어느 API가 느려졌는지 피닝
    statsP95:     m['http_req_duration{name:GET /stats/me}']?.values?.['p(95)'],
    waterP95:     m['http_req_duration{name:POST /water}']?.values?.['p(95)'],
    sessionP95:   m['http_req_duration{name:POST /sessions}']?.values?.['p(95)'],
    reqPerSec:    m['http_reqs']?.values?.rate,
  };
}

function detectRegressions(curr, base) {
  const list = [];

  const check = (currVal, baseVal, label, type) => {
    if (baseVal == null || currVal == null) return;
    if (type === 'p95') {
      const pct = ((currVal - baseVal) / baseVal) * 100;
      if (pct > REGRESSION.p95PctIncrease)
        list.push(`${label} p95 +${pct.toFixed(1)}% (허용: +${REGRESSION.p95PctIncrease}%)`);
    } else if (type === 'errRate') {
      const pp = currVal - baseVal;
      if (pp > REGRESSION.errorRatePpIncrease)
        list.push(`${label} 에러율 +${(pp * 100).toFixed(2)}pp (허용: +${REGRESSION.errorRatePpIncrease * 100}pp)`);
    }
  };

  check(curr.mainP95,      base.mainP95,      '메인 플로우',  'p95');
  check(curr.mypageP95,    base.mypageP95,    '마이페이지',   'p95');
  check(curr.statsP95,     base.statsP95,     'GET /stats/me','p95');
  check(curr.mainErrRate,  base.mainErrRate,  '메인 플로우',  'errRate');
  check(curr.mypageErrRate,base.mypageErrRate,'마이페이지',   'errRate');

  return list;
}

function fmt(v, type) {
  if (v == null) return 'N/A';
  if (type === 'ms')   return `${Math.round(v)}ms`;
  if (type === 'rate') return `${(v * 100).toFixed(2)}%`;
  if (type === 'rps')  return `${Math.round(v)} req/s`;
  return String(v);
}

function fmtPctChange(currVal, baseVal) {
  if (baseVal == null || baseVal === 0 || currVal == null) return '-';
  const pct = ((currVal - baseVal) / baseVal) * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
}

function fmtPpChange(currVal, baseVal) {
  if (baseVal == null || currVal == null) return '-';
  const pp = (currVal - baseVal) * 100;
  return `${pp >= 0 ? '+' : ''}${pp.toFixed(2)}pp`;
}

function trendIcon(currVal, baseVal, type) {
  if (baseVal == null || currVal == null) return '';
  let isWarn;
  if (type === 'p95')
    isWarn = ((currVal - baseVal) / baseVal) * 100 > REGRESSION.p95PctIncrease / 2;
  else if (type === 'errRate')
    isWarn = (currVal - baseVal) > REGRESSION.errorRatePpIncrease / 2;
  return isWarn ? '🟡' : '🟢';
}

function slaIcon(value, threshold, invert = false) {
  if (value == null) return '⚠️';
  return (invert ? value <= threshold : value >= threshold) ? '✅' : '❌';
}

function buildComment(result, curr, base, regressions) {
  if (!result) {
    return `## k6 성능 회귀 테스트 결과\n\n> result.json을 찾을 수 없습니다.`;
  }

  const hasBaseline = base.mainP95 != null || base.mypageP95 != null;
  const hasRegression = regressions.length > 0;

  const overallStatus = hasRegression
    ? '❌ 회귀 감지'
    : hasBaseline
    ? '✅ 통과 (baseline 대비 이상 없음)'
    : '✅ 통과 (baseline 없음)';

  const baselineNote = hasBaseline
    ? '> baseline = 마지막 main 브랜치 성공 실행 결과 (push 이벤트 기준)'
    : '> ⚠️ baseline 없음 — 이 PR이 머지되면 새 baseline이 됩니다.';

  let table;
  if (hasBaseline) {
    table = `| 구분 | 지표 | 현재 | baseline | 변화 | 추세 |
|------|------|------|----------|------|------|
| 메인 플로우 | p95 응답시간 | ${fmt(curr.mainP95, 'ms')} | ${fmt(base.mainP95, 'ms')} | ${fmtPctChange(curr.mainP95, base.mainP95)} | ${trendIcon(curr.mainP95, base.mainP95, 'p95')} |
| 메인 플로우 | 에러율 | ${fmt(curr.mainErrRate, 'rate')} | ${fmt(base.mainErrRate, 'rate')} | ${fmtPpChange(curr.mainErrRate, base.mainErrRate)} | ${trendIcon(curr.mainErrRate, base.mainErrRate, 'errRate')} |
| 마이페이지 | p95 응답시간 | ${fmt(curr.mypageP95, 'ms')} | ${fmt(base.mypageP95, 'ms')} | ${fmtPctChange(curr.mypageP95, base.mypageP95)} | ${trendIcon(curr.mypageP95, base.mypageP95, 'p95')} |
| 마이페이지 | 에러율 | ${fmt(curr.mypageErrRate, 'rate')} | ${fmt(base.mypageErrRate, 'rate')} | ${fmtPpChange(curr.mypageErrRate, base.mypageErrRate)} | ${trendIcon(curr.mypageErrRate, base.mypageErrRate, 'errRate')} |
| GET /stats/me | p95 응답시간 | ${fmt(curr.statsP95, 'ms')} | ${fmt(base.statsP95, 'ms')} | ${fmtPctChange(curr.statsP95, base.statsP95)} | ${trendIcon(curr.statsP95, base.statsP95, 'p95')} |
| POST /water | p95 응답시간 | ${fmt(curr.waterP95, 'ms')} | ${fmt(base.waterP95, 'ms')} | ${fmtPctChange(curr.waterP95, base.waterP95)} | ${trendIcon(curr.waterP95, base.waterP95, 'p95')} |
| POST /sessions | p95 응답시간 | ${fmt(curr.sessionP95, 'ms')} | ${fmt(base.sessionP95, 'ms')} | ${fmtPctChange(curr.sessionP95, base.sessionP95)} | ${trendIcon(curr.sessionP95, base.sessionP95, 'p95')} |
| 전체 | 초당 요청수 | ${fmt(curr.reqPerSec, 'rps')} | ${fmt(base.reqPerSec, 'rps')} | ${fmtPctChange(curr.reqPerSec, base.reqPerSec)} | - |`;
  } else {
    // baseline 없음 — script.js thresholds와 동기화된 절대값으로 대체
    table = `| 구분 | 지표 | 현재 | 기준 | 상태 |
|------|------|------|------|------|
| 메인 플로우 | p95 응답시간 (CI 기준) | ${fmt(curr.mainP95, 'ms')} | < 3,000ms | ${slaIcon(curr.mainP95, 3000, true)} |
| 메인 플로우 | 에러율 | ${fmt(curr.mainErrRate, 'rate')} | < 5% | ${slaIcon(curr.mainErrRate, 0.05, true)} |
| 마이페이지 | p95 응답시간 (CI 기준) | ${fmt(curr.mypageP95, 'ms')} | < 2,000ms | ${slaIcon(curr.mypageP95, 2000, true)} |
| 마이페이지 | 에러율 | ${fmt(curr.mypageErrRate, 'rate')} | < 5% | ${slaIcon(curr.mypageErrRate, 0.05, true)} |
| GET /stats/me | p95 응답시간 (CI 기준) | ${fmt(curr.statsP95, 'ms')} | < 1,500ms | ${slaIcon(curr.statsP95, 1500, true)} |
| POST /water | p95 응답시간 | ${fmt(curr.waterP95, 'ms')} | - | - |
| POST /sessions | p95 응답시간 | ${fmt(curr.sessionP95, 'ms')} | - | - |
| 전체 | 초당 요청수 | ${fmt(curr.reqPerSec, 'rps')} | - | - |`;
  }

  const regressionSection = hasRegression
    ? `\n\n**회귀 상세:**\n${regressions.map(r => `- ${r}`).join('\n')}`
    : '';

  const rawMetrics = JSON.stringify(
    result.metrics
      ? Object.fromEntries(Object.entries(result.metrics).map(([k, v]) => [k, v.values]))
      : {},
    null,
    2
  );

  return `## k6 성능 회귀 테스트 결과 — ${overallStatus}

${baselineNote}
> CI 환경(server/DB/Redis 동일 VM)은 운영보다 레이턴시가 낮습니다. 수치 자체보다 baseline 대비 변화율로 판단하세요.

${table}${regressionSection}

<details>
<summary>원본 result.json</summary>

\`\`\`json
${rawMetrics}
\`\`\`
</details>`;
}

async function postComment(body) {
  const url = `https://api.github.com/repos/${REPO}/issues/${PR_NUMBER}/comments`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json',
    },
    body: JSON.stringify({ body }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API 오류 ${res.status}: ${text}`);
  }

  const data = await res.json();
  console.log(`PR 코멘트 게시 완료: ${data.html_url}`);
}

const result = readResult();
const baseline = readBaseline();
const curr = extractMetrics(result);
const base = extractMetrics(baseline);
const regressions = detectRegressions(curr, base);
const comment = buildComment(result, curr, base, regressions);

postComment(comment)
  .then(() => {
    if (regressions.length > 0) {
      console.error('\n회귀 감지: baseline 대비 성능 저하가 감지되었습니다.');
      regressions.forEach(r => console.error(`  - ${r}`));
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

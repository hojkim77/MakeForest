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
const REGRESSION = {
  avgPctIncrease: 15,        // avg가 baseline 대비 15% 이상 증가 (주 판정 기준)
  p95PctIncrease: 20,        // p95가 baseline 대비 20% 이상 증가 (참고 — 판정 미사용)
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
    mainAvg:       m['http_req_duration{scenario:main_users}']?.values?.avg,
    mainP95:       m['http_req_duration{scenario:main_users}']?.values?.['p(95)'],
    mainErrRate:   m['http_req_failed{scenario:main_users}']?.values?.rate,
    mypageAvg:     m['http_req_duration{scenario:mypage_users}']?.values?.avg,
    mypageP95:     m['http_req_duration{scenario:mypage_users}']?.values?.['p(95)'],
    mypageErrRate: m['http_req_failed{scenario:mypage_users}']?.values?.rate,
    // 엔드포인트 단위 (name 태그) — 어느 API가 느려졌는지 피닝
    statsRankAvg:  m['http_req_duration{name:GET /stats/rank}']?.values?.avg,
    statsRankP95:  m['http_req_duration{name:GET /stats/rank}']?.values?.['p(95)'],
    waterAvg:      m['http_req_duration{name:POST /water}']?.values?.avg,
    waterP95:      m['http_req_duration{name:POST /water}']?.values?.['p(95)'],
    sessionAvg:    m['http_req_duration{name:POST /sessions}']?.values?.avg,
    sessionP95:    m['http_req_duration{name:POST /sessions}']?.values?.['p(95)'],
    reqPerSec:     m['http_reqs']?.values?.rate,
  };
}

function detectRegressions(curr, base) {
  const list = [];

  const check = (currVal, baseVal, label, type) => {
    if (baseVal == null || currVal == null) return;
    if (type === 'avg') {
      const pct = ((currVal - baseVal) / baseVal) * 100;
      if (pct > REGRESSION.avgPctIncrease)
        list.push(`${label} avg +${pct.toFixed(1)}% (허용: +${REGRESSION.avgPctIncrease}%)`);
    } else if (type === 'errRate') {
      const pp = currVal - baseVal;
      if (pp > REGRESSION.errorRatePpIncrease)
        list.push(`${label} 에러율 +${(pp * 100).toFixed(2)}pp (허용: +${REGRESSION.errorRatePpIncrease * 100}pp)`);
    }
  };

  check(curr.mainAvg,       base.mainAvg,       '메인 플로우',    'avg');
  check(curr.mypageAvg,     base.mypageAvg,     '마이페이지',     'avg');
  check(curr.statsRankAvg,  base.statsRankAvg,  'GET /stats/rank', 'avg');
  check(curr.mainErrRate,   base.mainErrRate,   '메인 플로우',    'errRate');
  check(curr.mypageErrRate, base.mypageErrRate, '마이페이지',     'errRate');

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
  if (type === 'avg')
    isWarn = ((currVal - baseVal) / baseVal) * 100 > REGRESSION.avgPctIncrease / 2;
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

  const hasBaseline = base.mainAvg != null || base.mypageAvg != null;
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
    table = `| 구분 | 지표 | avg 현재 | avg base | 변화 | p95 현재 | 추세 |
|------|------|----------|----------|------|----------|------|
| 메인 플로우 | 응답시간 | ${fmt(curr.mainAvg, 'ms')} | ${fmt(base.mainAvg, 'ms')} | ${fmtPctChange(curr.mainAvg, base.mainAvg)} | ${fmt(curr.mainP95, 'ms')} | ${trendIcon(curr.mainAvg, base.mainAvg, 'avg')} |
| 메인 플로우 | 에러율 | ${fmt(curr.mainErrRate, 'rate')} | ${fmt(base.mainErrRate, 'rate')} | ${fmtPpChange(curr.mainErrRate, base.mainErrRate)} | - | ${trendIcon(curr.mainErrRate, base.mainErrRate, 'errRate')} |
| 마이페이지 | 응답시간 | ${fmt(curr.mypageAvg, 'ms')} | ${fmt(base.mypageAvg, 'ms')} | ${fmtPctChange(curr.mypageAvg, base.mypageAvg)} | ${fmt(curr.mypageP95, 'ms')} | ${trendIcon(curr.mypageAvg, base.mypageAvg, 'avg')} |
| 마이페이지 | 에러율 | ${fmt(curr.mypageErrRate, 'rate')} | ${fmt(base.mypageErrRate, 'rate')} | ${fmtPpChange(curr.mypageErrRate, base.mypageErrRate)} | - | ${trendIcon(curr.mypageErrRate, base.mypageErrRate, 'errRate')} |
| GET /stats/rank | 응답시간 | ${fmt(curr.statsRankAvg, 'ms')} | ${fmt(base.statsRankAvg, 'ms')} | ${fmtPctChange(curr.statsRankAvg, base.statsRankAvg)} | ${fmt(curr.statsRankP95, 'ms')} | ${trendIcon(curr.statsRankAvg, base.statsRankAvg, 'avg')} |
| POST /water | 응답시간 | ${fmt(curr.waterAvg, 'ms')} | ${fmt(base.waterAvg, 'ms')} | ${fmtPctChange(curr.waterAvg, base.waterAvg)} | ${fmt(curr.waterP95, 'ms')} | ${trendIcon(curr.waterAvg, base.waterAvg, 'avg')} |
| POST /sessions | 응답시간 | ${fmt(curr.sessionAvg, 'ms')} | ${fmt(base.sessionAvg, 'ms')} | ${fmtPctChange(curr.sessionAvg, base.sessionAvg)} | ${fmt(curr.sessionP95, 'ms')} | ${trendIcon(curr.sessionAvg, base.sessionAvg, 'avg')} |
| 전체 | 초당 요청수 | ${fmt(curr.reqPerSec, 'rps')} | ${fmt(base.reqPerSec, 'rps')} | ${fmtPctChange(curr.reqPerSec, base.reqPerSec)} | - | - |`;
  } else {
    // baseline 없음 — script.js thresholds와 동기화된 절대값으로 대체
    table = `| 구분 | 지표 | avg | p95 | 기준 (p95) | 상태 |
|------|------|-----|-----|------------|------|
| 메인 플로우 | 응답시간 | ${fmt(curr.mainAvg, 'ms')} | ${fmt(curr.mainP95, 'ms')} | < 3,000ms | ${slaIcon(curr.mainP95, 3000, true)} |
| 메인 플로우 | 에러율 | ${fmt(curr.mainErrRate, 'rate')} | - | < 5% | ${slaIcon(curr.mainErrRate, 0.05, true)} |
| 마이페이지 | 응답시간 | ${fmt(curr.mypageAvg, 'ms')} | ${fmt(curr.mypageP95, 'ms')} | < 2,000ms | ${slaIcon(curr.mypageP95, 2000, true)} |
| 마이페이지 | 에러율 | ${fmt(curr.mypageErrRate, 'rate')} | - | < 5% | ${slaIcon(curr.mypageErrRate, 0.05, true)} |
| GET /stats/rank | 응답시간 | ${fmt(curr.statsRankAvg, 'ms')} | ${fmt(curr.statsRankP95, 'ms')} | < 2,000ms | ${slaIcon(curr.statsRankP95, 2000, true)} |
| POST /water | 응답시간 | ${fmt(curr.waterAvg, 'ms')} | ${fmt(curr.waterP95, 'ms')} | - | - |
| POST /sessions | 응답시간 | ${fmt(curr.sessionAvg, 'ms')} | ${fmt(curr.sessionP95, 'ms')} | - | - |
| 전체 | 초당 요청수 | ${fmt(curr.reqPerSec, 'rps')} | - | - | - |`;
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

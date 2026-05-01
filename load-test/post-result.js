import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const PR_NUMBER = process.env.PR_NUMBER;
const REPO = process.env.GITHUB_REPOSITORY || 'hojkimg77/MakeForest';

if (!GITHUB_TOKEN || !PR_NUMBER) {
  console.error('GITHUB_TOKEN과 PR_NUMBER 환경변수가 필요합니다.');
  process.exit(1);
}

function readResult() {
  try {
    const raw = readFileSync(resolve(__dirname, 'result.json'), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function formatMs(v) {
  return v ? `${Math.round(v)}ms` : 'N/A';
}

function formatRate(v) {
  return v !== undefined ? `${(v * 100).toFixed(2)}%` : 'N/A';
}

function slaIcon(value, threshold, invert = false) {
  if (value === undefined || value === null) return '⚠️';
  return (invert ? value <= threshold : value >= threshold) ? '✅' : '❌';
}

function buildComment(result) {
  if (!result) {
    return `## k6 부하 테스트 결과\n\n> result.json을 찾을 수 없습니다.`;
  }

  const metrics = result.metrics || {};

  const p95Api    = metrics['http_req_duration{scenario:api_users}']?.values?.['p(95)'];
  const errRateApi  = metrics['http_req_failed{scenario:api_users}']?.values?.rate;
  const p95Toggle   = metrics['http_req_duration{scenario:timer_toggler}']?.values?.['p(95)'];
  const errRateToggle = metrics['http_req_failed{scenario:timer_toggler}']?.values?.rate;
  const sseCheckRate  = metrics['checks{scenario:sse_watchers}']?.values?.rate;
  const reqPerSec   = metrics['http_reqs']?.values?.rate;

  const p95ApiOk     = p95Api !== undefined && p95Api < 500;
  const errApiOk     = errRateApi !== undefined && errRateApi < 0.01;
  const p95ToggleOk  = p95Toggle !== undefined && p95Toggle < 500;
  const errToggleOk  = errRateToggle !== undefined && errRateToggle < 0.01;
  const sseOk        = sseCheckRate !== undefined && sseCheckRate > 0.95;
  const overall = p95ApiOk && errApiOk && p95ToggleOk && errToggleOk && sseOk ? '✅ 통과' : '❌ 실패';

  return `## k6 부하 테스트 결과 — ${overall}

| 구분 | 지표 | 값 | 기준 | 상태 |
|------|------|----|------|------|
| API | p95 응답시간 | ${formatMs(p95Api)} | < 500ms | ${slaIcon(p95Api, 500, true)} |
| API | 에러율 | ${formatRate(errRateApi)} | < 1% | ${slaIcon(errRateApi, 0.01, true)} |
| 토글 | p95 응답시간 | ${formatMs(p95Toggle)} | < 500ms | ${slaIcon(p95Toggle, 500, true)} |
| 토글 | 에러율 | ${formatRate(errRateToggle)} | < 1% | ${slaIcon(errRateToggle, 0.01, true)} |
| SSE | 연결 성공률 | ${formatRate(sseCheckRate)} | > 95% | ${slaIcon(sseCheckRate, 0.95)} |
| 전체 | 초당 요청수 | ${reqPerSec ? Math.round(reqPerSec) + ' req/s' : 'N/A'} | - | - |

<details>
<summary>원본 result.json</summary>

\`\`\`json
${JSON.stringify(result.metrics ? Object.fromEntries(
    Object.entries(result.metrics).map(([k, v]) => [k, v.values])
  ) : {}, null, 2)}
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
const comment = buildComment(result);

postComment(comment).catch((err) => {
  console.error(err);
  process.exit(1);
});

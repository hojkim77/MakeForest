---
name: frontend-dev
description: MakeForest frontend development patterns — Next.js App Router, Zustand, SSE, Canvas
---

# Frontend Development — MakeForest

## When to Activate

- Working on React components/pages/layouts
- Modifying or adding Zustand stores
- Adding or modifying SSE event subscriptions
- Modifying Canvas-based rendering
- Frontend feature development

---

## RSC vs Client Component

Server components (default):

- Initial data fetching (Prisma, fetch)
- Suspense boundary wrappers
- Auth check + redirect

Requires 'use client':

- useState / useEffect / useRef
- Event handlers
- Zustand store subscriptions
- SSE / EventSource
- Canvas / requestAnimationFrame
- Browser APIs

```typescript
// RSC — fetch server data, pass to CC via props
export async function WeeklyChartSection({ userId }: Props) {
  const data = await fetch(`/stats/weekly?userId=${userId}`).then(r => r.json())
  return <WeeklyChartLazy weeklyData={data.weeklyData} weeklyAvg={data.weeklyAvg} />
}

// CC — lazy load browser-only library with ssr: false
'use client'
const WeeklyChart = dynamic(
  () => import('./WeeklyChart').then(m => m.WeeklyChart),
  { ssr: false }
)
```

---

## Zustand Store

```typescript
import { useTimerStore, useWaterStore, useMapStore } from '@/store';

// Component — full or selective subscription
const { status, elapsedSec, start, pause } = useTimerStore();
const stage = useWaterStore((s) => s.creatureStage);

// Outside hooks (event handlers, timer callbacks)
const { sessionId } = useTimerStore.getState();
useWaterStore.getState().applyWaterResponse(data);
```

---

## SSE Subscription

```typescript
'use client';
useEffect(() => {
  let es: EventSource;
  let retryDelay = 1000;
  let retryTimer: ReturnType<typeof setTimeout>;

  const connect = () => {
    es = new EventSource(`${SERVER_URL}/sse-endpoint`);

    es.addEventListener('event:name', (e: MessageEvent<string>) => {
      const payload = JSON.parse(e.data);
      // update state
    });

    es.onerror = () => {
      es.close();
      retryTimer = setTimeout(() => {
        retryDelay = Math.min(retryDelay * 2, 30_000);
        connect();
      }, retryDelay);
    };
  };

  connect();
  return () => {
    clearTimeout(retryTimer);
    es?.close();
  };
}, []);
```

---

## Canvas + RAF Rendering

```typescript
'use client';
const canvasRef = useRef<HTMLCanvasElement>(null);
const renderRef = useRef(render);
renderRef.current = render; // refresh to latest closure on each render

useEffect(() => {
  if (!active) return;
  let id: number;
  const loop = (ts: number) => {
    renderRef.current(ts);
    id = requestAnimationFrame(loop);
  };
  id = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(id);
}, [active]);
```

---

## Performance

```typescript
// expensive computations
const derived = useMemo(() => compute(data), [data])

// callbacks passed to children
const handleClick = useCallback((id: string) => { ... }, [dep])

// re-render only on prop change
export const Card = React.memo(({ data }: Props) => { ... })
```

---

## Suspense Streaming

Independent Suspense per section in RSC pages:

```typescript
<Suspense fallback={<SectionSkeleton />}>
  <SectionComponent userId={userId} />
</Suspense>
```

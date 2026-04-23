'use client';

import { useEffect, useRef } from 'react';

interface ForestMapProps {
  dongCode: string;
}

export function ForestMap({ dongCode }: ForestMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Pixi.js 앱은 동적 import로 로드 (SSR 방지)
    let app: import('pixi.js').Application | null = null;

    (async () => {
      const { Application } = await import('pixi.js');
      if (!containerRef.current) return;

      app = new Application({
        resizeTo: containerRef.current,
        backgroundColor: 0x14532d,
        antialias: false,
      });

      containerRef.current.appendChild(app.view as HTMLCanvasElement);
      // 실제 ForestObject 렌더링은 여기에 구현
    })();

    return () => {
      app?.destroy(true);
    };
  }, [dongCode]);

  return <div ref={containerRef} className="w-full h-full" />;
}

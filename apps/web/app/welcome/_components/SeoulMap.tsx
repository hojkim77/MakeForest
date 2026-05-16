'use client';

import { useEffect, useRef, useState } from 'react';
import { CreatureSprite } from '@/shared/components/ui/CreatureSprite';
import { usePixelMapData } from '@/shared/hooks/usePixelMapData';

export function SeoulMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [treePos, setTreePos] = useState<{ x: number; y: number } | null>(null);
  const { data } = usePixelMapData();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const cells = data.cells.filter((c) => c.code.startsWith('11'));
    if (cells.length === 0) return;

    const xs = cells.map((c) => c.x);
    const ys = cells.map((c) => c.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);

    const PAD = 28;
    const cellPx = Math.floor(
      Math.min((W - PAD * 2) / (maxX - minX + 1), (H - PAD * 2) / (maxY - minY + 1)),
    );
    const offX = (W - (maxX - minX + 1) * cellPx) / 2;
    const offY = (H - (maxY - minY + 1) * cellPx) / 2;

    ctx.fillStyle = '#FAF9F7';
    ctx.fillRect(0, 0, W, H);

    cells.forEach((c) => {
      ctx.fillStyle = '#5ca832';
      ctx.fillRect(
        offX + (c.x - minX) * cellPx,
        offY + (c.y - minY) * cellPx,
        cellPx - 1,
        cellPx - 1,
      );
    });

    const tx = offX + (91 - minX) * cellPx + cellPx / 2;
    const ty = offY + (65 - minY) * cellPx;
    setTreePos({ x: tx, y: ty });
  }, [data]);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        width={320}
        height={320}
        className="w-full h-full"
        style={{ imageRendering: 'pixelated', display: 'block' }}
      />
      {treePos && (
        <div
          className="absolute breathe pointer-events-none"
          style={{ left: treePos.x, top: treePos.y, transform: 'translate(-50%, -100%)', zIndex: 10 }}
        >
          <CreatureSprite stage={5} size={128} />
        </div>
      )}
    </div>
  );
}

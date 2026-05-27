interface PixelArtSvgProps {
  pixels: readonly number[];
  palette: readonly string[] | Record<number, string>;
  size: number;
  gridSize?: number;
}

export function PixelArtSvg({ pixels, palette, size, gridSize = 16 }: PixelArtSvgProps) {
  const rects: React.ReactNode[] = [];

  for (let i = 0; i < pixels.length; i++) {
    const colorIdx = pixels[i]!;
    if (colorIdx === 0) continue;
    const color = Array.isArray(palette)
      ? (palette as readonly string[])[colorIdx]
      : (palette as Record<number, string>)[colorIdx];
    if (!color || color === 'transparent') continue;
    const x = i % gridSize;
    const y = Math.floor(i / gridSize);
    rects.push(<rect key={i} x={x} y={y} width={1} height={1} fill={color} />);
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${gridSize} ${gridSize}`}
      style={{ imageRendering: 'pixelated' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {rects}
    </svg>
  );
}

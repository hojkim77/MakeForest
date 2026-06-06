'use client';

import { ForestSprite, SPR_CLOUD, SPR_SUN, SPR_BIRD } from './ForestSprite';
import type { IslandPalette, AmbientSky } from './islandUtils';

interface SkyLayerProps {
  T: IslandPalette;
  ambient: AmbientSky;
}

export function SkyLayer({ T, ambient }: SkyLayerProps) {
  return (
    <>
      {T.night ? (
        // ── Night sky ──────────────────────────────────────────────────
        <>
          {ambient.stars.map((s, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: `${s.top}%`,
                left: `${s.left}%`,
                width: s.s,
                height: s.s,
                background: '#EAF2FF',
                borderRadius: '50%',
                opacity: 0.85,
                animation: `fm-twinkle ${s.d.toFixed(2)}s ease-in-out ${s.delay.toFixed(2)}s infinite`,
              }}
            />
          ))}
          {/* Moon */}
          <div
            style={{
              position: 'absolute',
              right: 90,
              top: 70,
              width: 74,
              height: 74,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 36% 34%, #FBF6E4 0%, #E7DEC0 70%, #D5CAA6 100%)',
              boxShadow: '0 0 40px 10px rgba(245,238,210,0.35)',
            }}
          >
            <div style={{ position: 'absolute', left: 18, top: 22, width: 12, height: 12, borderRadius: '50%', background: 'rgba(190,180,150,0.5)' }} />
            <div style={{ position: 'absolute', left: 44, top: 40, width: 8, height: 8, borderRadius: '50%', background: 'rgba(190,180,150,0.45)' }} />
          </div>
        </>
      ) : (
        // ── Day / Sunset sky ───────────────────────────────────────────
        <>
          {/* Sun */}
          <div
            style={{
              position: 'absolute',
              right: 96,
              top: T.overlay !== 'transparent' ? 150 : 64,
              zIndex: 1,
              filter: T.overlay !== 'transparent' ? 'hue-rotate(-12deg) saturate(1.2)' : undefined,
            }}
          >
            <ForestSprite data={SPR_SUN} scale={T.overlay !== 'transparent' ? 7 : 5} />
          </div>

          {/* Clouds */}
          {ambient.clouds.map((c, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: c.top,
                left: 0,
                opacity: c.op,
                zIndex: 1,
                animation: `fm-drift ${c.dur.toFixed(2)}s linear ${c.delay.toFixed(2)}s infinite`,
              }}
            >
              <ForestSprite
                data={SPR_CLOUD}
                scale={c.scale}
                filter={T.overlay !== 'transparent' ? 'sepia(0.4) saturate(1.3) hue-rotate(-15deg)' : undefined}
              />
            </div>
          ))}

          {/* Birds */}
          {ambient.birds.map((b, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: b.top,
                left: 0,
                zIndex: 1,
                animation: `fm-bird ${b.dur.toFixed(2)}s linear ${b.delay.toFixed(2)}s infinite`,
                opacity: 0.7,
              }}
            >
              <ForestSprite data={SPR_BIRD} scale={b.scale} />
            </div>
          ))}
        </>
      )}
    </>
  );
}

import Link from 'next/link';
import { CreatureSprite } from '@/components/panel/CreatureSprite';
import { SeoulMap } from './SeoulMap';

export function HeroSection() {
  return (
    <section className="flex items-center justify-center pixel-bg" id="hero">
      {/* Scattered decorative trees */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute opacity-20" style={{ bottom: '8%', left: '2%' }}>
          <CreatureSprite stage={4} size={64} />
        </div>
        <div className="absolute opacity-15" style={{ top: '14%', left: '7%' }}>
          <CreatureSprite stage={6} size={48} />
        </div>
        <div className="absolute opacity-20" style={{ bottom: '10%', right: '4%' }}>
          <CreatureSprite stage={3} size={72} />
        </div>
        <div className="absolute opacity-15" style={{ top: '18%', right: '7%' }}>
          <CreatureSprite stage={5} size={56} />
        </div>
        <div className="absolute opacity-10" style={{ bottom: '30%', left: '36%' }}>
          <CreatureSprite stage={3} size={44} />
        </div>
        <div className="absolute opacity-15" style={{ top: '8%', right: '28%' }}>
          <CreatureSprite stage={4} size={40} />
        </div>
      </div>

      <div className="container mx-auto px-6 max-w-5xl flex flex-col md:flex-row items-center gap-12 pt-14">
        {/* Left */}
        <div className="w-full md:w-1/2 space-y-4">
          <span className="font-mono text-xs text-primary bg-primary-fixed px-2 py-1 border border-primary uppercase tracking-widest inline-block">
            Community Focus Project
          </span>
          <h1 className="font-mono text-6xl md:text-7xl text-on-surface leading-tight tracking-tighter">
            집중하면,
            <br />
            <span className="text-primary-container">숲이 자란다.</span>
          </h1>
          <p className="font-sans text-on-surface-variant max-w-md leading-relaxed">
            30분 타이머가 끝날 때마다 물을 줄 수 있어요. 당신의 집중이 생명체를 키우고, 동네의 숲을
            만듭니다.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/"
              className="bg-primary-container text-on-primary-container font-mono px-12 py-4 inline-block text-center border border-primary-container w-fit shadow-[4px_4px_0_rgba(0,0,0,0.1)]"
            >
              [숲 키우러 가기 →]
            </Link>
          </div>
        </div>

        {/* Right */}
        <div className="w-full md:w-1/2 flex justify-center">
          <div className="relative w-full h-full border border-[#E8E4DC] overflow-hidden">
            <SeoulMap />
          </div>
        </div>
      </div>
      {/* Swipe hint */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center z-30 pointer-events-none">
        <span className="font-mono text-s" style={{ color: '#226143', opacity: 0.5 }}>
          swipe or use arrow keys ↓
        </span>
      </div>
    </section>
  );
}

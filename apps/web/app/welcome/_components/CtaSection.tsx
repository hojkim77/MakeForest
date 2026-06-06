import Link from 'next/link';

export function CtaSection() {
  return (
    <section className="flex items-center justify-center bg-surface" id="cta">
      <div className="container mx-auto px-6 max-w-5xl text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="inline-flex flex-col items-center gap-3">
            <div className="w-14 h-14 bg-primary-fixed border-2 border-outline flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">park</span>
            </div>
            <h2 className="font-mono text-5xl text-on-surface tracking-tighter leading-tight">
              오늘의 집중을
              <br />
              시작해볼까요?
            </h2>
          </div>
          <p className="font-sans text-on-surface-variant leading-relaxed">
            씨앗 하나가 숲이 됩니다. 지금 내 동네에서 집중하는 이웃들이 당신을 기다리고 있어요.
          </p>
          <div className="pt-4 flex flex-col items-center gap-4">
            <Link
              href="/"
              className="bg-primary text-on-primary font-mono text-xl px-12 py-5 border-2 border-outline shadow-island hover:bg-primary/90 active:shadow-none active:translate-y-px active:translate-x-px transition-none inline-block"
            >
              [지금 숲 키우기 →]
            </Link>
            <Link
              href="/"
              className="font-mono text-xs text-on-surface-variant hover:text-primary underline decoration-dotted underline-offset-4"
            >
              로그인 없이 지도 둘러보기
            </Link>
          </div>
        </div>
      </div>

      <footer className="absolute bottom-8 left-0 right-0 text-center">
        <span className="font-mono text-xs text-on-surface-variant uppercase tracking-widest">
          © 2026 MAKEFOREST
        </span>
      </footer>
      <div className="absolute bottom-0 left-0 w-full h-1 bg-primary-container" />
    </section>
  );
}

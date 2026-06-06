import { LoginButtons } from './_components/LoginButtons';

export default function LoginPage() {
  return (
    <main className="bg-background text-on-surface min-h-screen flex flex-col items-center justify-center p-md pixel-grid relative">
      <div className="max-w-[400px] w-full flex flex-col items-center text-center">
        {/* Title */}
        <header className="mb-xl">
          <h1 className="font-mono text-display text-primary mb-sm uppercase tracking-tighter">
            집중의 시작, 픽셀 숲
          </h1>
          <p className="font-sans text-body-md text-on-surface-variant">
            함께 숲을 가꾸기 위해 로그인이 필요해요.
          </p>
        </header>

        {/* Forest icon */}
        <div className="mb-xl">
          <div className="w-12 h-12 flex items-center justify-center bg-surface-container border-2 border-outline shadow-island">
            <span className="material-symbols-outlined text-primary text-[32px]">forest</span>
          </div>
        </div>

        <LoginButtons />

        {/* Footer pixel grid decoration */}
        <footer className="mt-xl flex flex-col items-center gap-md">
          <div className="grid grid-cols-3 gap-1">
            <div className="w-2 h-2 bg-primary" />
            <div className="w-2 h-2 bg-primary-container" />
            <div className="w-2 h-2 bg-primary" />
            <div className="w-2 h-2 bg-secondary-container" />
            <div className="w-2 h-2 bg-primary" />
            <div className="w-2 h-2 bg-secondary-container" />
          </div>
          <p className="font-mono text-pixel-stat text-outline-variant uppercase tracking-widest">
            Our Neighborhood Pixel Forest
          </p>
        </footer>
      </div>

      {/* Bottom decorative sprout */}
      <div className="fixed bottom-xl left-1/2 -translate-x-1/2 opacity-20 pointer-events-none">
        <span className="material-symbols-outlined text-primary text-[48px]">potted_plant</span>
      </div>
    </main>
  );
}

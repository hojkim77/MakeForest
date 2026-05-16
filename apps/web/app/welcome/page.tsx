import './welcome.css';
import { HeroSection } from './_components/HeroSection';
import { FeaturesSection } from './_components/FeaturesSection';
import { HowItWorksSection } from './_components/HowItWorksSection';
import { CtaSection } from './_components/CtaSection';

export const dynamic = 'force-static';

export default function WelcomePage() {
  return (
    <div style={{ background: '#FAF9F7' }}>
      <main className="welcome-snap">
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <CtaSection />
      </main>
    </div>
  );
}

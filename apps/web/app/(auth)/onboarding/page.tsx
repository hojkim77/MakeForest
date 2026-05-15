'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { LocationDetectStep, type DetectStatus } from './_components/LocationDetectStep';
import { regionOf } from '@makeforest/types';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import { toast } from '@/shared/lib/toast';

const LocationSearchStep = dynamic(
  () => import('./_components/LocationSearchStep').then((m) => ({ default: m.LocationSearchStep })),
  { ssr: false },
);

type Step = 'detect' | 'search';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('detect');
  const [detectStatus, setDetectStatus] = useState<DetectStatus>('detecting');
  const [detectedDong, setDetectedDong] = useState<{ code: string; name: string } | undefined>();
  const [saving, setSaving] = useState(false);

  // Prefetch main page resources during onboarding wait time
  useEffect(() => {
    router.prefetch('/');
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = '/pixel-map.json';
    link.setAttribute('as', 'fetch');
    link.setAttribute('crossOrigin', 'anonymous');
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, [router]);

  // Request GPS on mount, auto-fall-back to search on failure
  useEffect(() => {
    if (!navigator.geolocation) {
      setDetectStatus('failed');
      return;
    }

    function requestLocation() {
      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          try {
            const dong = await api.get<{ code: string; name: string }>(
              API_PATHS.LOCATION_DETECT(coords.latitude, coords.longitude),
            );
            setDetectedDong(dong);
            setDetectStatus('found');
          } catch {
            setDetectStatus('failed');
          }
        },
        (err) => {
          if (err.code === GeolocationPositionError.PERMISSION_DENIED) {
            setDetectStatus('denied');
          } else {
            setDetectStatus('failed');
            setStep('search');
          }
        },
        { timeout: 8000 },
      );
    }

    if (navigator.permissions) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((result) => {
          if (result.state === 'denied') {
            setDetectStatus('denied');
          } else {
            requestLocation();
          }
        })
        .catch(() => requestLocation());
    } else {
      requestLocation();
    }
  }, []);

  async function saveDong(code: string, name: string) {
    setSaving(true);
    try {
      await api.patch(API_PATHS.USER_ME(), { dongCode: code, regionCode: regionOf(code, name) });
      // JWT 쿠키에 dongCode/regionCode 반영 후 하드 내비게이션 — 미들웨어가 새 쿠키를 읽어야 함
      window.location.href = '/';
    } catch {
      toast.error('동네 저장에 실패했어요. 다시 시도해주세요.');
      setSaving(false);
    }
  }

  async function handleConfirmDetected() {
    if (!detectedDong) return;
    await saveDong(detectedDong.code, detectedDong.name);
  }

  async function handleSelectFromSearch(dong: { code: string; name: string }) {
    await saveDong(dong.code, dong.name);
  }

  return (
    <main className="bg-background text-on-surface min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="fixed top-0 left-0 w-full z-50 bg-[#F5F3EF] border-b border-[#E8E4DC] flex justify-between items-center px-md h-14">
        <div className="flex items-center gap-sm">
          {step === 'search' && (
            <button
              onClick={() => setStep('detect')}
              className="text-on-surface-variant hover:bg-surface-container-high p-xs transition-colors"
              aria-label="뒤로"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          )}
          <span className="font-mono text-pixel-stat text-primary uppercase">Pixel Forest</span>
        </div>
        <span className="font-mono text-label text-outline">동네 설정</span>
      </header>

      {/* Content */}
      <div className="flex-grow flex flex-col items-center justify-center px-lg pt-20 pb-xl">
        {saving ? (
          <div className="flex flex-col items-center gap-lg">
            <span className="material-symbols-outlined text-primary text-[48px] animate-spin">
              sync
            </span>
            <p className="font-mono text-label text-outline uppercase">설정 저장 중…</p>
          </div>
        ) : step === 'detect' ? (
          <LocationDetectStep
            status={detectStatus}
            detectedDong={detectedDong}
            onConfirm={handleConfirmDetected}
            onSearchManually={() => setStep('search')}
          />
        ) : (
          <LocationSearchStep
            onSelect={handleSelectFromSearch}
          />
        )}
      </div>

      {/* Bottom decoration */}
      <footer className="pb-xl flex justify-center opacity-50">
        <div className="flex gap-1">
          <div className="w-1 h-1 bg-primary" />
          <div className="w-1 h-1 bg-primary" />
          <div className="w-1 h-1 bg-primary" />
        </div>
      </footer>
    </main>
  );
}

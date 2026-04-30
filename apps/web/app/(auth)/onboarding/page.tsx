'use client';

import { useState, useEffect } from 'react';
import { LocationDetectStep, type DetectStatus } from '@/components/onboarding/LocationDetectStep';
import { LocationSearchStep } from '@/components/onboarding/LocationSearchStep';
import { regionOf } from '@makeforest/types';

type Step = 'detect' | 'search';

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>('detect');
  const [detectStatus, setDetectStatus] = useState<DetectStatus>('detecting');
  const [detectedDong, setDetectedDong] = useState<{ code: string; name: string } | undefined>();
  const [saving, setSaving] = useState(false);

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
            const res = await fetch(
              `/api/location/detect?lat=${coords.latitude}&lng=${coords.longitude}`,
            );
            if (!res.ok) throw new Error('no dong');
            const dong = await res.json() as { code: string; name: string };
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
      const res = await fetch('/api/user/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dongCode: code, regionCode: regionOf(code, name) }),
      });
      if (!res.ok) throw new Error('save failed');
      // JWT 쿠키에 dongCode/regionCode 반영 후 하드 내비게이션 — 미들웨어가 새 쿠키를 읽어야 함
      window.location.href = '/';
    } catch {
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

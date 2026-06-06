'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import { LocationDetectStep, type DetectStatus } from './_components/LocationDetectStep';
import { NicknameStep } from './_components/NicknameStep';
import { regionOf } from '@makeforest/types';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import { handleApiError } from '@/shared/lib/handleApiError';
import { Button } from '@/shared/components/ui/Button';

const LocationSearchStep = dynamic(
  () => import('./_components/LocationSearchStep').then((m) => ({ default: m.LocationSearchStep })),
  { ssr: false },
);

type Step = 'nickname' | 'detect' | 'search';

export default function OnboardingPage() {
  const { data: session } = useSession();
  const [step, setStep] = useState<Step>('nickname');
  const [nickname, setNickname] = useState('');
  const [detectStatus, setDetectStatus] = useState<DetectStatus>('detecting');
  const [detectedDong, setDetectedDong] = useState<{ code: string; name: string } | undefined>();
  const [saving, setSaving] = useState(false);

  // session 로드 후 닉네임 초기값 설정 (소셜 계정 이름)
  useEffect(() => {
    if (session?.user?.name) {
      setNickname((prev) => (prev ? prev : (session.user.name ?? '')));
    }
  }, [session?.user?.name]);

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

  function handleNicknameConfirm(confirmed: string) {
    setNickname(confirmed);
    setStep('detect');
  }

  async function saveDong(code: string, name: string) {
    setSaving(true);
    try {
      await api.patch(API_PATHS.USER_ME(), { nickname, dongCode: code, regionCode: regionOf(code, name) });
      // JWT 쿠키에 dongCode/regionCode 반영 후 하드 내비게이션 — 미들웨어가 새 쿠키를 읽어야 함
      window.location.href = '/';
    } catch (err) {
      handleApiError(err, { fallback: '동네 저장에 실패했어요. 다시 시도해주세요.' });
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
      <header className="fixed top-0 left-0 w-full z-50 bg-background border-b border-outline flex justify-between items-center px-md h-14">
        <div className="flex items-center gap-sm">
          {(step === 'search' || step === 'detect') && (
            <Button
              variant="ghost"
              size="sm"
              icon="arrow_back"
              aria-label="뒤로"
              onClick={() => setStep(step === 'search' ? 'detect' : 'nickname')}
            />
          )}
          <span className="font-mono text-pixel-stat text-primary uppercase">Pixel Forest</span>
        </div>
        <span className="font-mono text-label text-on-surface-variant">
          {step === 'nickname' ? '닉네임 설정' : '동네 설정'}
        </span>
      </header>

      {/* Content */}
      <div className="flex-grow flex flex-col items-center justify-center px-lg pt-20 pb-xl">
        {saving ? (
          <div className="flex flex-col items-center gap-lg">
            <span className="material-symbols-outlined text-primary text-[48px] animate-spin">
              sync
            </span>
            <p className="font-mono text-label text-on-surface-variant uppercase">설정 저장 중…</p>
          </div>
        ) : step === 'nickname' ? (
          <NicknameStep
            initialNickname={nickname}
            onConfirm={handleNicknameConfirm}
          />
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

'use client';

import { useState } from 'react';

const MAX = 20;

interface NicknameStepProps {
  initialNickname: string;
  onConfirm: (nickname: string) => void;
}

export function NicknameStep({ initialNickname, onConfirm }: NicknameStepProps) {
  const [value, setValue] = useState(initialNickname.slice(0, MAX));

  const trimmed = value.trim();
  const isValid = trimmed.length >= 1 && trimmed.length <= MAX;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    onConfirm(trimmed);
  }

  return (
    <div className="w-full flex flex-col items-center text-center gap-xl">
      {/* Icon */}
      <div className="relative w-24 h-24 flex items-center justify-center">
        <div className="absolute inset-0 pixel-grid opacity-30 border border-outline-variant rounded-full" />
        <div className="relative w-10 h-10 bg-primary border-2 border-on-primary-fixed-variant flex items-center justify-center">
          <span
            className="material-symbols-outlined text-white text-[20px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            person
          </span>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-sm">
        <h1 className="font-mono text-display text-on-surface uppercase tracking-tight">
          닉네임을 정해주세요.
        </h1>
        <p className="font-sans text-body-md text-on-surface-variant">
          픽셀 숲에서 사용할 이름이에요.
        </p>
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="w-full max-w-md flex flex-col gap-lg">
        <div className="bg-[#F5F3EF] border border-[#E8E4DC] p-xl flex flex-col gap-sm">
          <div className="flex justify-between items-center">
            <span className="font-mono text-label text-primary uppercase">Nickname</span>
            <span className={`font-mono text-label ${value.length > MAX ? 'text-error' : 'text-outline'}`}>
              {value.length} / {MAX}
            </span>
          </div>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={MAX}
            autoFocus
            placeholder="닉네임 입력"
            className="w-full bg-surface border border-[#E8E4DC] px-md py-sm font-mono text-body-md text-on-surface placeholder:text-outline-variant focus:outline-none focus:border-primary"
          />
        </div>

        <button
          type="submit"
          disabled={!isValid}
          className="w-full h-14 bg-[#3D7A5A] text-white font-mono text-label tracking-wider border border-[#3D7A5A] hover:bg-[#2C6A4B] transition-colors flex items-center justify-center gap-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          다음
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      </form>
    </div>
  );
}

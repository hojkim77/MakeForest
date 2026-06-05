'use client';

import { useState, useRef } from 'react';

// clip-path for pixel-notched corners (4px notch)
const PIX_NOTCH =
  'polygon(4px 0%, calc(100% - 4px) 0%, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0% calc(100% - 4px), 0% 4px)';

interface PixelBubbleProps {
  value: string | null;
  locked: boolean;
  onSubmit: (text: string) => Promise<void>;
  isPending?: boolean;
  bounce?: boolean;
}

export function PixelBubble({ value, locked, onSubmit, isPending, bounce }: PixelBubbleProps) {
  const [editing, setEditing] = useState(!value && !locked);
  const [draft, setDraft] = useState(value ?? '');
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const trimmed = draft.trim();

  async function handleSubmit() {
    if (isPending) return;
    setError(null);
    if (trimmed.length === 0) {
      setError('목표를 입력해주세요.');
      return;
    }
    if (trimmed.length > 50) {
      setError('50자 이내로 입력해주세요.');
      return;
    }
    try {
      await onSubmit(trimmed);
      setEditing(false);
    } catch {
      setError('저장에 실패했어요. 다시 시도해주세요.');
    }
  }

  // If locked (session started), show read-only dim bubble
  if (locked) {
    return (
      <div className="flex flex-col items-center gap-xs mb-sm">
        <div
          style={{ clipPath: PIX_NOTCH }}
          className="w-full bg-surface-container-high border-2 border-[#1B3A26] px-md py-sm"
        >
          <p className="font-mono text-sm text-outline text-center leading-snug line-clamp-2">
            {value ?? '오늘의 목표 작성 전'}
          </p>
        </div>
        {/* pixel tail */}
        <PixelTail />
      </div>
    );
  }

  // If value set and not editing, show filled read mode
  if (value && !editing) {
    return (
      <div className={`flex flex-col items-center gap-xs mb-sm${bounce ? ' animate-bubble-bounce' : ''}`}>
        <div
          style={{ clipPath: PIX_NOTCH }}
          className="w-full bg-[#FBF7EC] border-2 border-[#1B3A26] px-md py-sm cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => !locked && setEditing(true)}
        >
          <p className="font-mono text-sm text-[#1B3A26] text-center leading-snug line-clamp-2">
            {value}
          </p>
        </div>
        <PixelTail />
      </div>
    );
  }

  // Edit mode
  return (
    <div className={`flex flex-col items-center gap-xs mb-sm${bounce ? ' animate-bubble-bounce' : ''}`}>
      <div
        style={{ clipPath: PIX_NOTCH }}
        className="w-full bg-[#FBF7EC] border-2 border-[#1B3A26] px-md pt-sm pb-xs"
      >
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void handleSubmit();
            }
          }}
          placeholder="오늘의 목표를 입력하세요 (최대 50자)"
          maxLength={60}
          rows={2}
          className="w-full resize-none bg-transparent outline-none font-mono text-sm text-[#1B3A26] placeholder-[#9AA295] leading-snug"
          autoFocus
        />
        <div className="flex items-center justify-between mt-xs">
          {error ? (
            <span className="text-[10px] text-red-500 font-mono">{error}</span>
          ) : (
            <span className="text-[10px] text-[#9AA295] font-mono">{trimmed.length}/50</span>
          )}
          <button
            onClick={() => void handleSubmit()}
            disabled={isPending || trimmed.length === 0}
            className="font-mono text-[11px] font-bold text-[#1B3A26] border border-[#1B3A26] px-xs py-[2px] disabled:opacity-40 hover:bg-[#1B3A26] hover:text-[#FBF7EC] transition-colors"
          >
            {isPending ? '저장중' : '확인'}
          </button>
        </div>
      </div>
      <PixelTail />
    </div>
  );
}

function PixelTail() {
  return (
    <div className="flex flex-col items-center" style={{ marginTop: -2 }}>
      <div style={{ width: 10, height: 4, background: '#1B3A26' }} />
      <div style={{ width: 6, height: 4, background: '#1B3A26' }} />
      <div style={{ width: 3, height: 4, background: '#1B3A26' }} />
    </div>
  );
}

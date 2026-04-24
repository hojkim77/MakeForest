'use client';

import { useState, useEffect, useRef } from 'react';

interface DongResult {
  code: string;
  name: string;
  sigunguCode: string;
  sidoCode: string;
}

interface LocationSearchStepProps {
  onSelect: (dong: { code: string; name: string }) => void;
  onBack: () => void;
}

export function LocationSearchStep({ onSelect, onBack }: LocationSearchStepProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DongResult[]>([]);
  const [selected, setSelected] = useState<DongResult | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/location/search?q=${encodeURIComponent(query)}`);
        const data: DongResult[] = await res.json();
        setResults(data);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query]);

  return (
    <div className="w-full flex flex-col items-center gap-xl">
      {/* Header */}
      <div className="w-full max-w-2xl text-center">
        <h1 className="font-mono text-display text-on-surface mb-md">
          활동할 동네를 입력해 주세요.
        </h1>
        <p className="font-sans text-body-md text-outline mb-xl">
          근처 이웃들과 함께 작은 숲을 가꿔보세요.
        </p>

        {/* Search input */}
        <div className="relative w-full group">
          <div className="absolute inset-y-0 left-md flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-outline group-focus-within:text-primary transition-colors">
              {loading ? 'sync' : 'search'}
            </span>
          </div>
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
            placeholder="동네 이름(동, 읍, 면)으로 검색"
            className="w-full h-16 pl-xl pr-md bg-surface-container-lowest border border-outline-variant focus:border-primary-container focus:outline-none font-mono text-pixel-stat text-sm transition-all placeholder:font-sans placeholder:text-outline/50"
          />
        </div>
      </div>

      {/* Results panel */}
      <div className="w-full max-w-2xl bg-[#F5F3EF] border border-[#E8E4DC] overflow-hidden">
        <div className="px-md py-sm border-b border-[#E8E4DC] bg-surface-container-high flex justify-between items-center">
          <span className="font-mono text-label text-outline uppercase">Search Results</span>
          {query && !loading && (
            <span className="font-mono text-label text-primary">
              {results.length} Areas Found
            </span>
          )}
        </div>

        {results.length > 0 && (
          <div className="divide-y divide-[#E8E4DC]">
            {results.map((dong) => {
              const isSelected = selected?.code === dong.code;
              return (
                <button
                  key={dong.code}
                  onClick={() => setSelected(dong)}
                  className={[
                    'w-full flex items-center justify-between p-md group cursor-pointer transition-colors duration-0',
                    isSelected ? 'bg-emerald-100' : 'hover:bg-[#E8E4DC]',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-md">
                    <span
                      className={[
                        'material-symbols-outlined',
                        isSelected ? 'text-[#3D7A5A]' : 'text-outline group-hover:text-primary',
                      ].join(' ')}
                      style={isSelected ? { fontVariationSettings: "'FILL' 1" } : undefined}
                    >
                      location_on
                    </span>
                    <div className="text-left">
                      <span
                        className={[
                          'font-mono text-headline block',
                          isSelected ? 'text-[#3D7A5A]' : 'text-on-surface',
                        ].join(' ')}
                      >
                        {dong.name}
                      </span>
                      <div className="flex items-center gap-xs mt-1">
                        {isSelected && (
                          <span className="bg-[#3D7A5A] text-white text-[10px] font-mono px-1">
                            SELECTED
                          </span>
                        )}
                        <span className="font-mono text-label text-outline">{dong.sigunguCode}</span>
                      </div>
                    </div>
                  </div>
                  <span
                    className={[
                      'material-symbols-outlined',
                      isSelected ? 'text-[#3D7A5A]' : 'text-outline group-hover:text-primary',
                    ].join(' ')}
                  >
                    chevron_right
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Empty / hint state */}
        <div className="p-xl text-center border-t border-[#E8E4DC]">
          <div className="flex flex-col items-center gap-sm">
            <span className="material-symbols-outlined text-outline-variant text-4xl">forest</span>
            <p className="font-sans text-body-md text-outline">
              {!query
                ? '동 이름을 입력해 주세요.'
                : results.length === 0 && !loading
                  ? '찾으시는 동네가 없나요?\n정확한 동 이름을 입력해 주세요.'
                  : '동네를 선택하면 시작할 수 있어요.'}
            </p>
          </div>
        </div>
      </div>

      {/* Confirm button */}
      {selected && (
        <div className="w-full max-w-2xl">
          <button
            onClick={() => onSelect({ code: selected.code, name: selected.name })}
            className="w-full h-14 bg-[#3D7A5A] text-white font-mono text-label tracking-wider border border-[#3D7A5A] hover:bg-[#2C6A4B] transition-colors flex items-center justify-center gap-sm"
          >
            {selected.name} 선택하기
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      )}
    </div>
  );
}

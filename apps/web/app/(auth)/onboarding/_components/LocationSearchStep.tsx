'use client';

import { useState, useEffect, useRef } from 'react';
import { useLocationSearchQuery } from '@/shared/hooks/queries/useLocationSearchQuery';
import { Input } from '@/shared/components/ui/Input';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';

interface DongResult {
  code: string;
  name: string;
  sigunguCode: string;
  sidoCode: string;
}

interface LocationSearchStepProps {
  onSelect: (dong: { code: string; name: string }) => void;
}

export function LocationSearchStep({ onSelect }: LocationSearchStepProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selected, setSelected] = useState<DongResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(query.trim()), 300);
  }, [query]);

  const { data: results = [], isPending, isFetching } = useLocationSearchQuery(debouncedQuery);
  const loading = (isPending || isFetching) && debouncedQuery.length > 0;

  return (
    <div className="w-full flex flex-col items-center gap-xl">
      {/* Header */}
      <div className="w-full max-w-2xl text-center">
        <h1 className="font-mono text-display text-on-surface mb-md">
          활동할 동네를 입력해 주세요.
        </h1>
        <p className="font-sans text-body-md text-on-surface-variant mb-xl">
          근처 이웃들과 함께 작은 숲을 가꿔보세요.
        </p>

        {/* Search input */}
        <Input
          type="text"
          autoFocus
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
          leadingIcon={loading ? 'progress_activity' : 'search'}
          className="h-16 bg-surface-container-lowest"
          placeholder="동 이름으로 검색"
        />
      </div>

      {/* Results panel */}
      <div className="w-full max-w-2xl bg-surface border-2 border-outline shadow-island overflow-hidden">
        <div className="px-md py-sm border-b border-outline bg-surface-container flex justify-between items-center">
          <span className="font-mono text-label text-on-surface-variant uppercase">Search Results</span>
          {query && !loading && (
            <span className="font-mono text-label text-primary">
              {results.length} Areas Found
            </span>
          )}
        </div>

        {results.length > 0 && (
          <div className="divide-y divide-outline-variant">
            {results.map((dong) => {
              const isSelected = selected?.code === dong.code;
              return (
                <button
                  key={dong.code}
                  onClick={() => setSelected(dong)}
                  className={[
                    'w-full flex items-center justify-between p-md group cursor-pointer transition-colors duration-0',
                    isSelected ? 'bg-primary-container/20' : 'hover:bg-surface-container-high',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-md">
                    <span
                      className={[
                        'material-symbols-outlined',
                        isSelected ? 'text-primary-container' : 'text-on-surface-variant group-hover:text-primary',
                      ].join(' ')}
                      style={isSelected ? { fontVariationSettings: "'FILL' 1" } : undefined}
                    >
                      location_on
                    </span>
                    <div className="text-left">
                      <span
                        className={[
                          'font-mono text-headline block',
                          isSelected ? 'text-primary-container' : 'text-on-surface',
                        ].join(' ')}
                      >
                        {dong.name}
                      </span>
                      <div className="flex items-center gap-xs mt-1">
                        {isSelected && (
                          <Badge variant="primary" size="sm">SELECTED</Badge>
                        )}
                        <span className="font-mono text-label text-on-surface-variant">{dong.sigunguCode}</span>
                      </div>
                    </div>
                  </div>
                  <span
                    className={[
                      'material-symbols-outlined',
                      isSelected ? 'text-primary-container' : 'text-on-surface-variant group-hover:text-primary',
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
        <div className="p-xl text-center border-t border-outline">
          <div className="flex flex-col items-center gap-sm">
            <span className="material-symbols-outlined text-outline-variant text-4xl">forest</span>
            <p className="font-sans text-body-md text-on-surface-variant">
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
          <Button
            iconAfter="arrow_forward"
            className="w-full"
            onClick={() => onSelect({ code: selected.code, name: selected.name })}
          >
            {selected.name} 선택하기
          </Button>
        </div>
      )}
    </div>
  );
}

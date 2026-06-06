'use client';

import { useState } from 'react';
import { useLocationRegionsQuery } from '@/shared/hooks/queries/useLocationRegionsQuery';
import { Button } from '@/shared/components/ui/Button';

interface Props {
  selectedRegionKey: string | null;
  onSelect: (regionKey: string, regionName: string) => void;
  onReset: () => void;
}

export function RegionAccordion({ selectedRegionKey, onSelect, onReset }: Props) {
  const [open, setOpen] = useState(false);
  const { data: regions = [] } = useLocationRegionsQuery();

  const selectedRegionName = regions.find((r) => r.regionKey === selectedRegionKey)?.regionName ?? null;

  return (
    <div className="flex flex-col gap-xs relative">
      <div className="flex items-center gap-xs">
        <Button
          variant={open ? 'primary' : 'secondary'}
          size="sm"
          type="button"
          onClick={() => setOpen((v) => !v)}
        >
          지역 필터 {open ? '▴' : '▾'}
        </Button>

        {selectedRegionName && (
          <Button
            size="sm"
            type="button"
            onClick={onReset}
            iconAfter="close"
          >
            {selectedRegionName}
          </Button>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 z-10 w-48 max-h-[200px] overflow-y-auto border-2 border-outline shadow-island bg-surface">
          {regions.map((r) => (
            <Button
              key={r.regionKey}
              variant={r.regionKey === selectedRegionKey ? 'primary' : 'ghost'}
              size="sm"
              type="button"
              className="w-full text-left"
              onClick={() => {
                if (r.regionKey === selectedRegionKey) {
                  onReset();
                } else {
                  onSelect(r.regionKey, r.regionName);
                }
                setOpen(false);
              }}
            >
              {r.regionName}
            </Button>
          ))}
          {regions.length === 0 && (
            <p className="px-sm py-xs font-mono text-label text-on-surface-variant">불러오는 중...</p>
          )}
        </div>
      )}
    </div>
  );
}

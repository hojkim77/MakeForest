'use client';

import { useState, useEffect } from 'react';
import { API_PATHS } from '@/shared/lib/apiPaths';

interface RegionItem {
  regionKey: string;
  regionName: string;
}

interface Props {
  selectedRegionKey: string | null;
  onSelect: (regionKey: string, regionName: string) => void;
  onReset: () => void;
}

export function RegionAccordion({ selectedRegionKey, onSelect, onReset }: Props) {
  const [open, setOpen] = useState(false);
  const [regions, setRegions] = useState<RegionItem[]>([]);

  useEffect(() => {
    void fetch(API_PATHS.LOCATION_REGIONS())
      .then((r) => r.json() as Promise<RegionItem[]>)
      .then(setRegions)
      .catch(() => { });
  }, []);

  const selectedRegionName = regions.find((r) => r.regionKey === selectedRegionKey)?.regionName ?? null;

  return (
    <div className="flex flex-col gap-xs relative">
      <div className="flex items-center gap-xs">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`px-sm py-xs font-mono text-label border transition-colors ${open
            ? 'border-primary bg-primary-container text-on-primary-container'
            : 'border-outline-variant bg-surface-container text-on-surface-variant hover:bg-surface-variant'
            }`}
        >
          지역 필터 {open ? '▴' : '▾'}
        </button>

        {selectedRegionName && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-xs px-sm py-xs font-mono text-label border border-primary bg-primary-container text-on-primary-container"
          >
            {selectedRegionName}
            <span className="text-outline hover:text-error">×</span>
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 z-10 w-48 max-h-[200px] overflow-y-auto border border-outline-variant bg-surface-container">
          {regions.map((r) => (
            <button
              key={r.regionKey}
              type="button"
              onClick={() => {
                if (r.regionKey === selectedRegionKey) {
                  onReset();
                } else {
                  onSelect(r.regionKey, r.regionName);
                }
                setOpen(false);
              }}
              className={`w-full px-sm py-xs font-mono text-label text-left transition-colors ${r.regionKey === selectedRegionKey
                ? 'bg-primary-container text-on-primary-container'
                : 'text-on-surface hover:bg-surface-variant'
                }`}
            >
              {r.regionName}
            </button>
          ))}
          {regions.length === 0 && (
            <p className="px-sm py-xs font-mono text-label text-outline">불러오는 중...</p>
          )}
        </div>
      )}
    </div>
  );
}

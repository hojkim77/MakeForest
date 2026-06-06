'use client';

import { useState } from 'react';
import { Icon } from '@/shared/components/ui/Icon';

export function NeighborhoodSearch() {
  const [value, setValue] = useState('');

  return (
    <div className="flex items-center gap-xs border-2 border-outline shadow-island bg-surface focus-within:border-primary">
      <Icon name="search" size={18} className="ml-sm text-on-surface-variant shrink-0" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="동네 검색"
        className="flex-1 px-xs py-sm bg-transparent font-sans text-body-md text-on-surface placeholder:text-on-surface-variant outline-none"
      />
      {value && (
        <button
          onClick={() => setValue('')}
          className="pr-sm text-on-surface-variant"
          aria-label="지우기"
        >
          <Icon name="close" size={16} />
        </button>
      )}
    </div>
  );
}

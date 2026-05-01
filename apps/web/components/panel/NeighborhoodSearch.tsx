'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';

// interface NeighborhoodSearchProps {
//   onSelect: (dongCode: string, dongName: string) => void;
// }

/**
 * Neighborhood search bar.
 * Currently renders a text input placeholder — wire up to an API for autocomplete.
 */
export function NeighborhoodSearch() {
  const [value, setValue] = useState('');

  return (
    <div className="flex items-center gap-xs border border-outline-variant bg-surface-container-lowest focus-within:border-outline">
      <Icon name="search" size={18} className="ml-sm text-outline shrink-0" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="동네 검색"
        className="flex-1 px-xs py-sm bg-transparent font-sans text-body-md text-on-surface placeholder:text-outline outline-none"
      />
      {value && (
        <button
          onClick={() => setValue('')}
          className="pr-sm text-outline"
          aria-label="지우기"
        >
          <Icon name="close" size={16} />
        </button>
      )}
    </div>
  );
}

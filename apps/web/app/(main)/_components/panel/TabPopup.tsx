'use client';

interface TabPopupProps {
  children: React.ReactNode;
  anchor?: 'top' | 'bottom';
}

export function TabPopup({ children, anchor = 'top' }: TabPopupProps) {
  return (
    <div
      className={[
        'absolute w-64',
        'right-7 md:left-7 md:right-auto',
        'max-h-panel-tab md:max-h-panel-tab-md',
        'bg-surface border-2 border-outline shadow-island overflow-y-auto',
        anchor === 'bottom' ? 'bottom-0' : 'top-0',
      ].join(' ')}
    >
      {children}
    </div>
  );
}

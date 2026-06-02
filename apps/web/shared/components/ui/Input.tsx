import { Icon } from './Icon';
import { cn } from '@/shared/lib/cn';
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  leadingIcon?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, leadingIcon, error, className, ...rest }, ref) {
    const borderClass = error
      ? 'border border-error focus:border-error'
      : 'border border-outline-variant focus:border-primary';

    const paddingClass = leadingIcon ? 'pr-md pl-xl' : 'px-md';

    const inputElement = (
      <input
        ref={ref}
        className={cn(
          'w-full bg-surface py-sm font-mono text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none rounded disabled:opacity-40 disabled:cursor-not-allowed',
          borderClass,
          paddingClass,
          className,
        )}
        {...rest}
      />
    );

    if (!label && !leadingIcon && !error) {
      return inputElement;
    }

    return (
      <div className="flex flex-col gap-xs w-full">
        {label && (
          <label htmlFor={rest.id} className="font-mono text-label text-on-surface-variant">
            {label}
          </label>
        )}
        <div className="relative">
          {leadingIcon && (
            <div className="absolute inset-y-0 left-md flex items-center pointer-events-none">
              <Icon name={leadingIcon} size={18} className="text-on-surface-variant" />
            </div>
          )}
          {inputElement}
        </div>
        {error && <span className="font-mono text-label text-error">{error}</span>}
      </div>
    );
  },
);

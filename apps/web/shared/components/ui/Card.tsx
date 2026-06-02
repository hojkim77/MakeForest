import { cn } from '@/shared/lib/cn';
import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'low' | 'default' | 'high';
  border?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const variantClasses = {
  low: 'bg-surface-container-low',
  default: 'bg-surface-container',
  high: 'bg-surface-container-high',
};

const paddingClasses = {
  none: '',
  sm: 'p-sm',
  md: 'p-md',
  lg: 'p-lg',
};

export function Card({
  variant = 'default',
  border = false,
  padding = 'md',
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded',
        variantClasses[variant],
        paddingClasses[padding],
        border && 'border border-outline-variant',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

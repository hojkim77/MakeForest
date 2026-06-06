import { cn } from '@/shared/lib/cn';
import React from 'react';

interface BadgeProps {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md';
  className?: string;
  children: React.ReactNode;
}

const variantClasses = {
  default: 'bg-surface-container text-on-surface-variant border-2 border-outline',
  primary: 'bg-primary-container text-on-primary-container border-2 border-primary',
  success: 'bg-secondary-container text-on-secondary-container border-2 border-outline',
  warning: 'bg-tertiary-container text-on-tertiary-container border-2 border-outline',
  error: 'bg-error-container text-on-error-container border-2 border-error',
};

const sizeClasses = {
  sm: 'px-xs py-[2px] text-[10px] leading-none',
  md: 'px-sm py-xs text-label',
};

export function Badge({ variant = 'default', size = 'md', className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-mono',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
    >
      {children}
    </span>
  );
}

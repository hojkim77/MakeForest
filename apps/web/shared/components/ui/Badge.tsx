import { cn } from '@/shared/lib/cn';
import React from 'react';

interface BadgeProps {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md';
  className?: string;
  children: React.ReactNode;
}

const variantClasses = {
  default: 'bg-surface-container text-on-surface-variant border border-outline-variant',
  primary: 'bg-primary-container text-on-primary-container border border-primary-container',
  success: 'bg-secondary-container text-on-secondary-container border border-secondary-container',
  warning: 'bg-tertiary-container text-on-tertiary-container border border-tertiary-container',
  error: 'bg-error-container text-on-error-container border border-error-container',
};

const sizeClasses = {
  sm: 'px-xs py-[2px] text-[10px] leading-none',
  md: 'px-sm py-xs text-label',
};

export function Badge({ variant = 'default', size = 'md', className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-mono rounded',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
    >
      {children}
    </span>
  );
}

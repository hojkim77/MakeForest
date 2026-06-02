import { cn } from '@/shared/lib/cn';
import React from 'react';

export type TextVariant = 'display' | 'headline' | 'body-lg' | 'body-md' | 'label' | 'stat';
export type TextColor =
  | 'on-surface'
  | 'on-surface-variant'
  | 'primary'
  | 'error'
  | 'outline'
  | 'on-primary';

interface TextProps {
  variant?: TextVariant;
  color?: TextColor;
  as?: React.ElementType;
  className?: string;
  children?: React.ReactNode;
}

const variantClasses: Record<TextVariant, string> = {
  display: 'font-mono text-display',
  headline: 'font-mono text-headline',
  'body-lg': 'font-sans text-body-lg',
  'body-md': 'font-sans text-body-md',
  label: 'font-mono text-label',
  stat: 'font-mono text-pixel-stat',
};

const variantDefaultTag: Record<TextVariant, React.ElementType> = {
  display: 'p',
  headline: 'p',
  'body-lg': 'p',
  'body-md': 'p',
  label: 'span',
  stat: 'span',
};

const variantDefaultColor: Record<TextVariant, TextColor> = {
  display: 'on-surface',
  headline: 'on-surface',
  'body-lg': 'on-surface',
  'body-md': 'on-surface',
  label: 'on-surface-variant',
  stat: 'on-surface',
};

const colorClasses: Record<TextColor, string> = {
  'on-surface': 'text-on-surface',
  'on-surface-variant': 'text-on-surface-variant',
  primary: 'text-primary',
  error: 'text-error',
  outline: 'text-outline',
  'on-primary': 'text-on-primary',
};

export function Text({
  variant = 'body-md',
  color,
  as,
  className,
  children,
}: TextProps) {
  const Tag = as ?? variantDefaultTag[variant];
  const resolvedColor = color ?? variantDefaultColor[variant];

  return (
    <Tag
      className={cn(variantClasses[variant], colorClasses[resolvedColor], className)}
    >
      {children}
    </Tag>
  );
}

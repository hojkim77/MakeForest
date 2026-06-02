import { Icon } from './Icon';
import { cn } from '@/shared/lib/cn';
import Link from 'next/link';
import React from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface BaseProps {
  variant?: Variant;
  size?: Size;
  icon?: string;
  iconAfter?: string;
  loading?: boolean;
  className?: string;
  children?: React.ReactNode;
}

type ButtonElementProps = BaseProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps> & {
    href?: undefined;
  };

type LinkElementProps = BaseProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseProps | 'href'> & {
    href: string;
  };

export type ButtonProps = ButtonElementProps | LinkElementProps;

const variantClasses: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary border border-primary hover:bg-primary/90',
  secondary: 'bg-surface-container text-on-surface border border-outline-variant hover:bg-surface-container-high',
  ghost: 'bg-transparent text-on-surface-variant hover:bg-surface-container border border-transparent',
  danger: 'bg-error text-on-error border border-error hover:bg-error/90',
};

const sizeClasses: Record<Size, string> = {
  sm: 'py-xs px-sm text-label',
  md: 'py-sm px-md text-label',
  lg: 'py-sm px-lg text-body-md',
};

const iconSizeMap: Record<Size, number> = { sm: 14, md: 16, lg: 18 };

const baseClasses =
  'inline-flex items-center justify-center gap-xs font-mono rounded transition-none active:translate-y-px disabled:opacity-40 disabled:cursor-not-allowed';

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(props, ref) {
    const {
      variant = 'primary',
      size = 'md',
      icon,
      iconAfter,
      loading = false,
      className,
      children,
    } = props;

    const iconSize = iconSizeMap[size];
    const composedClassName = cn(baseClasses, variantClasses[variant], sizeClasses[size], className);

    const content = (
      <>
        {loading ? (
          <Icon name="progress_activity" size={iconSize} className="animate-spin" />
        ) : (
          icon && <Icon name={icon} size={iconSize} />
        )}
        {children}
        {!loading && iconAfter && <Icon name={iconAfter} size={iconSize} />}
      </>
    );

    if (typeof props.href === 'string') {
      const href: string = props.href;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { variant: _v, size: _s, icon: _i, iconAfter: _ia, loading: _l, className: _c, children: _ch, href: _href, ...anchorRest } = props;
      return (
        <Link href={href} className={composedClassName} {...(anchorRest as Record<string, unknown>)}>
          {content}
        </Link>
      );
    }

    const buttonProps = props as ButtonElementProps;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { variant: _v, size: _s, icon: _i, iconAfter: _ia, loading: _l, className: _c, children: _ch, type = 'button', disabled, ...buttonRest } = buttonProps;
    return (
      <button
        ref={ref}
        type={type}
        disabled={loading || disabled}
        className={composedClassName}
        {...buttonRest}
      >
        {content}
      </button>
    );
  },
);

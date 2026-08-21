import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export type LinkVariant = 'default' | 'nav';

export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: LinkVariant;
  active?: boolean;
  children: ReactNode;
}

const variantClass: Record<LinkVariant, string> = {
  default: 'link',
  nav: 'link link--nav',
};

export function Link({
  variant = 'default',
  active = false,
  className,
  children,
  'aria-current': ariaCurrent,
  ...rest
}: LinkProps) {
  return (
    <a
      className={cn(variantClass[variant], active && 'is-active', className)}
      aria-current={active ? 'page' : ariaCurrent}
      {...rest}
    >
      {children}
    </a>
  );
}

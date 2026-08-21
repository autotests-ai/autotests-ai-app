import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export type BadgeVariant = 'default' | 'primary';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: ReactNode;
}

const variantClass: Record<BadgeVariant, string> = {
  default: 'badge',
  primary: 'badge badge--primary',
};

export function Badge({ variant = 'default', className, children, ...rest }: BadgeProps) {
  return (
    <span className={cn(variantClass[variant], className)} {...rest}>
      {children}
    </span>
  );
}

import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export type StatusAs = 'p' | 'span';

export interface StatusProps extends HTMLAttributes<HTMLElement> {
  /** Root tag. Default `p` (template / intro); catalog demo-row → `span`. */
  as?: StatusAs;
  children: ReactNode;
}

/**
 * Inline phase/ADR pill (`p.status` / `span.status`). Thin wrapper — markup SSOT:
 * `design-system/templates/status.html` / `css/status.css`.
 * Catalog: `preview/primitives.html#section-status`.
 * No modifiers. No `role="status"`. `as="span"` → `<span class="status">`.
 * Not `Badge`, `Chip`, `StatusTile`, `ConnectionStatus`, `Text`.
 */
export function Status({
  as = 'p',
  className,
  children,
  ...rest
}: StatusProps) {
  const Component = as;

  return (
    <Component className={cn('status', className)} {...rest}>
      {children}
    </Component>
  );
}

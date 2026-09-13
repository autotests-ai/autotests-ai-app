import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export type StackGap = 'sm' | 'lg';

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  /** Gap token → `.stack--sm` (`--space-2`) / `.stack--lg` (`--space-6`). Omit → `--space-4`. */
  gap?: StackGap;
  /** Horizontal wrap → `.stack--row` (`flex-direction: row` + `flex-wrap: wrap`). */
  row?: boolean;
  children?: ReactNode;
}

/**
 * Flex stack (`div.stack`). Thin wrapper — markup SSOT:
 * `design-system/templates/stack.html` / `css/stack.css`.
 * Catalog: `preview/chrome.html#section-stack`.
 * Gap is class tokens only (not inline `style.gap`). Not `Grid`, `Section`,
 * `plaque-field-grid-stack`.
 */
export function Stack({
  gap,
  row = false,
  className,
  children,
  ...rest
}: StackProps) {
  return (
    <div
      className={cn(
        'stack',
        gap === 'sm' && 'stack--sm',
        gap === 'lg' && 'stack--lg',
        row && 'stack--row',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

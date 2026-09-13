import type { HTMLAttributes } from 'react';
import { cn } from './cn';

export interface PlaqueDividerProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** Horizontal 1px rule → `.plaque-divider--horizontal`. Default vertical. */
  horizontal?: boolean;
}

/**
 * Rule (`span.plaque-divider`). Thin wrapper — markup SSOT:
 * `design-system/templates/plaque-divider.html` / `css/plaque-divider.css`.
 * Catalog: `preview/fields.html#section-plaque-field`.
 * Always `aria-hidden`. Vertical default; `horizontal` → `--horizontal`.
 * Not sibling `border-*`. Not `PlaqueField` / `SelenoidMetrics`.
 */
export function PlaqueDivider({
  horizontal = false,
  className,
  ...rest
}: PlaqueDividerProps) {
  return (
    <span
      className={cn(
        'plaque-divider',
        horizontal && 'plaque-divider--horizontal',
        className,
      )}
      {...rest}
      aria-hidden="true"
    />
  );
}

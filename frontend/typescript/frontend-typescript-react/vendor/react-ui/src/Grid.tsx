import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export type GridLayout = 2 | 3 | 4 | '2x1' | '1x2';

export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Flow `2` / `3` / `4` → `.grid--2/--3/--4` (N columns, wrap).
   * Topology `'2x1'` / `'1x2'` → `.grid--2x1/--1x2` (exactly two slots).
   */
  layout: GridLayout;
  children?: ReactNode;
}

/**
 * CSS grid (`div.grid`). Thin wrapper — markup SSOT:
 * `design-system/templates/grid.html` / `css/grid.css`.
 * Catalog: `preview/chrome.html#section-grid`.
 * Gap is `--space-4` on `.grid` (not inline `style.gap`).
 * Mobile 1fr (≤768px) and sticky aside (`:has(.panel--sticky, .section--sticky)`)
 * are CSS — not JS. Not `Stack`, `Section`, `FieldCaption`, `Label`, `Text`,
 * `PlaqueFieldGrid`, `PlaqueFieldSegGrid`, `plaque-field-grid-stack`, `Panel`.
 */
export function Grid({ layout, className, children, ...rest }: GridProps) {
  return (
    <div className={cn('grid', `grid--${layout}`, className)} {...rest}>
      {children}
    </div>
  );
}

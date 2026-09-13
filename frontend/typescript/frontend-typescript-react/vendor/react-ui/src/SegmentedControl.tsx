import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export interface SegmentedControlProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/**
 * Two equal-width options (`.segmented-control`). Pair with `SegmentedControlBtn`.
 * Markup SSOT: `design-system/templates/segmented-control.html` / `css/segmented-control.css`.
 * Catalog: `preview/fields.html#section-segmented-control`.
 * Not `PlaqueFieldSeg` / `.plaque-field-check`, not `Tab`, not `Radio` / `Checkbox`.
 */
export function SegmentedControl({
  className,
  children,
  ...rest
}: SegmentedControlProps) {
  return (
    <div className={cn('segmented-control', className)} {...rest}>
      {children}
    </div>
  );
}

export interface SegmentedControlBtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Selected state → `.segmented-control__btn--active`. */
  active?: boolean;
  children: ReactNode;
}

/**
 * Segment trigger (`.segmented-control__btn` / `--active`). Thin wrapper — no
 * keyboard roving tabindex; host owns selection. 50/50 flex, min-height
 * `--control-height-md` (primitive CSS).
 */
export function SegmentedControlBtn({
  active = false,
  className,
  type = 'button',
  children,
  ...rest
}: SegmentedControlBtnProps) {
  return (
    <button
      type={type}
      className={cn(
        'segmented-control__btn',
        active && 'segmented-control__btn--active',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

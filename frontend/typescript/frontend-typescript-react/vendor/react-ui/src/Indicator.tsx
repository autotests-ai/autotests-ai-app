import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

/**
 * Semantic palette, Allure result aliases, macOS traffic-lights, and Allure 3
 * status-family swatches — CSS modifiers on `.indicator`.
 */
export type IndicatorTone =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'passed'
  | 'failed'
  | 'broken'
  | 'skipped'
  | 'unknown'
  | 'close'
  | 'minimize'
  | 'maximize'
  | 'status-red'
  | 'status-orange'
  | 'status-yellow'
  | 'status-purple'
  | 'status-gray'
  | 'status-green'
  | 'status-blue';

export interface IndicatorProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** Colour family → `.indicator--{tone}`. Defaults to `neutral` (muted token). */
  tone?: IndicatorTone;
  /** Full brightness → `.indicator--solid` (`--indicator-mix: 100%`). */
  solid?: boolean;
  /** Extra-dim → `.indicator--soft` (`--indicator-mix: 35%`). */
  soft?: boolean;
}

/**
 * Signal dot (`span.indicator`). Diameter `--indicator-size` (8px); default
 * mix 55% (same as `panel--content` bar dots). Markup SSOT:
 * `design-system/templates/indicator.html` / `css/indicator.css`.
 * Catalog: `preview/chrome.html#section-indicator`.
 * Not `.panel__dot`, not `WindowControl` / `window-control`, not `StatusTile` /
 * `Badge` / `ConnectionStatus`.
 */
export function Indicator({
  tone = 'neutral',
  solid = false,
  soft = false,
  className,
  ...rest
}: IndicatorProps) {
  return (
    <span
      className={cn(
        'indicator',
        `indicator--${tone}`,
        solid && 'indicator--solid',
        soft && 'indicator--soft',
        className,
      )}
      {...rest}
    />
  );
}

export interface IndicatorRowProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/**
 * Evenly spaced indicator cluster (`.indicator-row`). Default `aria-hidden`
 * matches the template panel-bar cluster. Gap is `--panel-dot-gap` in CSS.
 */
export function IndicatorRow({
  className,
  children,
  'aria-hidden': ariaHidden = true,
  ...rest
}: IndicatorRowProps) {
  return (
    <div
      className={cn('indicator-row', className)}
      aria-hidden={ariaHidden}
      {...rest}
    >
      {children}
    </div>
  );
}

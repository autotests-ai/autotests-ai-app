import { Children } from 'react';
import type { ReactNode } from 'react';
import { cn } from './cn';
import { usePlaqueFieldMagnet } from './usePlaqueFieldMagnet';

export type PlaqueFieldGridStackAlign = 'magnet' | 'hug';

export interface PlaqueFieldGridStackProps {
  /** Sibling `PlaqueFieldGrid` rows (optional host notes allowed). */
  children: ReactNode;
  /**
   * Divider alignment. `magnet` (default, config panels) →
   * `.plaque-field-grid-stack--magnet` + embed `usePlaqueFieldMagnet`.
   * `hug` → `.plaque-field-grid-stack--hug` zigzag, no magnet JS.
   * Not flex `Stack` (`.stack`).
   */
  align?: PlaqueFieldGridStackAlign;
  /** Magnet module path forwarded to `usePlaqueFieldMagnet`. */
  magnetScriptSrc?: string;
  /**
   * Re-sync magnet when this value changes (catalog load, conditional rows).
   * Defaults to the child count.
   */
  syncKey?: unknown;
  /** Accessible name for the stack. */
  'aria-label'?: string;
  className?: string;
  'data-testid'?: string;
}

/**
 * Sibling-row wrap for configurator plaque grids. Thin wrapper over
 * `.plaque-field-grid-stack` (`css/plaque-field.css`). Magnet measurement stays
 * SSOT in `js/plaque-field-magnet.js` via `usePlaqueFieldMagnet`. Prefer this
 * over a host `div` with raw stack classes, and over `stackMagnet` on a single
 * solo `PlaqueFieldGrid`.
 */
export function PlaqueFieldGridStack({
  children,
  align = 'magnet',
  magnetScriptSrc,
  syncKey,
  'aria-label': ariaLabel,
  className,
  'data-testid': testId,
}: PlaqueFieldGridStackProps) {
  const magnet = align === 'magnet';

  usePlaqueFieldMagnet({
    enabled: magnet,
    scriptSrc: magnetScriptSrc,
    syncKey: syncKey ?? Children.count(children),
  });

  return (
    <div
      className={cn(
        'plaque-field-grid-stack',
        magnet && 'plaque-field-grid-stack--magnet',
        align === 'hug' && 'plaque-field-grid-stack--hug',
        className,
      )}
      role={ariaLabel ? 'group' : undefined}
      aria-label={ariaLabel}
      data-testid={testId}
    >
      {children}
    </div>
  );
}

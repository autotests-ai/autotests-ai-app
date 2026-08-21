import { Children, isValidElement } from 'react';
import type { ReactNode } from 'react';
import { cn } from './cn';
import { usePlaqueFieldMagnet } from './usePlaqueFieldMagnet';

export interface PlaqueFieldSegGridProps {
  /** Grid cells — typically `PlaqueFieldSeg` fields. */
  children: ReactNode;
  /**
   * Remote-hub canon (`--mixed --pair`): max 2 per row, content-hug, no ellipsis
   * (skill `configurator-boolean`; 3 flags → 2 + 1). Off by default → dense
   * container-query grid (1 → 2 → 3 cols).
   */
  pair?: boolean;
  /** Wrap each child in `.plaque-field-grid__cell` (default true). */
  wrapCells?: boolean;
  /**
   * Mount the canonical magnet script to align dividers. Embed only — see
   * `usePlaqueFieldMagnet`. No effect on `--pair` (the magnet skips it).
   */
  magnet?: boolean;
  /** Magnet module path forwarded to `usePlaqueFieldMagnet`. */
  magnetScriptSrc?: string;
  /** Accessible group name for the batch. */
  'aria-label'?: string;
  className?: string;
  'data-testid'?: string;
}

/**
 * Dense grid of plaque-field seg cells. Thin wrapper over `.plaque-field-grid`:
 * maps children into `.plaque-field-grid__cell` slots and toggles the remote-hub
 * `--pair` canon. Divider alignment for stack layouts is delegated to the
 * embedded magnet (`magnet` → `usePlaqueFieldMagnet`), never re-implemented here.
 */
export function PlaqueFieldSegGrid({
  children,
  pair = false,
  wrapCells = true,
  magnet = false,
  magnetScriptSrc,
  'aria-label': ariaLabel,
  className,
  'data-testid': testId,
}: PlaqueFieldSegGridProps) {
  // Re-sync when the cell count changes so dynamically added/removed fields
  // realign (the magnet itself only self-inits on mount / resize).
  usePlaqueFieldMagnet({
    enabled: magnet,
    scriptSrc: magnetScriptSrc,
    syncKey: Children.count(children),
  });

  const cells = wrapCells
    ? Children.map(children, (child, index) =>
        isValidElement(child) ? (
          <div className="plaque-field-grid__cell" key={child.key ?? index}>
            {child}
          </div>
        ) : (
          child
        ),
      )
    : children;

  return (
    <div
      className={cn(
        'plaque-field-grid',
        pair && 'plaque-field-grid--mixed',
        pair && 'plaque-field-grid--pair',
        className,
      )}
      role={ariaLabel ? 'group' : undefined}
      aria-label={ariaLabel}
      data-testid={testId}
    >
      {cells}
    </div>
  );
}

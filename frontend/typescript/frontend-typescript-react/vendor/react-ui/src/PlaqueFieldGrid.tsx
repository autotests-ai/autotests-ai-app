import { Children, isValidElement } from 'react';
import type { ReactNode } from 'react';
import { cn } from './cn';
import { usePlaqueFieldMagnet } from './usePlaqueFieldMagnet';

export type PlaqueFieldGridLayout = 'pair' | 'duo' | 'solo';

export type PlaqueFieldGridCellSpan = 'sm' | 'md' | 'lg' | 'full';

export interface PlaqueFieldGridProps {
  /** Grid cells — any plaque fields (`PlaqueSelect`, `PlaqueFieldSeg`, `PlaqueTagstrip`, …). */
  children: ReactNode;
  /**
   * Row layout on the mixed 12-col grid (`configurator-option-presets#driver`):
   * `duo` (2 equal, default) · `solo` (1 full-width) · `pair` (remote-hub batch,
   * max 2/row content-hug).
   */
  layout?: PlaqueFieldGridLayout;
  /**
   * Span class on every wrapped cell (`__cell--sm|md|lg|full`). On mixed 12-col
   * rows `lg` also unlocks `--plaque-label-width-wide` (long param ids).
   * Ignored when `wrapCells` is false.
   */
  cellSpan?: PlaqueFieldGridCellSpan;
  /** Wrap each child in `.plaque-field-grid__cell` (default true). */
  wrapCells?: boolean;
  /**
   * Wrap the grid in a `.plaque-field-grid-stack--magnet` container and mount the
   * canonical magnet so label/divider columns align across sibling rows. Embed
   * only — see `usePlaqueFieldMagnet`.
   */
  stackMagnet?: boolean;
  /** Magnet module path forwarded to `usePlaqueFieldMagnet`. */
  magnetScriptSrc?: string;
  /** Accessible group name for the row. */
  'aria-label'?: string;
  className?: string;
  'data-testid'?: string;
}

/**
 * Configurator row grid. Thin wrapper over `.plaque-field-grid--mixed`: maps
 * children into `.plaque-field-grid__cell` slots and selects the row layout
 * (`--duo` / `--solo` / `--pair`). Unlike `PlaqueFieldSegGrid` the cells may be
 * any plaque field. Divider alignment across rows is delegated to the embedded
 * magnet (`stackMagnet` → `usePlaqueFieldMagnet`), never re-implemented here.
 */
export function PlaqueFieldGrid({
  children,
  layout = 'duo',
  cellSpan,
  wrapCells = true,
  stackMagnet = false,
  magnetScriptSrc,
  'aria-label': ariaLabel,
  className,
  'data-testid': testId,
}: PlaqueFieldGridProps) {
  usePlaqueFieldMagnet({
    enabled: stackMagnet,
    scriptSrc: magnetScriptSrc,
    syncKey: Children.count(children),
  });

  const cellClass = cn('plaque-field-grid__cell', cellSpan && `plaque-field-grid__cell--${cellSpan}`);

  const cells = wrapCells
    ? Children.map(children, (child, index) =>
        isValidElement(child) ? (
          <div className={cellClass} key={child.key ?? index}>
            {child}
          </div>
        ) : (
          child
        ),
      )
    : children;

  const grid = (
    <div
      className={cn(
        'plaque-field-grid',
        'plaque-field-grid--mixed',
        `plaque-field-grid--${layout}`,
        className,
      )}
      role={ariaLabel ? 'group' : undefined}
      aria-label={ariaLabel}
      data-testid={testId}
    >
      {cells}
    </div>
  );

  if (stackMagnet) {
    return (
      <div className="plaque-field-grid-stack plaque-field-grid-stack--magnet">{grid}</div>
    );
  }

  return grid;
}

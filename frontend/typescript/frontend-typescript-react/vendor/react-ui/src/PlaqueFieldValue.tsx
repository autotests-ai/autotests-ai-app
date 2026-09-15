import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export type PlaqueFieldValueAs = 'div' | 'label';

export interface PlaqueFieldValueProps
  extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /** Root tag. Catalog default `div`; wrap a hidden control → `label`. */
  as?: PlaqueFieldValueAs;
  /** Left slot → `.plaque-field__label` (catalog `testSuite`). */
  label: string;
  /** Right slot → `.plaque-field__value` (catalog `login`). */
  children: ReactNode;
  divided?: boolean;
  /** Fill the row (3-col grid). Catalog hug is off. */
  stretch?: boolean;
  /** `data-param-id` for wiring / e2e. */
  paramId?: string;
  /** Catalog / template id. Defaults to `plaque-field-value`. */
  'data-testid'?: string;
}

/**
 * Read-only divided plaque (`.plaque-field__value`, not an input). Canon:
 * `templates/plaque-field.html` `plaque-field-value` /
 * `preview/fields.html#section-plaque-field` (`testSuite` / `login`).
 * Default root is `div`. `as="label"` + children wraps a hidden control
 * (native file chrome is not a plaque slot — not a file primitive).
 * Thin wrapper — slots stay SSOT in `plaque-field.css`.
 * Not `PlaqueField` / `PlaqueNumber` / `PlaqueSelect` / `PlaqueFieldSeg`.
 */
export function PlaqueFieldValue({
  as = 'div',
  label,
  children,
  className,
  divided = true,
  stretch = false,
  paramId,
  'data-testid': testId = 'plaque-field-value',
  ...rest
}: PlaqueFieldValueProps) {
  const Component = as;

  return (
    <Component
      className={cn(
        'plaque-field',
        divided && 'plaque-field--divided',
        stretch && 'plaque-field--stretch',
        className,
      )}
      data-param-id={paramId}
      data-testid={testId}
      {...rest}
    >
      <span className="plaque-field__label" title={label}>
        {label}
      </span>
      {divided ? <span className="plaque-divider" aria-hidden="true" /> : null}
      <span className="plaque-field__value">{children}</span>
    </Component>
  );
}

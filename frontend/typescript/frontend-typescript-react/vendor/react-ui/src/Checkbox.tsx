import type { InputHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';
import { cn } from './cn';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  children: ReactNode;
  /** Catalog puts `data-testid` on the `<label class="checkbox">`, not the input. */
  'data-testid'?: string;
}

/**
 * Native checkbox (`label.checkbox` + `input.checkbox__input` + `<span>`).
 * Thin wrapper — markup SSOT: `design-system/templates/checkbox.html` / `css/checkbox.css`.
 * Catalog: `preview/primitives.html#section-checkbox`.
 * Not `PlaqueFieldSeg` (boolean 2-opt) and not `.plaque-field-check`.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { className, children, 'data-testid': testId, ...rest },
  ref,
) {
  return (
    <label className={cn('checkbox', className)} data-testid={testId}>
      <input ref={ref} type="checkbox" className="checkbox__input" {...rest} />
      <span>{children}</span>
    </label>
  );
});

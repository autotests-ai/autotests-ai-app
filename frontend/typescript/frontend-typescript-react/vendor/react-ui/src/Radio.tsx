import type { InputHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';
import { cn } from './cn';

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  children: ReactNode;
  /** Catalog puts `data-testid` on the `<label class="radio">`, not the input. */
  'data-testid'?: string;
}

/**
 * Native radio (`label.radio` + `input.radio__input` + `<span>`).
 * Thin wrapper — markup SSOT: `design-system/templates/radio.html` / `css/radio.css`.
 * Catalog: `preview/primitives.html#section-radio`. Group via shared `name`.
 * Not `radio-card` / `choice-card`, not `PlaqueFieldSeg`, not `Checkbox`.
 */
export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { className, children, 'data-testid': testId, ...rest },
  ref,
) {
  return (
    <label className={cn('radio', className)} data-testid={testId}>
      <input ref={ref} type="radio" className="radio__input" {...rest} />
      <span>{children}</span>
    </label>
  );
});

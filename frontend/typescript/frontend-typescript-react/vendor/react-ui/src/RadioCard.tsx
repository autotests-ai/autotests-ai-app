import type { HTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';
import { cn } from './cn';

export interface RadioGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Catalog heading — `h3.radio-group__title`. */
  title?: ReactNode;
  children: ReactNode;
}

/**
 * Radio-card group (`.radio-group` + `h3.radio-group__title` + `.stack.stack--sm`).
 * Thin wrapper — markup SSOT: `design-system/templates/radio-card.html` / `css/choice-card.css`.
 * Catalog: `preview/fields.html#section-radio-card`. Pair with `RadioCard`; cards share `name`.
 */
export function RadioGroup({
  title,
  className,
  children,
  ...rest
}: RadioGroupProps) {
  return (
    <div className={cn('radio-group', className)} {...rest}>
      {title != null ? <h3 className="radio-group__title">{title}</h3> : null}
      <div className="stack stack--sm">{children}</div>
    </div>
  );
}

export interface RadioCardProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  children: ReactNode;
  /** Catalog modifier → `.radio-card--muted`. Visual only; not `disabled`. */
  muted?: boolean;
  /** Catalog puts `data-testid` on the `<label class="radio-card">`, not the input. */
  'data-testid'?: string;
  /** Catalog input id, e.g. `radio-card-input-a`. */
  inputTestId?: string;
}

/**
 * Radio card (`label.radio-card` + `input.radio__input` + `.radio-card__body`).
 * Thin wrapper — markup SSOT: `design-system/templates/radio-card.html` / `css/choice-card.css`.
 * Input chrome stays `radio.css` (`.radio__input`). Catalog: `preview/fields.html#section-radio-card`.
 * Group via shared `name`. Not native `Radio`, not `Checkbox` / `checkbox-card`,
 * not `.plaque-field-check`, not `PlaqueFieldSeg`.
 */
export const RadioCard = forwardRef<HTMLInputElement, RadioCardProps>(function RadioCard(
  {
    className,
    children,
    muted = false,
    'data-testid': testId,
    inputTestId,
    ...rest
  },
  ref,
) {
  return (
    <label
      className={cn('radio-card', muted && 'radio-card--muted', className)}
      data-testid={testId}
    >
      <input
        ref={ref}
        type="radio"
        className="radio__input"
        data-testid={inputTestId}
        {...rest}
      />
      <div className="radio-card__body stack stack--sm">{children}</div>
    </label>
  );
});

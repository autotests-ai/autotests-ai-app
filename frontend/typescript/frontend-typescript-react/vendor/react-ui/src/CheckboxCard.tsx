import type { HTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';
import { cn } from './cn';

export interface CheckboxGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Catalog heading — `h3.checkbox-group__title`. */
  title?: ReactNode;
  children: ReactNode;
}

/**
 * Checkbox-card group (`.checkbox-group` + `h3.checkbox-group__title` + `.stack.stack--sm`).
 * Thin wrapper — markup SSOT: `design-system/templates/checkbox-card.html` / `css/choice-card.css`.
 * Catalog: `preview/fields.html#section-checkbox-card`. Pair with `CheckboxCard`; cards share `name` (multi-select).
 */
export function CheckboxGroup({
  title,
  className,
  children,
  ...rest
}: CheckboxGroupProps) {
  return (
    <div className={cn('checkbox-group', className)} {...rest}>
      {title != null ? <h3 className="checkbox-group__title">{title}</h3> : null}
      <div className="stack stack--sm">{children}</div>
    </div>
  );
}

export interface CheckboxCardProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  children: ReactNode;
  /** Catalog modifier → `.checkbox-card--muted`. Visual only; not `disabled`. */
  muted?: boolean;
  /** Catalog puts `data-testid` on the `<label class="checkbox-card">`, not the input. */
  'data-testid'?: string;
  /** Catalog input id, e.g. `checkbox-card-input-a`. */
  inputTestId?: string;
}

/**
 * Checkbox card (`label.checkbox-card` + `input.checkbox__input` + `.checkbox-card__body`).
 * Thin wrapper — markup SSOT: `design-system/templates/checkbox-card.html` / `css/choice-card.css`.
 * Input chrome stays `checkbox.css` (`.checkbox__input`). Catalog: `preview/fields.html#section-checkbox-card`.
 * Group via shared `name` (multi-select). Not native `Checkbox`, not `Radio` / `radio-card`,
 * not `.plaque-field-check`, not `PlaqueFieldSeg`.
 */
export const CheckboxCard = forwardRef<HTMLInputElement, CheckboxCardProps>(function CheckboxCard(
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
      className={cn('checkbox-card', muted && 'checkbox-card--muted', className)}
      data-testid={testId}
    >
      <input
        ref={ref}
        type="checkbox"
        className="checkbox__input"
        data-testid={inputTestId}
        {...rest}
      />
      <div className="checkbox-card__body stack stack--sm">{children}</div>
    </label>
  );
});

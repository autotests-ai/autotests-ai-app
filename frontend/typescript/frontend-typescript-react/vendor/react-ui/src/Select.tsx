import type { SelectHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { cn } from './cn';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  className?: string;
}

/**
 * Native `<select class="select">`. Thin wrapper —
 * markup SSOT: `design-system/templates/select.html` / `css/select.css`.
 * Catalog: `preview/primitives.html#section-select`.
 * Not `PlaqueSelect` (`select.plaque-field__control`).
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, children, ...rest },
  ref,
) {
  return (
    <select ref={ref} className={cn('select', className)} {...rest}>
      {children}
    </select>
  );
});

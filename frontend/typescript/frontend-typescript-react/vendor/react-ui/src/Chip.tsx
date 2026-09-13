import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Selected look → `.chip--active`. */
  active?: boolean;
  /**
   * Non-interactive label → `<span class="chip chip--static">`.
   * Catalog static example also sets `active` (`chip--active chip--static`).
   */
  static?: boolean;
  children: ReactNode;
}

/**
 * Interactive label (`.chip` / `.chip--active` / `.chip--static`). Thin wrapper —
 * markup SSOT: `design-system/templates/chip.html` / `css/chip.css`.
 * Catalog: `preview/primitives.html#section-chip`.
 */
export function Chip({
  active = false,
  static: isStatic = false,
  className,
  type = 'button',
  disabled,
  children,
  ...rest
}: ChipProps) {
  const classNames = cn(
    'chip',
    active && 'chip--active',
    isStatic && 'chip--static',
    className,
  );

  if (isStatic) {
    return (
      <span className={classNames} {...rest}>
        {children}
      </span>
    );
  }

  return (
    <button type={type} className={classNames} disabled={disabled} {...rest}>
      {children}
    </button>
  );
}

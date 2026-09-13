import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export interface TabsProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/**
 * Tab list (`.tabs`). Pair with `Tab`. Markup SSOT:
 * `design-system/templates/tab.html` / `css/tab.css`.
 */
export function Tabs({
  className,
  children,
  role = 'tablist',
  ...rest
}: TabsProps) {
  return (
    <div className={cn('tabs', className)} role={role} {...rest}>
      {children}
    </div>
  );
}

export interface TabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Selected state → `.tab--active` + `aria-selected`. */
  active?: boolean;
  children: ReactNode;
}

/**
 * Tab trigger (`.tab` / `.tab--active`). Thin wrapper — no keyboard roving
 * tabindex; host owns selection (configurator terminal / Capabilities).
 */
export function Tab({
  active = false,
  className,
  type = 'button',
  children,
  role = 'tab',
  'aria-selected': ariaSelected,
  ...rest
}: TabProps) {
  return (
    <button
      type={type}
      className={cn('tab', active && 'tab--active', className)}
      role={role}
      aria-selected={ariaSelected ?? active}
      {...rest}
    >
      {children}
    </button>
  );
}

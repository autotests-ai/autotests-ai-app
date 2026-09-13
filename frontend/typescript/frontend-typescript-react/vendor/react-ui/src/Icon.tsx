import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export interface IconProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** Glyph node (SVG). Sized by `.icon` (`--icon-size-md`, 18×18). */
  children: ReactNode;
}

/**
 * Glyph slot (`span.icon` + SVG). Thin wrapper — markup SSOT:
 * `design-system/templates/icon.html` / `css/icon.css`.
 * Catalog: `preview/primitives.html#section-icon`.
 * Always `aria-hidden`. No modifiers. SVG has no `width`/`height`.
 * Not `IconBtn`, not `Badge` / `Chip` / `Status`.
 */
export function Icon({ className, children, ...rest }: IconProps) {
  return (
    <span className={cn('icon', className)} {...rest} aria-hidden="true">
      {children}
    </span>
  );
}

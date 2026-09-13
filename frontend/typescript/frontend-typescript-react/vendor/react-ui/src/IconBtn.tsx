import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cn } from './cn';

type IconBtnOwnProps = {
  /** Glyph node (rendered inside `.icon`). */
  children: ReactNode;
  /** Accessible name — icon-only control (canon `templates/icon-btn.html`). */
  'aria-label': string;
};

export type IconBtnProps<C extends ElementType = 'button'> =
  IconBtnOwnProps &
    Omit<ComponentPropsWithoutRef<C>, keyof IconBtnOwnProps | 'as'> & {
      /** Render as another element — e.g. `<a>` or a router `Link`. Defaults to `button`. */
      as?: C;
    };

/**
 * Icon-only control: 36×36 hit area (`--control-height-md`), glyph in `.icon`
 * (`--icon-size-md`). Composes the `icon-btn` primitive.
 */
export function IconBtn<C extends ElementType = 'button'>({
  as,
  className,
  children,
  ...rest
}: IconBtnProps<C>) {
  const Component = (as ?? 'button') as ElementType;
  const buttonType = Component === 'button' ? { type: 'button' as const } : {};

  return (
    <Component {...buttonType} className={cn('icon-btn', className)} {...rest}>
      <span className="icon" aria-hidden="true">
        {children}
      </span>
    </Component>
  );
}

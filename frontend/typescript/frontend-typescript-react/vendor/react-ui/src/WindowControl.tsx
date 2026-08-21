import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cn } from './cn';

export type WindowControlTone = 'danger' | 'info' | 'success' | 'neutral';

type WindowControlOwnProps = {
  /** Signal-circle colour. Defaults to `neutral`. */
  tone?: WindowControlTone;
  /** Adds `vnc-window__session-control` (CSS-hidden until VNC is connected). */
  sessionControl?: boolean;
  /** Glyph node (rendered inside `.icon`). */
  children: ReactNode;
};

export type WindowControlProps<C extends ElementType = 'button'> =
  WindowControlOwnProps &
    Omit<ComponentPropsWithoutRef<C>, keyof WindowControlOwnProps | 'as'> & {
      /** Render as another element — e.g. a router `Link` for Back. Defaults to `button`. */
      as?: C;
    };

/**
 * Interactive VNC chrome control: 30×30 hit area, 15×15 signal circle, glyph
 * revealed on hover/focus. Composes the `window-control` primitive.
 */
export function WindowControl<C extends ElementType = 'button'>({
  as,
  tone = 'neutral',
  sessionControl,
  className,
  children,
  ...rest
}: WindowControlProps<C>) {
  const Component = (as ?? 'button') as ElementType;
  const buttonType = Component === 'button' ? { type: 'button' as const } : {};

  return (
    <Component
      {...buttonType}
      className={cn(
        'window-control',
        `window-control--${tone}`,
        sessionControl && 'vnc-window__session-control',
        className,
      )}
      {...rest}
    >
      <span className="icon" aria-hidden="true">
        {children}
      </span>
    </Component>
  );
}

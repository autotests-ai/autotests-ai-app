import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cn } from './cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonOwnProps = {
  variant?: ButtonVariant;
  block?: boolean;
  children: ReactNode;
};

export type ButtonProps<C extends ElementType = 'button'> =
  ButtonOwnProps &
    Omit<ComponentPropsWithoutRef<C>, keyof ButtonOwnProps | 'as'> & {
      /** Render as another element — e.g. `<a>` or a router `Link`. Defaults to `button`. */
      as?: C;
    };

const variantClass: Record<ButtonVariant, string> = {
  primary: 'btn--primary',
  secondary: 'btn--secondary',
  ghost: 'btn--ghost',
  danger: 'btn--danger',
};

export function Button<C extends ElementType = 'button'>({
  as,
  variant = 'primary',
  block = false,
  className,
  children,
  ...rest
}: ButtonProps<C>) {
  const Component = (as ?? 'button') as ElementType;
  const buttonType = Component === 'button' ? { type: 'button' as const } : {};

  return (
    <Component
      {...buttonType}
      className={cn('btn', variantClass[variant], block && 'btn--block', className)}
      {...rest}
    >
      {children}
    </Component>
  );
}

import type { AnchorHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { Badge, type BadgeProps } from './Badge';
import { Button, type ButtonProps } from './Button';
import { cn } from './cn';

export type SessionKillState = 'live' | 'finished';

export type SessionKillButtonProps = Omit<ButtonProps, 'variant' | 'children'> & {
  children?: ReactNode;
  'data-testid'?: string;
};

export type SessionKillFinishedProps = Omit<BadgeProps, 'variant' | 'children'> & {
  children?: ReactNode;
  'data-testid'?: string;
};

export type SessionKillCloseProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'children'
> & {
  children?: ReactNode;
  'data-testid'?: string;
};

export interface SessionKillProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Live Stop XOR finished FINISHED. Default `live`. */
  state?: SessionKillState;
  /** Stop session — `Button` danger. Ignored when `state="finished"`. */
  stop?: SessionKillButtonProps;
  /** Delete session — `Button` danger (artifacts). */
  delete?: SessionKillButtonProps;
  /** Close session window — `<a class="btn btn--secondary">`. Not `Link`. */
  close?: SessionKillCloseProps;
  /** FINISHED — `Badge` primary. Ignored when `state="live"`. */
  finished?: SessionKillFinishedProps;
  'data-testid'?: string;
}

/**
 * Session panel body actions (`div.session-info__actions`). Thin compose —
 * markup SSOT: `design-system/templates/session-kill.html`. Catalog:
 * `preview/session.html#section-session-kill`. Composes `Button` danger
 * (Stop / Delete) + `Badge` primary XOR FINISHED + `a.btn.btn--secondary`.
 * No `session-kill.css` (CSS already in `button.css` + `badge.css`). Not
 * `Panel.actions`, not `IconBtn`, not `Link`, not VNC chrome.
 */
export function SessionKill({
  state = 'live',
  stop,
  delete: deleteProps,
  close,
  finished,
  className,
  'data-testid': dataTestId,
  ...rest
}: SessionKillProps) {
  const isFinished = state === 'finished';
  const hostTestId =
    dataTestId ??
    (isFinished ? 'session-kill-chrome-finished' : 'session-kill-chrome');

  const {
    children: stopChildren,
    'data-testid': stopTestId,
    ...stopRest
  } = stop ?? {};
  const {
    children: deleteChildren,
    'data-testid': deleteTestId,
    ...deleteRest
  } = deleteProps ?? {};
  const {
    children: closeChildren,
    href: closeHref,
    className: closeClassName,
    'data-testid': closeTestId,
    ...closeRest
  } = close ?? {};
  const {
    children: finishedChildren,
    'data-testid': finishedTestId,
    ...finishedRest
  } = finished ?? {};

  return (
    <div
      className={cn('session-info__actions', className)}
      data-testid={hostTestId}
      {...rest}
    >
      {isFinished ? (
        <Badge
          {...finishedRest}
          variant="primary"
          data-testid={finishedTestId ?? 'session-finished'}
        >
          {finishedChildren ?? 'FINISHED'}
        </Badge>
      ) : (
        <Button
          type="button"
          {...stopRest}
          variant="danger"
          data-testid={stopTestId ?? 'session-stop'}
        >
          {stopChildren ?? 'Stop session'}
        </Button>
      )}
      <Button
        type="button"
        {...deleteRest}
        variant="danger"
        data-testid={
          deleteTestId ??
          (isFinished ? 'session-delete-finished' : 'session-delete')
        }
      >
        {deleteChildren ?? 'Delete session'}
      </Button>
      <a
        {...closeRest}
        className={cn('btn', 'btn--secondary', closeClassName)}
        href={closeHref ?? '/sessions'}
        data-testid={
          closeTestId ?? (isFinished ? 'session-close-finished' : 'session-close')
        }
      >
        {closeChildren ?? 'Close session window'}
      </a>
    </div>
  );
}

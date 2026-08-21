import type { CSSProperties, ReactNode } from 'react';
import { cn } from './cn';
import { ConnectionStatus, type ConnectionState } from './ConnectionStatus';
import { WindowControl } from './WindowControl';
import {
  IconChevronDown,
  IconChevronUp,
  IconClose,
  IconLock,
  IconTrash,
  IconUnlock,
  IconUpload,
  IconVncCopy,
} from './vnc-icons';

export type VncWindowState = ConnectionState;

export interface VncWindowLabels {
  back: string;
  lock: string;
  unlock: string;
  enterFullscreen: string;
  exitFullscreen: string;
  copy: string;
  paste: string;
  /** Destructive: DELETE session / kill container. */
  kill: string;
  /** Panel name in the bar. */
  title: string;
  /** Locked screen — watch only. */
  view: string;
  /** Unlocked screen — interactive. */
  control: string;
}

/** Remote desktop pixels — drives flexible screen `aspect-ratio` via `--vnc-aspect`. */
export interface VncScreenSize {
  width: number;
  height: number;
}

const defaultLabels: VncWindowLabels = {
  back: 'Back',
  lock: 'Lock screen',
  unlock: 'Unlock screen',
  enterFullscreen: 'Enter fullscreen',
  exitFullscreen: 'Exit fullscreen',
  copy: 'Copy from Selenoid',
  paste: 'Paste to Selenoid',
  kill: 'Kill container',
  title: 'VNC window',
  view: 'view',
  control: 'control',
};

export interface VncWindowProps {
  /** VNC lifecycle state driving chrome + width collapse. */
  state: VncWindowState;
  /** Expands the frame + panel to fill the positioned parent. */
  fullscreen?: boolean;
  /** Screen is interactive (lock open) — swaps the lock glyph. */
  unlocked?: boolean;
  /**
   * Remote desktop size (e.g. from `screenResolution`). Sets `--vnc-aspect` so
   * the screen height follows width × W/H instead of a fixed px. Default CSS: 16/9.
   */
  screenSize?: VncScreenSize;
  /**
   * Custom Back control — e.g. a router `Link`. When omitted a `button` firing
   * `onBack` is rendered. Compose with `WindowControl as={Link} tone="danger"`.
   */
  back?: ReactNode;
  /**
   * Custom kill control. When omitted and `onKill` is set, a stop
   * `WindowControl` is rendered in the actions cluster.
   */
  kill?: ReactNode;
  onBack?: () => void;
  onToggleLock?: () => void;
  onToggleFullscreen?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  /** DELETE /wd/hub/session/{id} — shown only when set (or `kill` node). */
  onKill?: () => void;
  /** noVNC mount slot (rendered inside `.vnc-window__screen-mount`). */
  children?: ReactNode;
  labels?: Partial<VncWindowLabels>;
  className?: string;
  'data-testid'?: string;
  titleTestId?: string;
}

/**
 * Selenoid VNC window: base panel + chrome (back, connection status, lock,
 * fullscreen, clipboard) over a black noVNC screen. Composes the `vnc-window`
 * primitive with `WindowControl` / `ConnectionStatus`.
 */
export function VncWindow({
  state,
  fullscreen = false,
  unlocked = false,
  screenSize,
  back,
  kill,
  onBack,
  onToggleLock,
  onToggleFullscreen,
  onCopy,
  onPaste,
  onKill,
  children,
  labels,
  className,
  'data-testid': dataTestId = 'vnc-window',
  titleTestId = 'vnc-window-title',
}: VncWindowProps) {
  const l = { ...defaultLabels, ...labels };
  const titleText =
    state === 'connected' ? `${l.title} (${unlocked ? l.control : l.view})` : l.title;
  const aspectStyle =
    screenSize && screenSize.width > 0 && screenSize.height > 0
      ? ({
          ['--vnc-aspect']: `${screenSize.width} / ${screenSize.height}`,
        } as CSSProperties)
      : undefined;

  const backControl = back ?? (
    <WindowControl tone="danger" aria-label={l.back} title={l.back} onClick={onBack}>
      <IconClose />
    </WindowControl>
  );

  const killControl =
    kill ??
    (onKill ? (
      <WindowControl
        tone="danger"
        sessionControl
        aria-label={l.kill}
        title={l.kill}
        onClick={onKill}
      >
        <IconTrash />
      </WindowControl>
    ) : null);

  return (
    <div className={cn('vnc-window-frame', fullscreen && 'vnc-window-frame--fullscreen')}>
      <div
        className={cn(
          'panel',
          'panel--vnc',
          'vnc-window',
          `vnc-window--${state}`,
          fullscreen && 'vnc-window--fullscreen',
          className,
        )}
        style={aspectStyle}
        data-state={state}
        data-testid={dataTestId}
        role="region"
        aria-label={titleText}
      >
        <div className="panel__bar">
          <div className="vnc-window__controls">
            {backControl}
            <ConnectionStatus state={state} />
            {state !== 'connected' ? (
              <span className="vnc-window__status-label" aria-hidden="true">
                {state}
              </span>
            ) : null}
            <WindowControl
              tone="info"
              sessionControl
              aria-label={unlocked ? l.lock : l.unlock}
              title={unlocked ? l.lock : l.unlock}
              onClick={onToggleLock}
            >
              {unlocked ? <IconUnlock /> : <IconLock />}
            </WindowControl>
            <WindowControl
              tone="success"
              sessionControl
              aria-label={fullscreen ? l.exitFullscreen : l.enterFullscreen}
              title={fullscreen ? l.exitFullscreen : l.enterFullscreen}
              onClick={onToggleFullscreen}
            >
              {fullscreen ? <IconChevronDown /> : <IconChevronUp />}
            </WindowControl>
          </div>
          <span className="panel__title vnc-window__title" data-testid={titleTestId}>
            {titleText}
          </span>
          <div className="vnc-window__actions">
            {killControl}
            <WindowControl tone="neutral" aria-label={l.copy} title={l.copy} onClick={onCopy}>
              <IconVncCopy />
            </WindowControl>
            <WindowControl tone="neutral" aria-label={l.paste} title={l.paste} onClick={onPaste}>
              <IconUpload />
            </WindowControl>
          </div>
        </div>
        <div className="vnc-window__screen">
          <div className="vnc-window__screen-mount" aria-label="noVNC mount point">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

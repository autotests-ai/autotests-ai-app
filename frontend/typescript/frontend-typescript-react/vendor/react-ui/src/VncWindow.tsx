import type { CSSProperties, ReactNode } from 'react';
import { cn } from './cn';
import type { ConnectionState } from './ConnectionStatus';
import { IconDownload } from './panel-icons';
import {
  IconClose,
  IconCopyIn,
  IconCopyOut,
  IconFullscreen,
  IconFullscreenExit,
  IconLock,
  IconTrash,
  IconUnlock,
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
  download: string;
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
  copy: 'Copy from session',
  paste: 'Paste into session',
  download: 'Download',
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
   * Optional Back/close control. Omitted unless `back` or `onBack` is set —
   * session close lives on the Session panel, not VNC chrome.
   */
  back?: ReactNode;
  /**
   * Custom kill control. When omitted and `onKill` is set, a stop
   * icon-btn is rendered in the actions cluster.
   */
  kill?: ReactNode;
  onBack?: () => void;
  onToggleLock?: () => void;
  onToggleFullscreen?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  /** Artifact download (session video). Shown only when set. */
  onDownload?: () => void;
  /** DELETE /wd/hub/session/{id} — shown only when set (or `kill` node). */
  onKill?: () => void;
  /** noVNC mount slot (rendered inside `.vnc-window__screen-mount`). */
  children?: ReactNode;
  labels?: Partial<VncWindowLabels>;
  className?: string;
  'data-testid'?: string;
  titleTestId?: string;
}

function VncBarAction({
  label,
  sessionControl,
  onClick,
  testId,
  children,
}: {
  label: string;
  sessionControl?: boolean;
  onClick?: () => void;
  testId?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn('icon-btn', 'panel__action', sessionControl && 'vnc-window__session-control')}
      aria-label={label}
      title={label}
      data-testid={testId}
      onClick={onClick}
    >
      <span className="icon" aria-hidden="true">
        {children}
      </span>
    </button>
  );
}

/**
 * Selenoid VNC window: terminal panel chrome (dots + title + icon-btn actions)
 * over a black noVNC screen. Close/back is opt-in (`back` / `onBack`).
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
  onDownload,
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

  const backControl =
    back !== undefined
      ? back
      : onBack
        ? (
            <VncBarAction label={l.back} onClick={onBack}>
              <IconClose />
            </VncBarAction>
          )
        : null;

  const killControl =
    kill ??
    (onKill ? (
      <VncBarAction label={l.kill} sessionControl onClick={onKill}>
        <IconTrash />
      </VncBarAction>
    ) : null);

  return (
    <div className={cn('vnc-window-frame', fullscreen && 'vnc-window-frame--fullscreen')}>
      <div
        className={cn(
          'panel',
          'panel--terminal',
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
          <div className="panel__dots" aria-hidden="true">
            <span className="panel__dot" />
            <span className="panel__dot" />
            <span className="panel__dot" />
          </div>
          <div className="panel__trail">
            <span className="panel__title vnc-window__title" data-testid={titleTestId}>
              {titleText}
            </span>
            {state !== 'connected' ? (
              <span className="vnc-window__status-label" aria-hidden="true">
                {state}
              </span>
            ) : null}
          </div>
          <div className="panel__actions vnc-window__actions">
            {backControl}
            <VncBarAction
              label={unlocked ? l.lock : l.unlock}
              sessionControl
              onClick={onToggleLock}
            >
              {unlocked ? <IconUnlock /> : <IconLock />}
            </VncBarAction>
            {killControl}
            <VncBarAction label={l.copy} sessionControl onClick={onCopy}>
              <IconCopyOut />
            </VncBarAction>
            <VncBarAction label={l.paste} sessionControl onClick={onPaste}>
              <IconCopyIn />
            </VncBarAction>
            <VncBarAction
              label={fullscreen ? l.exitFullscreen : l.enterFullscreen}
              sessionControl
              onClick={onToggleFullscreen}
            >
              {fullscreen ? <IconFullscreenExit /> : <IconFullscreen />}
            </VncBarAction>
            {onDownload ? (
              <VncBarAction label={l.download} testId="vnc-window-download" onClick={onDownload}>
                <IconDownload />
              </VncBarAction>
            ) : null}
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

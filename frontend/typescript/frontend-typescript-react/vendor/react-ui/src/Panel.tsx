import type { ReactNode } from 'react';
import { useLayoutEffect, useRef } from 'react';
import { cn } from './cn';

export type PanelVariant = 'content' | 'terminal';
export type PanelTone = 'dark' | 'light';
/** `bottom` (default) — foot under body; `rail` — foot as right column (`.panel--foot-rail`). */
export type PanelFootPlacement = 'bottom' | 'rail';

/**
 * Terminal / panel bar action — **icon-only** canon.
 * Renders as `.icon-btn.panel__action` (no visible text, no bordered `.btn`).
 * `label` is a11y-only (`aria-label` + `title`). Glyphs: `IconReset` /
 * `IconDownload` / `IconCopy` (`panel-icons.tsx` ↔ `templates/icon-*.html`).
 */
export interface PanelAction {
  /** Icon glyph rendered inside the `icon-btn` (`.icon` slot). */
  icon: ReactNode;
  /** Accessible name for the icon-only button (`aria-label` + `title`). Not rendered as text. */
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  'data-testid'?: string;
}

export interface PanelProps {
  /**
   * Bar title (`.panel__title`). Optional when `trail` carries the primary
   * chrome (e.g. terminal format tabs) — configurator / Capabilities pattern.
   */
  title?: ReactNode;
  children: ReactNode;
  /**
   * Chrome mode. `content` (default) → warm `panel--content` body shell;
   * `terminal` → dark `panel--terminal` (indicator dots, output actions).
   * Terminal children should be `.panel__code.ch-code` + highlighted HTML
   * (`highlightOutput` / RAG `cfg-terminal-highlight`); body pad is zeroed in CSS.
   */
  variant?: PanelVariant;
  /**
   * Terminal output tone. Only applies when `variant="terminal"`.
   * `dark` (default) → `#1a1917`; `light` → `panel--terminal-light` paper.
   * Independent of `html.theme-light`.
   */
  tone?: PanelTone;
  /**
   * Optional content inside `.panel__trail` after the title — canonical slot for
   * terminal format tabs (`.tabs` / `.tab` / `.tab--active`) in the bar.
   */
  trail?: ReactNode;
  /**
   * Optional footer (`.panel__foot`) — e.g. language tabs. Placement via
   * `footPlacement` (`bottom` under body, or `rail` as a right column).
   */
  foot?: ReactNode;
  /**
   * Where to render `foot`. `bottom` (default) → under body; `rail` →
   * `.panel--foot-rail` (tabs top→bottom on the right, ≥769px).
   */
  footPlacement?: PanelFootPlacement;
  /**
   * Optional bar-end meta before actions (canonical `.panel__bar-end` —
   * editable `vector#` fingerprint). Sibling of `.panel__actions` (not a
   * wrapper around them).
   */
  barEnd?: ReactNode;
  /**
   * Optional bar actions — **icon-only** `panel__action icon-btn` cluster
   * in order **Reset → Download → Copy** (no text labels, no bordered `.btn`).
   * Direct child of `.panel__bar`. Prefer `IconReset` / `IconDownload` /
   * `IconCopy` (`panel-icons.tsx` ↔ `templates/icon-*.html`).
   * Content-driven wrap: `.panel__bar--wrap` keeps dots + hash + actions on
   * band 1 when tabs move to band 2; `.panel__bar--wrap-meta` drops hash only
   * when it bumps into dots.
   */
  actions?: PanelAction[];
  testId?: string;
  titleTestId?: string;
  bodyClassName?: string;
  hidden?: boolean;
  className?: string;
}

const WRAP = 'panel__bar--wrap';
const WRAP_META = 'panel__bar--wrap-meta';
const SLACK_ENTER = 1;
const SLACK_EXIT = 24;

function requiredWidth(parts: number[], gap: number, pad: number): number {
  return parts.reduce((sum, w) => sum + w, 0) + (parts.length - 1) * gap + pad;
}

function gapPx(styles: CSSStyleDeclaration): number {
  const raw = styles.columnGap || styles.gap || '0';
  return parseFloat(String(raw).split(' ')[0]) || 0;
}

/**
 * Intrinsic one-row tabs width. Avoid tabs.scrollWidth — wrap sets width:100%
 * and scrollWidth ≈ bar width, so unwrap never fires.
 */
function tabsRowWidth(tabs: Element): number {
  const kids = tabs.children;
  const n = kids.length;
  if (!n) return 0;
  let w = 0;
  for (let i = 0; i < n; i++) w += (kids[i] as HTMLElement).offsetWidth;
  const gap = gapPx(getComputedStyle(tabs));
  if (n > 1) w += (n - 1) * gap;
  return w;
}

function hysteretic(enter: boolean, exit: boolean, currentlyOn: boolean): boolean {
  return currentlyOn ? exit : enter;
}

function panelBarMeasure(bar: HTMLElement) {
  const dots = bar.querySelector(':scope > .panel__dots');
  const trail = bar.querySelector(':scope > .panel__trail');
  const tabs = trail?.querySelector(':scope > .tabs');
  if (!dots || !tabs) return null;

  const available = bar.clientWidth;
  if (available <= 0) return null;

  const meta = bar.querySelector(':scope > .panel__bar-end');
  const actionsEl = bar.querySelector(':scope > .panel__actions');
  const styles = getComputedStyle(bar);
  const pad =
    (parseFloat(styles.paddingLeft) || 0) + (parseFloat(styles.paddingRight) || 0);
  const gap = gapPx(styles);

  const chrome = [(dots as HTMLElement).offsetWidth];
  if (meta) chrome.push((meta as HTMLElement).offsetWidth);
  if (actionsEl) chrome.push((actionsEl as HTMLElement).offsetWidth);

  const full = chrome.slice();
  full.splice(1, 0, tabsRowWidth(tabs));

  return { available, pad, gap, chrome, full, hasMeta: Boolean(meta) };
}

function syncPanelBarWrap(bar: HTMLElement | null) {
  if (!bar?.querySelector(':scope > .panel__trail > .tabs')) return;
  const m = panelBarMeasure(bar);
  if (!m) return;

  const metaNext = m.hasMeta
    ? hysteretic(
        requiredWidth(m.chrome, m.gap, m.pad) > m.available + SLACK_ENTER,
        requiredWidth(m.chrome, m.gap, m.pad) > m.available - SLACK_EXIT,
        bar.classList.contains(WRAP_META),
      )
    : false;
  const wrapNext =
    metaNext ||
    hysteretic(
      requiredWidth(m.full, m.gap, m.pad) > m.available + SLACK_ENTER,
      requiredWidth(m.full, m.gap, m.pad) > m.available - SLACK_EXIT,
      bar.classList.contains(WRAP),
    );

  if (bar.classList.contains(WRAP) !== wrapNext) bar.classList.toggle(WRAP, wrapNext);
  if (bar.classList.contains(WRAP_META) !== metaNext) {
    bar.classList.toggle(WRAP_META, metaNext);
  }
}

export function Panel({
  title,
  children,
  variant = 'content',
  tone = 'dark',
  trail,
  foot,
  footPlacement = 'bottom',
  barEnd,
  actions,
  testId,
  titleTestId,
  bodyClassName,
  hidden,
  className,
}: PanelProps) {
  const hasActions = Boolean(actions && actions.length > 0);
  const barRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    syncPanelBarWrap(bar);
    if (typeof ResizeObserver === 'undefined') return;
    let raf = 0;
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        syncPanelBarWrap(bar);
      });
    };
    const ro = new ResizeObserver(schedule);
    ro.observe(bar);
    const panel = bar.closest('.panel');
    if (panel) ro.observe(panel);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [trail, barEnd, actions, title]);

  return (
    <div
      className={cn(
        'panel',
        `panel--${variant}`,
        variant === 'terminal' && tone === 'light' && 'panel--terminal-light',
        foot != null && footPlacement === 'rail' && 'panel--foot-rail',
        className,
      )}
      data-testid={testId}
      hidden={hidden}
    >
      <div className="panel__bar" ref={barRef}>
        <div className="panel__dots" aria-hidden="true">
          <span className="panel__dot" />
          <span className="panel__dot" />
          <span className="panel__dot" />
        </div>
        <div className="panel__trail">
          {title != null && title !== '' ? (
            <span className="panel__title" data-testid={titleTestId}>
              {title}
            </span>
          ) : null}
          {trail}
        </div>
        {barEnd != null ? <div className="panel__bar-end">{barEnd}</div> : null}
        {hasActions ? (
          <div className="panel__actions">
            {actions!.map((action, index) => (
              <button
                key={action['data-testid'] ?? `${action.label}-${index}`}
                type="button"
                className="icon-btn panel__action"
                aria-label={action.label}
                title={action.label}
                disabled={action.disabled}
                data-testid={action['data-testid']}
                onClick={action.onClick}
              >
                <span className="icon" aria-hidden="true">
                  {action.icon}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className={cn('panel__body', bodyClassName)}>{children}</div>
      {foot != null ? <div className="panel__foot">{foot}</div> : null}
    </div>
  );
}

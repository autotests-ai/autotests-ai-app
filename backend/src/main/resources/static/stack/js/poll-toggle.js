/**
 * Poll toggle — header/tools control for auto-refresh (default 5s).
 * Markup mirrors templates/poll-toggle.html; timer is owned by the binder.
 */

export const POLL_DEFAULT_MS = 5000;

/** @param {number} ms */
export function formatPollLabel(ms) {
  const safe = Number.isFinite(ms) && ms > 0 ? Math.round(ms) : POLL_DEFAULT_MS;
  if (safe % 1000 === 0) return `${safe / 1000}s`;
  return `${safe}ms`;
}

const REFRESH_ICON = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 12a9 9 0 1 1-2.64-6.36"/>
    <path d="M21 3v6h-6"/>
  </svg>
`;

/**
 * @param {{ intervalMs?: number, on?: boolean, testid?: string }} [options]
 * @returns {string}
 */
export function pollToggleMarkup(options = {}) {
  const intervalMs = options.intervalMs ?? POLL_DEFAULT_MS;
  const on = options.on !== false;
  const testid = options.testid || 'poll-toggle';
  const label = formatPollLabel(intervalMs);
  const pressed = on ? 'true' : 'false';
  const aria = on
    ? `Stop auto-refresh (${label})`
    : `Start auto-refresh (${label})`;
  const onClass = on ? ' poll-toggle--on' : '';
  return `
<span class="poll-toggle${onClass}" data-testid="${testid}">
  <button
    type="button"
    class="icon-btn"
    data-testid="${testid}-btn"
    aria-pressed="${pressed}"
    aria-label="${aria}"
    data-poll-ms="${intervalMs}"
  >
    <span class="icon" aria-hidden="true">${REFRESH_ICON}</span>
  </button>
  <span class="poll-toggle__label" data-testid="${testid}-label" aria-hidden="true">${label}</span>
</span>`.trim();
}

/**
 * @param {ParentNode} container
 * @param {{
 *   intervalMs?: number,
 *   defaultOn?: boolean,
 *   onTick?: () => void,
 *   testid?: string,
 * }} [options]
 * @returns {() => void} dispose
 */
export function mountPollToggle(container, options = {}) {
  const intervalMs = options.intervalMs ?? POLL_DEFAULT_MS;
  const testid = options.testid || 'poll-toggle';
  let on = options.defaultOn !== false;
  /** @type {ReturnType<typeof setInterval> | null} */
  let timer = null;

  container.innerHTML = pollToggleMarkup({ intervalMs, on, testid });
  const root = container.querySelector('.poll-toggle');
  const btn = container.querySelector(`[data-testid="${testid}-btn"]`);
  if (!root || !btn) {
    return () => {};
  }

  const label = formatPollLabel(intervalMs);

  function clearTimer() {
    if (timer != null) {
      clearInterval(timer);
      timer = null;
    }
  }

  function sync() {
    root.classList.toggle('poll-toggle--on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute(
      'aria-label',
      on ? `Stop auto-refresh (${label})` : `Start auto-refresh (${label})`,
    );
    clearTimer();
    if (on) {
      timer = setInterval(() => {
        options.onTick?.();
      }, intervalMs);
    }
  }

  /** @param {Event} event */
  function onClick(event) {
    event.preventDefault();
    on = !on;
    sync();
    if (on) {
      options.onTick?.();
    }
  }

  btn.addEventListener('click', onClick);
  sync();

  return () => {
    btn.removeEventListener('click', onClick);
    clearTimer();
  };
}

/**
 * Mount into `[data-testid="header-tools"]` (leading icon, same gap as siblings).
 * @param {{
 *   intervalMs?: number,
 *   defaultOn?: boolean,
 *   onTick?: () => void,
 *   testid?: string,
 *   toolsSelector?: string,
 * }} [options]
 * @returns {() => void} dispose
 */
export function mountHeaderPollToggle(options = {}) {
  const testid = options.testid || 'header-poll-toggle';
  const selector = options.toolsSelector || '[data-testid="header-tools"]';
  const tools = document.querySelector(selector);
  if (!tools) {
    return () => {};
  }

  tools.querySelector(`[data-testid="${testid}"]`)?.remove();

  const host = document.createElement('div');
  const disposeInner = mountPollToggle(host, {
    intervalMs: options.intervalMs,
    defaultOn: options.defaultOn,
    onTick: options.onTick,
    testid,
  });
  const node = host.firstElementChild;
  if (!node) {
    disposeInner();
    return () => {};
  }
  tools.prepend(node);

  return () => {
    disposeInner();
    node.remove();
  };
}

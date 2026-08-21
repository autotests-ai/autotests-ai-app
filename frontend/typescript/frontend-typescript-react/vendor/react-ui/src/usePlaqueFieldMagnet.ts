import { useEffect } from 'react';

declare global {
  interface Window {
    /** Published by the canonical design-system `js/plaque-field-magnet.js`. */
    syncPlaqueMagnetStacks?: (root?: ParentNode) => void;
  }
}

export interface UsePlaqueFieldMagnetOptions {
  /** Skip mounting/re-syncing when false (e.g. content-hug `--pair` grids). */
  enabled?: boolean;
  /** Path to the canonical magnet module served by the host. */
  scriptSrc?: string;
  /**
   * Re-run `syncPlaqueMagnetStacks` when this value changes — pass a signal that
   * tracks the rendered fields (e.g. cell count) so dynamically added/removed
   * rows realign. The magnet self-inits on mount/resize only.
   */
  syncKey?: unknown;
}

const EMBED_MARKER = 'data-plaque-magnet-embed';

/**
 * Embed hook for the canonical plaque-field magnet. The divider-alignment logic
 * (measure label / control, cap columns, ResizeObserver) stays SSOT in
 * `js/plaque-field-magnet.js` (`projects/design-system-home/design-system/`) —
 * this hook only injects the script once and re-runs `syncPlaqueMagnetStacks`
 * after mount. It deliberately does **not** re-implement the measurement in
 * React. Note the magnet intentionally skips `.plaque-field-grid--pair`
 * (content-hug), so it only affects `plaque-field-grid-stack` /
 * `plaque-field-panel-stack` layouts.
 */
export function usePlaqueFieldMagnet({
  enabled = true,
  scriptSrc = '/js/plaque-field-magnet.js',
  syncKey,
}: UsePlaqueFieldMagnetOptions = {}): void {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }

    if (typeof window.syncPlaqueMagnetStacks === 'function') {
      window.syncPlaqueMagnetStacks(document);
      return;
    }

    if (!document.querySelector(`script[${EMBED_MARKER}]`)) {
      const script = document.createElement('script');
      script.src = scriptSrc;
      script.setAttribute(EMBED_MARKER, 'true');
      document.body.appendChild(script);
    }
  }, [enabled, scriptSrc, syncKey]);
}

import { statusSparkColor } from "./sparkline.js";

const DEFAULT_FLIPS_LABEL = {
  en: "Flaky flips",
  ru: "Флипы flaky",
};

const STATUS_LABELS = {
  en: {
    passed: "PASSED",
    failed: "FAILED",
    broken: "BROKEN",
    skipped: "SKIPPED",
    unknown: "UNKNOWN",
  },
  ru: {
    passed: "ПРОЙДЕН",
    failed: "УПАЛ",
    broken: "СЛОМАН",
    skipped: "ПРОПУЩЕН",
    unknown: "НЕИЗВЕСТЕН",
  },
};

/**
 * @param {string} status
 * @param {"ru" | "en"} [lang]
 * @returns {string}
 */
export function stabilityStatusLabel(status, lang = "ru") {
  const normalized = (status || "unknown").toLowerCase();
  const table = STATUS_LABELS[lang] ?? STATUS_LABELS.en;
  return table[normalized] ?? table.unknown;
}

/**
 * @param {number | undefined} flakyFlips
 * @param {Array<{ status?: string }>} history
 * @param {import("./sparkline.js").SparklineTheme} theme
 * @param {{
 *   lang?: "ru" | "en",
 *   flipsLabel?: string,
 *   limit?: number,
 * }} [options]
 * @returns {HTMLElement}
 */
export function buildStabilityCell(flakyFlips, history, theme, options = {}) {
  const lang = options.lang ?? "ru";
  const flipsLabel = options.flipsLabel ?? DEFAULT_FLIPS_LABEL[lang] ?? DEFAULT_FLIPS_LABEL.en;
  const limit = options.limit ?? 10;
  const runs = (history ?? []).slice(-limit);
  const flips = flakyFlips ?? 0;

  const root = document.createElement("div");
  root.className = "stability-cell";

  const dotsWrap = document.createElement("span");
  dotsWrap.className = "stability-dots";
  dotsWrap.setAttribute("aria-hidden", "true");

  if (runs.length) {
    for (const point of runs) {
      const status = (point.status || "unknown").toLowerCase();
      const dot = document.createElement("span");
      dot.className = `stability-dot stability-dot--${status}`;
      dot.style.background = statusSparkColor(point.status, theme);
      dot.title = stabilityStatusLabel(status, lang);
      dotsWrap.append(dot);
    }
  } else {
    dotsWrap.textContent = "—";
  }

  root.append(dotsWrap);

  /* Flaky count after status dots (dots · badge). */
  if (flips > 0) {
    const badge = document.createElement("span");
    badge.className = "badge badge--flaky";
    badge.title = `${flipsLabel}: ${flips}`;
    badge.textContent = String(flips);
    root.append(badge);
  }

  return root;
}

/**
 * @param {number | undefined} flakyFlips
 * @param {Array<{ status?: string }>} history
 * @param {import("./sparkline.js").SparklineTheme} theme
 * @param {{ lang?: "ru" | "en", flipsLabel?: string, limit?: number }} [options]
 * @returns {string}
 */
export function stabilityCellHtml(flakyFlips, history, theme, options = {}) {
  return buildStabilityCell(flakyFlips, history, theme, options).outerHTML;
}

import { escapeHtml } from "./dom-utils.js";

const DEFAULT_EMPTY_LABEL = {
  en: "No history",
  ru: "Нет истории",
};

/**
 * @typedef {{
 *   accent: string,
 *   pass: string,
 *   fail: string,
 *   broken: string,
 *   skip: string,
 * }} SparklineTheme
 */

/**
 * @param {string} [lang]
 * @returns {string}
 */
export function resolveSparklineEmptyLabel(lang = "ru") {
  return DEFAULT_EMPTY_LABEL[lang] ?? DEFAULT_EMPTY_LABEL.en;
}

/**
 * @param {string | undefined} status
 * @param {SparklineTheme} theme
 * @returns {string}
 */
export function statusSparkColor(status, theme) {
  const normalized = (status || "unknown").toLowerCase();
  if (normalized === "passed") return theme.pass;
  if (normalized === "failed") return theme.fail;
  if (normalized === "broken") return theme.broken;
  return theme.skip;
}

/**
 * Trend-line stroke by row status — passed keeps accent (info blue);
 * failed / broken / skipped use status-family colors (palette + collage parity).
 * @param {string | undefined} status
 * @param {SparklineTheme} theme
 * @returns {string}
 */
export function trendSparkColor(status, theme) {
  const normalized = (status || "unknown").toLowerCase();
  if (normalized === "failed") return theme.fail;
  if (normalized === "broken") return theme.broken;
  if (normalized === "skipped" || normalized === "unknown") return theme.skip;
  return theme.accent;
}

/**
 * @param {"light" | "dark"} siteTheme
 * @returns {SparklineTheme}
 */
export function sparklineThemeFromSite(siteTheme) {
  const isDark = siteTheme === "dark";
  return {
    accent: isDark ? "#38bdf8" : "#20aee3",
    pass: isDark ? "#4ade80" : "#16a34a",
    fail: isDark ? "#f87171" : "#dc2626",
    broken: isDark ? "#fbbf24" : "#d97706",
    skip: isDark ? "#94a3b8" : "#64748b",
  };
}

/**
 * @param {Array<{ durationSec?: number }>} history
 * @param {SparklineTheme} theme
 * @param {{
 *   emptyLabel?: string,
 *   lang?: "ru" | "en",
 *   width?: number,
 *   height?: number,
 *   stroke?: string,
 * }} [options]
 * @returns {HTMLElement}
 */
export function buildSparkline(history, theme, options = {}) {
  const lang = options.lang ?? "ru";
  const emptyLabel = options.emptyLabel ?? resolveSparklineEmptyLabel(lang);
  const points = (history ?? []).filter((point) => typeof point.durationSec === "number");

  if (points.length < 2) {
    const empty = document.createElement("span");
    empty.className = "sparkline sparkline--empty";
    empty.textContent = emptyLabel;
    return empty;
  }

  const values = points.map((point) => point.durationSec);
  const width = options.width ?? 88;
  const height = options.height ?? 28;
  /* padX=0 so the stroke starts at the content-box left (matches th). */
  const padX = 0;
  const padY = 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const coords = values.map((value, index) => {
    const x = padX + (index / (values.length - 1)) * (width - padX * 2);
    const y = padY + (1 - (value - min) / range) * (height - padY * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const polyline = coords.join(" ");
  const area = `${padX},${height - padY} ${polyline} ${width - padX},${height - padY}`;
  const label = values.map((value, index) => `R${index + 1}: ${value.toFixed(2)}s`).join(" · ");
  const stroke = options.stroke ?? theme.accent;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "sparkline sparkline--duration");
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  /* Stretch into fluid table cells — default meet centers and desyncs from th. */
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", label);

  const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
  title.textContent = label;
  svg.append(title);

  const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  polygon.setAttribute("class", "sparkline__area");
  polygon.setAttribute("points", area);
  polygon.setAttribute("fill", stroke);
  polygon.setAttribute("fill-opacity", "0.14");

  const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  line.setAttribute("class", "sparkline__line");
  line.setAttribute("points", polyline);
  line.setAttribute("fill", "none");
  line.setAttribute("stroke", stroke);
  line.setAttribute("stroke-width", "1.5");
  line.setAttribute("stroke-linecap", "round");
  line.setAttribute("stroke-linejoin", "round");

  svg.append(polygon, line);
  return svg;
}

/**
 * @param {HTMLElement} host
 * @param {{
 *   history?: Array<{ durationSec?: number }>,
 *   theme: SparklineTheme,
 *   emptyLabel?: string,
 *   lang?: "ru" | "en",
 * }} options
 */
export function renderSparkline(host, options) {
  host.replaceChildren(buildSparkline(options.history, options.theme, options));
}

/**
 * @param {Array<{ durationSec?: number }>} history
 * @param {SparklineTheme} theme
 * @param {{ emptyLabel?: string, lang?: "ru" | "en" }} [options]
 * @returns {string}
 */
export function sparklineHtml(history, theme, options = {}) {
  return buildSparkline(history, theme, options).outerHTML;
}

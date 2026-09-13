import { createQgInfo } from "./qg-info.js";

/** Popover UX (links, JSON highlight, deviation literals) — shared by Allure + Sonar via createQgInfo(). */

const DEFAULT_LABELS = {
  passed: { en: "Quality gate passed", ru: "Quality gate пройден" },
  failed: { en: "Quality gate failed", ru: "Quality gate не пройден" },
};

const DEFAULT_BAR_TITLE = "Quality gate";

/**
 * @typedef {{
 *   id: string,
 *   message: string,
 *   passed?: boolean,
 *   actual?: number | string,
 *   expected?: number | string,
 *   threshold?: number | string,
 *   comparator?: "LT" | "GT" | "EQ" | "NE" | "LTE" | "GTE",
 * }} QualityGateRule
 * Allure 3 canon: `expected`. `threshold` is a legacy kit alias still read by the UI.
 * @typedef {string | Partial<Record<"ru" | "en", string>>} QualityGateLabel
 */

/**
 * @param {QualityGateLabel | undefined} entry
 * @param {"passed" | "failed"} key
 * @param {"ru" | "en"} [lang]
 * @returns {string}
 */
export function resolveQualityGateLabel(entry, key, lang = "ru") {
  if (!entry) {
    return DEFAULT_LABELS[key][lang] ?? DEFAULT_LABELS[key].en;
  }
  if (typeof entry === "string") {
    return entry;
  }
  return entry[lang] ?? entry.en ?? entry.ru ?? DEFAULT_LABELS[key].en;
}

/**
 * Allure 3 canon — configured limit from the rule set.
 * Legacy widgets may still carry `threshold`.
 *
 * @param {QualityGateRule} rule
 * @returns {number | string | undefined}
 */
export function resolveQualityGateRuleExpected(rule) {
  if (rule.expected !== undefined && rule.expected !== null) {
    return rule.expected;
  }
  if (rule.threshold !== undefined && rule.threshold !== null) {
    return rule.threshold;
  }
  return undefined;
}

/**
 * @param {QualityGateRule} rule
 * @returns {string}
 */
export function formatQualityGateRuleFormula(rule) {
  const { id, actual, comparator } = rule;
  const expected = resolveQualityGateRuleExpected(rule);
  if (actual === undefined || expected === undefined) {
    return "";
  }

  if (comparator) {
    const op =
      comparator === "LT"
        ? "<"
        : comparator === "LTE"
          ? "≤"
          : comparator === "GT"
            ? ">"
            : comparator === "GTE"
              ? "≥"
              : comparator === "EQ"
                ? "="
                : "≠";
    return `FAIL: ${actual} ${op} ${expected}`;
  }

  switch (id) {
    case "maxFailures":
      return `FAIL: ${actual} > ${expected}`;
    case "minTestsCount":
      return `FAIL: ${actual} < ${expected}`;
    case "successRate":
      return `FAIL: ${actual}% < ${expected}%`;
    case "maxDuration":
      return `FAIL: ${actual}s > ${expected}s`;
    default:
      return `FAIL: ${actual} vs ${expected}`;
  }
}

/**
 * @typedef {{
 *   configFile?: string,
 *   rulesFile?: string,
 *   knownIssuesFile?: string,
 *   profile?: string,
 *   projectKey?: string,
 *   hrefBase?: string,
 *   profileHref?: string,
 *   projectHref?: string,
 * }} QualityGateFileSource
 */

/**
 * @param {{
 *   rules?: Array<Record<string, unknown>>,
 *   knownIssuesPath?: string,
 *   source?: QualityGateFileSource,
 *   profile?: string,
 *   projectKey?: string,
 * } | undefined} config
 * @returns {QualityGateFileSource | undefined}
 */
export function resolveQualityGateFileSource(config) {
  if (!config) {
    return undefined;
  }

  const fileSource = config.source ?? {};
  /** @type {QualityGateFileSource} */
  const resolved = {};

  if (fileSource.configFile) {
    resolved.configFile = fileSource.configFile;
  }
  if (fileSource.rulesFile) {
    resolved.rulesFile = fileSource.rulesFile;
  }
  const knownIssuesFile = fileSource.knownIssuesFile ?? config.knownIssuesPath;
  if (knownIssuesFile) {
    resolved.knownIssuesFile = knownIssuesFile;
  }
  const profile = fileSource.profile ?? config.profile;
  if (profile) {
    resolved.profile = profile;
  }
  const projectKey = fileSource.projectKey ?? config.projectKey;
  if (projectKey) {
    resolved.projectKey = projectKey;
  }
  if (fileSource.hrefBase) {
    resolved.hrefBase = fileSource.hrefBase;
  }
  if (fileSource.profileHref) {
    resolved.profileHref = fileSource.profileHref;
  }
  if (fileSource.projectHref) {
    resolved.projectHref = fileSource.projectHref;
  }

  return Object.keys(resolved).length ? resolved : undefined;
}

/**
 * @param {{
 *   passed?: boolean,
 *   rules?: QualityGateRule[],
 *   config?: {
 *     rules?: Array<Record<string, unknown>>,
 *     knownIssuesPath?: string,
 *     source?: QualityGateFileSource,
 *   },
 * }} options
 * @returns {Record<string, unknown>}
 */
export function buildQualityGateInfoPayload(options) {
  const rules = options.rules ?? [];
  const config = options.config ?? { rules: [] };

  return {
    qualityGate: {
      rules: config.rules ?? [],
    },
    result: {
      passed: Boolean(options.passed),
      rules,
    },
  };
}

/**
 * @param {HTMLElement} host
 * @param {{
 *   passed?: boolean,
 *   title?: string,
 *   barTitle?: string,
 *   kind?: "allure" | "sonar",
 *   testId?: string,
 *   rules?: QualityGateRule[],
 *   config?: {
 *     rules?: Array<Record<string, unknown>>,
 *     knownIssuesPath?: string,
 *     source?: QualityGateFileSource,
 *     profile?: string,
 *     projectKey?: string,
 *     conditions?: Array<Record<string, unknown>>,
 *   },
 *   infoPayload?: Record<string, unknown>,
 *   labels?: { passed?: QualityGateLabel, failed?: QualityGateLabel },
 *   lang?: "ru" | "en",
 * }} [options]
 * @returns {{ hidden: boolean, passed?: boolean }}
 */
export function renderQualityGate(host, options = {}) {
  const rules = options.rules ?? [];
  if (!rules.length) {
    host.replaceChildren();
    host.hidden = true;
    return { hidden: true };
  }

  const passed = Boolean(options.passed);
  const lang = options.lang ?? "ru";
  const kind = options.kind ?? "allure";
  const barTitle = options.barTitle ?? options.title ?? DEFAULT_BAR_TITLE;
  const passedLabel = resolveQualityGateLabel(options.labels?.passed, "passed", lang);
  const testId = options.testId ?? (kind === "sonar" ? "sonar-quality-gate" : "quality-gate");

  host.hidden = false;

  const root = document.createElement("div");
  root.className = `quality-gate quality-gate--${kind} quality-gate--${passed ? "passed" : "failed"}`;
  root.setAttribute("role", "status");
  root.dataset.testid = testId;
  root.setAttribute("aria-label", passed ? passedLabel : resolveQualityGateLabel(options.labels?.failed, "failed", lang));

  const bar = document.createElement("div");
  bar.className = "quality-gate__bar";

  const indicator = document.createElement("span");
  indicator.className = `indicator indicator--${passed ? "passed" : "failed"} indicator--solid`;
  indicator.setAttribute("aria-hidden", "true");

  const barTitleEl = document.createElement("span");
  barTitleEl.className = "quality-gate__bar-title";
  barTitleEl.textContent = barTitle;

  const infoPayload =
    options.infoPayload ?? buildQualityGateInfoPayload({ ...options, rules, passed });
  // Same chrome order as widget-tile: status left, title flexes right, trailing action.
  bar.append(indicator, barTitleEl, createQgInfo(infoPayload, resolveQualityGateFileSource(options.config)));

  const body = document.createElement("div");
  body.className = "quality-gate__body";

  if (passed) {
    const verdict = document.createElement("p");
    verdict.className = "quality-gate__verdict quality-gate__verdict--ok";
    // Bar already names the gate — body stays a short status, not a repeated sentence.
    verdict.textContent = lang === "en" ? "Passed" : "Пройден";
    body.append(verdict);
  } else {
    const failedRules = rules.filter((rule) => !rule.passed);
    if (failedRules.length) {
      const list = document.createElement("ul");
      list.className = "quality-gate__rules";
      for (const rule of failedRules) {
        const item = document.createElement("li");
        item.className = "quality-gate__rule";

        const idCell = document.createElement("div");
        idCell.className = "quality-gate__rule-id";
        idCell.textContent = rule.id;

        const detail = document.createElement("div");
        detail.className = "quality-gate__rule-detail";

        const message = document.createElement("p");
        message.className = "quality-gate__message";
        message.textContent = rule.message;

        const formula = formatQualityGateRuleFormula(rule);
        detail.append(message);
        if (formula) {
          const formulaEl = document.createElement("p");
          formulaEl.className = "quality-gate__formula";
          formulaEl.textContent = formula;
          detail.append(formulaEl);
        }

        item.append(idCell, detail);
        list.append(item);
      }
      body.append(list);
    }
  }

  root.append(bar, body);
  host.replaceChildren(root);
  return { hidden: false, passed };
}

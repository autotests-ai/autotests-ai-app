import { highlightJson } from "./code-highlight.js";

/**
 * Quality gate info icon + popover.
 * Allure and Sonar both render through createQgInfo() — keep feature parity here.
 */

const INFO_ICON = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="6.25"/><path d="M8 7.25v3.5"/><circle cx="8" cy="5.15" r="0.65" fill="currentColor" stroke="none"/></svg>`;

const VIEWPORT_MARGIN = 32;
const POPOVER_GAP = 6;
const POPOVER_MAX_WIDTH = 448;
const POPOVER_MIN_HEIGHT = 80;

import { ALLURE_QUALITY_GATE_SOURCE } from "./quality-gate-source.mjs";

/** @type {{ configFile: string, rulesFile: string, knownIssuesFile: string, hrefBase: string }} */
export const QG_INFO_SAMPLE_SOURCE = { ...ALLURE_QUALITY_GATE_SOURCE };

/** @type {Record<string, unknown>} */
export const QG_INFO_SAMPLE_FAILED = {
  qualityGate: {
    rules: [{ maxFailures: 0 }, { successRate: 95 }],
  },
  result: {
    passed: false,
    rules: [
      {
        id: "maxFailures",
        passed: false,
        actual: 3,
        expected: 0,
        message: "The number of failed tests 3 exceeds the allowed threshold value 0",
      },
      {
        id: "successRate",
        passed: false,
        actual: 82,
        expected: 95,
        message: "Success rate 82% is below the minimum required 95%",
      },
    ],
  },
};

/** @type {Record<string, unknown>} */
export const QG_INFO_SAMPLE_PASSED = {
  qualityGate: {
    rules: [{ maxFailures: 0 }, { successRate: 95 }],
  },
  result: {
    passed: true,
    rules: [
      {
        id: "maxFailures",
        passed: true,
        actual: 0,
        expected: 0,
        message: "Failed tests 0 within threshold 0",
      },
      {
        id: "successRate",
        passed: true,
        actual: 100,
        expected: 95,
        message: "Success rate 100% meets minimum 95%",
      },
    ],
  },
};

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
 * }} QgInfoFileSource
 */

/**
 * @param {string} value
 * @param {string | undefined} hrefBase
 * @returns {string | null}
 */
export function resolveQgInfoPathHref(value, hrefBase) {
  if (!value) {
    return null;
  }
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  if (!hrefBase) {
    return null;
  }
  const base = hrefBase.endsWith("/") ? hrefBase : `${hrefBase}/`;
  return base + value.replace(/^\.\//, "");
}

/**
 * @param {string} value
 * @param {string | undefined} hrefBase
 * @param {{ linkable?: boolean }} [options]
 * @returns {HTMLAnchorElement | HTMLSpanElement}
 */
function createQgInfoPathValue(value, hrefBase, options = {}) {
  const linkable = options.linkable !== false;
  const href =
    options.href ?? (linkable ? resolveQgInfoPathHref(value, hrefBase) : resolveQgInfoPathHref(value, undefined));

  if (href) {
    const link = document.createElement("a");
    link.className = "link qg-info__path-link";
    link.href = href;
    link.title = href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = value;
    return link;
  }

  const span = document.createElement("span");
  span.className = "qg-info__path-value";
  span.textContent = value;
  return span;
}

/**
 * @param {QgInfoFileSource | undefined} fileSource
 * @returns {HTMLUListElement | null}
 */
function createQgInfoPaths(fileSource) {
  if (!fileSource) {
    return null;
  }

  /** @type {Array<{ label: string, value: string, linkable?: boolean, href?: string }>} */
  const rows = [];
  if (fileSource.configFile) {
    rows.push({ label: "config", value: fileSource.configFile });
  }
  if (fileSource.rulesFile) {
    rows.push({ label: "rules", value: fileSource.rulesFile });
  }
  if (fileSource.knownIssuesFile) {
    rows.push({ label: "known", value: fileSource.knownIssuesFile });
  }
  if (fileSource.profile) {
    rows.push({
      label: "profile",
      value: fileSource.profile,
      href: fileSource.profileHref,
      linkable: !fileSource.profileHref,
    });
  }
  if (fileSource.projectKey) {
    rows.push({
      label: "project",
      value: fileSource.projectKey,
      href: fileSource.projectHref,
      linkable: !fileSource.projectHref,
    });
  }
  if (!rows.length) {
    return null;
  }

  const list = document.createElement("ul");
  list.className = "qg-info__paths";
  for (const row of rows) {
    const item = document.createElement("li");
    item.className = "qg-info__path";
    const label = document.createElement("span");
    label.className = "qg-info__path-label";
    label.textContent = row.label;
    const value = createQgInfoPathValue(row.value, fileSource.hrefBase, {
      linkable: row.linkable,
      href: row.href,
    });
    item.append(label, value);
    list.append(item);
  }
  return list;
}

/**
 * @param {HTMLElement} trigger
 * @param {HTMLElement} popover
 */
function placeQgInfoPopover(trigger, popover) {
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = document.documentElement.clientHeight;
  const width = Math.min(POPOVER_MAX_WIDTH, viewportWidth - VIEWPORT_MARGIN * 2);
  const triggerRect = trigger.getBoundingClientRect();

  const spaceBelow = viewportHeight - VIEWPORT_MARGIN - triggerRect.bottom - POPOVER_GAP;
  const spaceAbove = triggerRect.top - VIEWPORT_MARGIN - POPOVER_GAP;
  const placeBelow = spaceBelow >= spaceAbove;
  const maxHeight = Math.max(POPOVER_MIN_HEIGHT, placeBelow ? spaceBelow : spaceAbove);

  popover.style.width = `${width}px`;
  popover.style.maxHeight = `${Math.round(maxHeight)}px`;
  popover.style.left = "0px";
  popover.style.top = "0px";

  const popoverHeight = popover.getBoundingClientRect().height;

  let left = triggerRect.right - width;
  left = Math.max(VIEWPORT_MARGIN, Math.min(left, viewportWidth - width - VIEWPORT_MARGIN));

  let top;
  if (placeBelow) {
    top = triggerRect.bottom + POPOVER_GAP;
  } else {
    top = triggerRect.top - POPOVER_GAP - popoverHeight;
    top = Math.max(VIEWPORT_MARGIN, top);
  }

  popover.style.left = `${Math.round(left)}px`;
  popover.style.top = `${Math.round(top)}px`;
}

/**
 * @param {HTMLElement} root
 */
function wireQgInfoPopover(root) {
  const trigger = root.querySelector(".qg-info__trigger");
  const popover = root.querySelector(".qg-info__popover");
  if (!(trigger instanceof HTMLElement) || !(popover instanceof HTMLElement)) {
    return;
  }

  let pinned = false;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let hoverCloseTimer;

  const show = () => {
    popover.style.visibility = "hidden";
    popover.style.opacity = "0";
    popover.style.pointerEvents = "none";
    popover.style.display = "block";
    placeQgInfoPopover(trigger, popover);
    popover.style.removeProperty("visibility");
    popover.style.removeProperty("opacity");
    popover.style.removeProperty("pointer-events");
    root.classList.add("qg-info--open");
  };

  const hide = () => {
    root.classList.remove("qg-info--open");
  };

  const cancelHoverClose = () => {
    if (hoverCloseTimer !== undefined) {
      clearTimeout(hoverCloseTimer);
      hoverCloseTimer = undefined;
    }
  };

  const scheduleHoverClose = () => {
    if (pinned) {
      return;
    }
    cancelHoverClose();
    hoverCloseTimer = setTimeout(() => {
      hoverCloseTimer = undefined;
      hide();
    }, 60);
  };

  const setPinned = (next) => {
    pinned = next;
    root.classList.toggle("qg-info--pinned", pinned);
    trigger.setAttribute("aria-expanded", pinned ? "true" : "false");
    if (pinned) {
      cancelHoverClose();
      show();
      return;
    }
    hide();
    trigger.blur();
  };

  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    setPinned(!pinned);
  });

  root.addEventListener("mouseenter", () => {
    cancelHoverClose();
    if (!pinned) {
      show();
    }
  });
  root.addEventListener("mouseleave", scheduleHoverClose);
  popover.addEventListener("mouseenter", cancelHoverClose);
  popover.addEventListener("mouseleave", scheduleHoverClose);

  root.addEventListener("focusin", () => {
    if (!pinned) {
      show();
    }
  });
  root.addEventListener("focusout", (event) => {
    if (pinned) {
      return;
    }
    if (event.relatedTarget instanceof Node && root.contains(event.relatedTarget)) {
      return;
    }
    hide();
  });

  const reposition = () => {
    if (root.classList.contains("qg-info--open") || pinned) {
      placeQgInfoPopover(trigger, popover);
    }
  };

  window.addEventListener("resize", reposition);
  window.addEventListener("scroll", reposition, true);
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function formatQgInfoDeviationLiteral(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return String(value);
}

/**
 * Collect numeric literals for failed rule actuals in a QG info payload.
 *
 * @param {unknown} payload
 * @returns {Set<string>}
 */
export function collectQgInfoDeviationLiterals(payload) {
  /** @type {Set<string>} */
  const literals = new Set();
  if (!payload || typeof payload !== "object") {
    return literals;
  }

  const result = /** @type {Record<string, unknown>} */ (payload).result;
  if (!result || typeof result !== "object") {
    return literals;
  }

  const res = /** @type {Record<string, unknown>} */ (result);

  if (Array.isArray(res.rules)) {
    for (const rule of res.rules) {
      if (!rule || typeof rule !== "object") {
        continue;
      }
      const entry = /** @type {Record<string, unknown>} */ (rule);
      if (entry.passed === false && entry.actual !== undefined && entry.actual !== null) {
        literals.add(formatQgInfoDeviationLiteral(entry.actual));
      }
    }
  }

  if (Array.isArray(res.conditions)) {
    for (const condition of res.conditions) {
      if (!condition || typeof condition !== "object") {
        continue;
      }
      const entry = /** @type {Record<string, unknown>} */ (condition);
      const status = String(entry.status ?? "").toUpperCase();
      if (status && status !== "OK" && status !== "PASSED") {
        if (entry.actualValue !== undefined && entry.actualValue !== null) {
          literals.add(formatQgInfoDeviationLiteral(entry.actualValue));
        }
      }
    }
  }

  return literals;
}

/**
 * @param {string | Record<string, unknown>} content
 * @param {QgInfoFileSource} [fileSource]
 * @returns {HTMLDivElement}
 */
export function createQgInfo(content, fileSource) {
  const payload = typeof content === "string" ? null : content;
  const code = typeof content === "string" ? content : JSON.stringify(content, null, 2);
  const dangerLiterals = payload ? collectQgInfoDeviationLiterals(payload) : undefined;
  const popoverId = `qg-info-${Math.random().toString(36).slice(2, 9)}`;

  const root = document.createElement("div");
  root.className = "qg-info";
  root.dataset.testid = "qg-info";
  root.innerHTML = `
    <button type="button" class="icon-btn qg-info__trigger" aria-label="Quality gate config" aria-haspopup="dialog" aria-expanded="false" aria-controls="${popoverId}">
      <span class="icon">${INFO_ICON}</span>
    </button>
    <div class="qg-info__popover" id="${popoverId}" role="dialog" aria-label="Quality gate config"></div>
  `;

  const popover = root.querySelector(".qg-info__popover");
  const paths = createQgInfoPaths(fileSource);
  if (popover && paths) {
    popover.append(paths);
  }
  if (popover) {
    popover.classList.add("ch-theme--vscode");
    const pre = document.createElement("pre");
    pre.className = "qg-info__code ch-code";
    pre.setAttribute("aria-label", "Quality gate JSON");
    pre.innerHTML = highlightJson(code, { dangerLiterals });
    popover.append(pre);
  }

  wireQgInfoPopover(root);
  return root;
}

/**
 * Mount info icons into `[data-qg-info-host]` placeholders.
 *
 * @param {ParentNode} [scope]
 */
export function mountQgInfoHosts(scope = document) {
  const samples = {
    failed: QG_INFO_SAMPLE_FAILED,
    passed: QG_INFO_SAMPLE_PASSED,
  };

  scope.querySelectorAll("[data-qg-info-host]").forEach((host) => {
    const key = host.dataset.qgInfoHost ?? "failed";
    const payload = samples[key] ?? samples.failed;
    host.replaceChildren(createQgInfo(payload, QG_INFO_SAMPLE_SOURCE));
  });
}

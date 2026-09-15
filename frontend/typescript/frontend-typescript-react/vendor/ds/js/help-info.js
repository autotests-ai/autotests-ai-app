/**
 * Help info — icon-btn + hover/pin popover with a title/body list.
 * Hover/focus/pin algorithm matches qg-info.js; classes and content do not.
 */

const INFO_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><circle cx="12" cy="8" r="1" fill="currentColor" stroke="none"/></svg>`;

const VIEWPORT_MARGIN = 32;
const POPOVER_GAP = 6;
const POPOVER_MAX_WIDTH = 448;
const POPOVER_MIN_HEIGHT = 80;

/** @typedef {{ title: string, body: string }} HelpInfoItem */

/** Catalog sample — Project + Destination so HTTP hover can assert titles. */
export const HELP_INFO_SAMPLE_ITEMS = [
  {
    title: "Project",
    body: "Which product layers go into the repo (backend, frontend, tests, load).",
  },
  {
    title: "Destination",
    body: "Where to send the result — zip, catalog cell, school cloud, or your GitHub.",
  },
];

/**
 * @param {HTMLElement} trigger
 * @param {HTMLElement} popover
 */
function placeHelpInfoPopover(trigger, popover) {
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
 * @param {HTMLElement} popover
 * @returns {() => void}
 */
function wireHelpInfoPopover(root, popover) {
  const trigger = root.querySelector(".help-info__trigger");
  if (!(trigger instanceof HTMLElement) || !(popover instanceof HTMLElement)) {
    return () => {};
  }

  let pinned = false;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let hoverCloseTimer;

  const show = () => {
    popover.style.visibility = "hidden";
    popover.style.opacity = "0";
    popover.style.pointerEvents = "none";
    popover.style.display = "block";
    placeHelpInfoPopover(trigger, popover);
    popover.style.removeProperty("visibility");
    popover.style.removeProperty("opacity");
    popover.style.removeProperty("pointer-events");
    popover.classList.add("help-info__popover--open");
    root.classList.add("help-info--open");
  };

  const hide = () => {
    root.classList.remove("help-info--open");
    popover.classList.remove("help-info__popover--open");
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
    root.classList.toggle("help-info--pinned", pinned);
    trigger.setAttribute("aria-expanded", pinned ? "true" : "false");
    if (pinned) {
      cancelHoverClose();
      show();
      return;
    }
    hide();
    trigger.blur();
  };

  /** @param {MouseEvent} event */
  const onClick = (event) => {
    event.preventDefault();
    setPinned(!pinned);
  };

  const onRootEnter = () => {
    cancelHoverClose();
    if (!pinned) {
      show();
    }
  };

  const onFocusIn = () => {
    if (!pinned) {
      show();
    }
  };

  /** @param {FocusEvent} event */
  const onFocusOut = (event) => {
    if (pinned) {
      return;
    }
    if (
      event.relatedTarget instanceof Node &&
      (root.contains(event.relatedTarget) || popover.contains(event.relatedTarget))
    ) {
      return;
    }
    hide();
  };

  const reposition = () => {
    if (root.classList.contains("help-info--open") || pinned) {
      placeHelpInfoPopover(trigger, popover);
    }
  };

  /** @param {KeyboardEvent} event */
  const onKeyDown = (event) => {
    if (event.key !== "Escape") {
      return;
    }
    if (pinned) {
      setPinned(false);
      return;
    }
    hide();
  };

  trigger.addEventListener("click", onClick);
  root.addEventListener("mouseenter", onRootEnter);
  root.addEventListener("mouseleave", scheduleHoverClose);
  popover.addEventListener("mouseenter", cancelHoverClose);
  popover.addEventListener("mouseleave", scheduleHoverClose);
  root.addEventListener("focusin", onFocusIn);
  root.addEventListener("focusout", onFocusOut);
  window.addEventListener("resize", reposition);
  window.addEventListener("scroll", reposition, true);
  document.addEventListener("keydown", onKeyDown);

  return () => {
    cancelHoverClose();
    trigger.removeEventListener("click", onClick);
    root.removeEventListener("mouseenter", onRootEnter);
    root.removeEventListener("mouseleave", scheduleHoverClose);
    popover.removeEventListener("mouseenter", cancelHoverClose);
    popover.removeEventListener("mouseleave", scheduleHoverClose);
    root.removeEventListener("focusin", onFocusIn);
    root.removeEventListener("focusout", onFocusOut);
    window.removeEventListener("resize", reposition);
    window.removeEventListener("scroll", reposition, true);
    document.removeEventListener("keydown", onKeyDown);
    root.classList.remove("help-info--open", "help-info--pinned");
    popover.classList.remove("help-info__popover--open");
  };
}

/**
 * @param {{
 *   items?: HelpInfoItem[],
 *   title?: string,
 *   ariaLabel?: string,
 *   testid?: string,
 * }} [options]
 * @returns {{ root: HTMLDivElement, dispose: () => void }}
 */
export function createHelpInfo(options = {}) {
  const items = options.items ?? [];
  const testid = options.testid || "help-info";
  const title = options.title || "";
  const ariaLabel = options.ariaLabel || title || "Help";
  const popoverId = `help-info-${Math.random().toString(36).slice(2, 9)}`;

  const root = document.createElement("div");
  root.className = "help-info";
  root.dataset.testid = testid;

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "icon-btn help-info__trigger";
  trigger.dataset.testid = `${testid}-btn`;
  trigger.setAttribute("aria-label", ariaLabel);
  trigger.setAttribute("aria-haspopup", "dialog");
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-controls", popoverId);
  trigger.innerHTML = `<span class="icon" aria-hidden="true">${INFO_ICON}</span>`;

  const popover = document.createElement("div");
  popover.className = "help-info__popover";
  popover.id = popoverId;
  popover.setAttribute("role", "dialog");
  popover.setAttribute("aria-label", ariaLabel);

  if (title) {
    const heading = document.createElement("p");
    heading.className = "help-info__heading";
    heading.textContent = title;
    popover.append(heading);
  }

  const list = document.createElement("ul");
  list.className = "help-info__list";
  for (const item of items) {
    const li = document.createElement("li");
    li.className = "help-info__item";
    const itemTitle = document.createElement("span");
    itemTitle.className = "help-info__title";
    itemTitle.textContent = item.title ?? "";
    const itemBody = document.createElement("span");
    itemBody.className = "help-info__body";
    itemBody.textContent = item.body ?? "";
    li.append(itemTitle, itemBody);
    list.append(li);
  }
  popover.append(list);
  root.append(trigger);
  document.body.append(popover);

  const disposeWire = wireHelpInfoPopover(root, popover);
  return {
    root,
    dispose: () => {
      disposeWire();
      popover.remove();
    },
  };
}

/**
 * @param {ParentNode} container
 * @param {{
 *   items?: HelpInfoItem[],
 *   title?: string,
 *   ariaLabel?: string,
 *   testid?: string,
 * }} [options]
 * @returns {() => void}
 */
export function mountHelpInfo(container, options = {}) {
  const { root, dispose } = createHelpInfo(options);
  container.replaceChildren(root);
  return () => {
    dispose();
    root.remove();
  };
}

/**
 * Mount into `[data-testid="header-tools"]` (leading icon, same gap as siblings).
 * @param {{
 *   items?: HelpInfoItem[],
 *   title?: string,
 *   ariaLabel?: string,
 *   testid?: string,
 *   toolsSelector?: string,
 * }} [options]
 * @returns {() => void} dispose
 */
export function mountHeaderHelpInfo(options = {}) {
  const testid = options.testid || "header-help";
  const selector = options.toolsSelector || '[data-testid="header-tools"]';
  const tools = document.querySelector(selector);
  if (!tools) {
    return () => {};
  }

  tools.querySelector(`[data-testid="${testid}"]`)?.remove();

  const host = document.createElement("div");
  const disposeInner = mountHelpInfo(host, { ...options, testid });
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

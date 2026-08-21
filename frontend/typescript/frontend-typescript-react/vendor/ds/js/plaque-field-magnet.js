/**
 * Magnet label columns for plaque-field stacks.
 *
 *   `.plaque-field-grid-stack`  — align dividers per *visual* vertical column
 *     (cell left edge — survives `--duo` auto-fit collapse to one column)
 *   `.plaque-field-panel-stack` — align dividers across full-width rows
 *   (the `--magnet` modifier is the canonical trigger; plain stacks are handled
 *   too so long ids never clip on this page).
 *
 * Content-driven, deterministic behaviour per field — label and control stay on
 * one horizontal grid row (never label-above-control stacking):
 *   1. measure the real label width and the control's minimum width;
 *   2. if the label + control fit the cell → keep the row horizontal and set
 *      `--plaque-mixed-label-col` so dividers line up (never clipping a label);
 *   3. if they cannot fit → for plain selects/segs add `.plaque-field--nowrap`
 *      and cap the label column to the field's own px budget (ellipsis); for
 *      tagstrips (`--many`) keep the shared/intrinsic label and let chips wrap
 *      — never crush protocol labels to a single letter.
 *
 * A ResizeObserver keeps the result correct across any layout change (window,
 * Cursor panel, terminal aside), not just window resize — this is what stops
 * the "everything jumps at different widths" flakiness.
 *
 * Plain script — works on file:// presets (no ES modules).
 */
(function (global) {
  'use strict';

  /* Minimum a plain select / input / value control keeps before we stack.
     Segmented controls are measured individually (button text can be wide). */
  var SELECT_MIN_PX = 68;
  var DIVIDER_PX = 1;
  var FUDGE_PX = 6; /* borders + sub-pixel rounding */
  /* Shell pad-x + seg-shell-end + divider margin — budget is field content, not
     border-box cell width. Without this, label px eats the controlMin we reserved. */
  var SHELL_CHROME_PX = 24;
  /* scrollWidth is integer-rounded; the real glyph box can be a fraction wider,
     which makes text-overflow:ellipsis fire right at the boundary. Pad the
     measured label so a full label never shows a stray "…". */
  var LABEL_PAD_PX = 3;

  function isDivided(el) {
    return el && el.classList && el.classList.contains('plaque-field--divided');
  }

  function getLabel(field) {
    return field.querySelector(':scope > .plaque-field__label, :scope > .plaque-field__text');
  }

  function getSegTrack(field) {
    return field.querySelector(':scope > .plaque-field-seg-track');
  }

  /**
   * Intrinsic inline width of a segmented control.
   * `--many` tagstrips wrap chips to extra rows — do NOT sum every button (that
   * made the magnet treat the full one-line width as required, crush the label
   * to "i…", and fight wrapping). Floor = room for two chips on one band so a
   * true|false pair never stacks; longer rows still wrap via max-width:100%.
   * @param {Element} field
   * @returns {number}
   */
  function measureControlMin(field) {
    var track = getSegTrack(field);
    if (!track) return SELECT_MIN_PX;
    var seg = track.querySelector(':scope > .plaque-field-seg');
    if (!seg) return Math.ceil(track.scrollWidth);
    if (track.classList.contains('plaque-field-seg-track--many')) {
      var widest = 0;
      var gap = 0;
      var kids = seg.children;
      var i;
      for (i = 0; i < kids.length; i++) {
        if (kids[i].offsetWidth > widest) widest = kids[i].offsetWidth;
      }
      if (!widest) return SELECT_MIN_PX;
      try {
        var cs = global.getComputedStyle(seg);
        gap = parseFloat(cs.columnGap || cs.gap || '0') || 0;
      } catch (e) {
        gap = 5;
      }
      /* one band floor: two chips + gap + track/seg padding + shell inset */
      var bandFloor = Math.ceil(widest * 2 + gap) + 18;
      return Math.max(SELECT_MIN_PX, bandFloor);
    }
    return Math.ceil(seg.scrollWidth);
  }

  /* --- measurement -------------------------------------------------------- */

  /**
   * Measure every item's intrinsic label width, its control minimum and the
   * width of the cell it lives in. Uses two forced label-col states so the
   * numbers are intrinsic, not whatever the previous pass left behind.
   * @param {{ field: Element, label: Element, cell: Element }[]} items
   */
  function measure(items) {
    var i;
    /* Pass A — label col = max-content → label.scrollWidth is the real label. */
    for (i = 0; i < items.length; i++) {
      items[i].field.classList.remove('plaque-field--nowrap');
      items[i].field.style.setProperty('--plaque-mixed-label-col', 'max-content');
    }
    void items[0].cell.offsetWidth;
    for (i = 0; i < items.length; i++) {
      items[i].labelW = Math.ceil(items[i].label.scrollWidth) + LABEL_PAD_PX;
      items[i].cellW = Math.floor(items[i].cell.getBoundingClientRect().width);
    }
    /* Pass B — label col = 100% collapses the control so a seg overflows to its
       intrinsic min (buttons never shrink); selects use a flat floor. */
    for (i = 0; i < items.length; i++) {
      items[i].field.style.setProperty('--plaque-mixed-label-col', '100%');
    }
    void items[0].cell.offsetWidth;
    for (i = 0; i < items.length; i++) {
      items[i].controlMin = measureControlMin(items[i].field);
    }
    for (i = 0; i < items.length; i++) {
      items[i].field.style.removeProperty('--plaque-mixed-label-col');
      /* Budget = space left for the label once the control keeps its minimum. */
      items[i].budget = items[i].cellW - items[i].controlMin - DIVIDER_PX - FUDGE_PX - SHELL_CHROME_PX;
    }
  }

  /* --- resolve one shared column ----------------------------------------- */

  /**
   * Aligns dividers for a set of fields sharing a column. Fields that fit share
   * the max label width; a field whose cell is too narrow keeps its own capped
   * label column (ellipsis) — it is NEVER stacked into a second vertical row.
   * @param {{ field: Element, label: Element, cell: Element }[]} items
   */
  function isManyTagstrip(field) {
    var track = getSegTrack(field);
    return !!(track && track.classList.contains('plaque-field-seg-track--many'));
  }

  function resolveColumn(items) {
    if (!items || !items.length) return;
    var target = 0;
    var i;
    for (i = 0; i < items.length; i++) {
      if (items[i].labelW > target) target = items[i].labelW;
    }
    if (!target) return;
    for (i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.budget < target) {
        /* Tagstrips (`--many`) wrap chips vertically — never crush the protocol
           label to "W"/"P". Keep the shared (or intrinsic) column; controlMin
           already floors at two chips so wrapping is the pressure valve. */
        if (isManyTagstrip(it.field)) {
          it.field.classList.remove('plaque-field--nowrap');
          it.field.style.setProperty('--plaque-mixed-label-col', Math.max(it.labelW, target) + 'px');
          continue;
        }
        /* Cannot align on the shared column without wrapping — cap this field's
           label to its own budget so it ellipsises on one line while the control
           keeps its minimum. Never stack vertically. */
        it.field.classList.add('plaque-field--nowrap');
        it.field.style.setProperty('--plaque-mixed-label-col', Math.max(0, it.budget) + 'px');
      } else {
        it.field.classList.remove('plaque-field--nowrap');
        it.field.style.setProperty('--plaque-mixed-label-col', target + 'px');
      }
    }
  }

  /* --- stack collectors --------------------------------------------------- */

  function collectItem(field, cell) {
    var label = getLabel(field);
    if (!label) return null;
    /* Seg fields keep their buttons content-hug (sized to text, pinned to the
       control edge via justify-self:end) — but the divider DOES join the shared
       column so every field whose cell starts at the same horizontal level
       shares one divider position (selects + segs alike). measureControlMin()
       already handles seg tracks for the budget/no-clip guard. */
    return { field: field, label: label, cell: cell };
  }

  /**
   * Visual column key from cell left edge. `--duo` auto-fit may stack both
   * cells into one visual column while DOM child indices stay 0/1 — grouping by
   * index then leaves right-cell fields on a separate (narrower) magnet axis.
   * Snap to 4px so sub-pixel jitter does not split a single visual column.
   * @param {Element} cell
   * @returns {number}
   */
  function visualColKey(cell) {
    return Math.round(cell.getBoundingClientRect().left / 4) * 4;
  }

  /**
   * Grid stack — dividers align per *visual* column across rows (not DOM index).
   * @param {Element} stack
   */
  function syncGridStack(stack) {
    var rows = [];
    var c;
    for (c = 0; c < stack.children.length; c++) {
      var child = stack.children[c];
      if (!child.classList || !child.classList.contains('plaque-field-grid')) continue;
      /* Content-hug pairs size intrinsically — never magnet/stack them. */
      if (child.classList.contains('plaque-field-grid--pair')) continue;
      rows.push(child);
    }
    if (!rows.length) return;

    /** @type {Object.<string, { field: Element, label: Element, cell: Element }[]>} */
    var colMap = Object.create(null);
    var colKeys = [];
    var everything = [];
    var i;
    var j;
    for (i = 0; i < rows.length; i++) {
      var cells = rows[i].children;
      for (j = 0; j < cells.length; j++) {
        var cell = cells[j];
        if (!cell.classList || !cell.classList.contains('plaque-field-grid__cell')) continue;
        var field = cell.querySelector(':scope > .plaque-field--divided');
        if (!isDivided(field)) continue;
        var item = collectItem(field, cell);
        if (!item) continue;
        var key = String(visualColKey(cell));
        if (!colMap[key]) {
          colMap[key] = [];
          colKeys.push(key);
        }
        colMap[key].push(item);
        everything.push(item);
      }
    }
    if (!everything.length) return;
    measure(everything);

    for (i = 0; i < colKeys.length; i++) {
      resolveColumn(colMap[colKeys[i]]);
    }
  }

  /**
   * Panel stack — one shared column across full-width rows.
   * Skips nested grids / grid-stacks (those use the grid path).
   * @param {Element} stack
   */
  function syncPanelStack(stack) {
    var items = [];
    var c;
    for (c = 0; c < stack.children.length; c++) {
      var child = stack.children[c];
      if (!child || child.nodeType !== 1) continue;
      if (child.classList.contains('plaque-field-grid') ||
          child.classList.contains('plaque-field-grid-stack')) {
        continue;
      }
      var field = isDivided(child) ? child : child.querySelector(':scope > .plaque-field--divided');
      if (!isDivided(field)) continue;
      var item = collectItem(field, child);
      if (item) items.push(item);
    }
    if (!items.length) return;
    measure(items);
    resolveColumn(items);
  }

  /* --- driver ------------------------------------------------------------- */

  var applying = false;

  /**
   * @param {ParentNode} [root=document]
   */
  function syncPlaqueMagnetStacks(root) {
    if (applying) return;
    applying = true;
    try {
      var scope = root || document;
      var grids = scope.querySelectorAll('.plaque-field-grid-stack');
      var i;
      for (i = 0; i < grids.length; i++) syncGridStack(grids[i]);
      var panels = scope.querySelectorAll('.plaque-field-panel-stack');
      for (i = 0; i < panels.length; i++) syncPanelStack(panels[i]);
    } finally {
      applying = false;
    }
  }

  var scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    global.requestAnimationFrame(function () {
      scheduled = false;
      syncPlaqueMagnetStacks(document);
    });
  }

  function observe() {
    if (typeof global.ResizeObserver !== 'function') {
      global.addEventListener('resize', schedule);
      return;
    }
    var ro = new global.ResizeObserver(function () {
      if (applying) return; /* ignore reflows we caused */
      schedule();
    });
    var stacks = document.querySelectorAll('.plaque-field-grid-stack, .plaque-field-panel-stack');
    var i;
    for (i = 0; i < stacks.length; i++) ro.observe(stacks[i]);
    global.addEventListener('resize', schedule);
  }

  function boot() {
    syncPlaqueMagnetStacks(document);
    /* second pass next frame — first layout can settle after fonts/scrollbars */
    schedule();
    observe();
    if (global.document && global.document.fonts && global.document.fonts.ready) {
      global.document.fonts.ready.then(function () {
        syncPlaqueMagnetStacks(document);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  global.syncPlaqueMagnetStacks = syncPlaqueMagnetStacks;
})(typeof window !== 'undefined' ? window : this);

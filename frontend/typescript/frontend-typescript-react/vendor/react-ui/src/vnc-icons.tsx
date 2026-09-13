/* VNC window chrome glyphs — 16×16, stroke 1.5, currentColor.
   Mirrors design-system js/vnc-window-catalog.js icon set. */

export function IconClose() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="m4 4 8 8M12 4l-8 8" />
    </svg>
  );
}

/** Media-stop square — live session stop (Session panel). Pair: templates/icon-stop.html. */
export function IconStop() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4.5" y="4.5" width="7" height="7" rx="1.25" />
    </svg>
  );
}

/** Trash / kill session — same glyph as Stats `session-delete` (Sessions / Archive). */
export function IconTrash() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 4.5h11" />
      <path d="M6 4.5V3.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1" />
      <path d="M4.5 4.5l.7 8a1.5 1.5 0 0 0 1.5 1.3h3.6a1.5 1.5 0 0 0 1.5-1.3l.7-8" />
      <path d="M6.5 7v4M9.5 7v4" />
    </svg>
  );
}

export function IconDocumentRemove() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 2.5h5l3 3v8H4z" />
      <path d="M9 2.5v3h3M6 10h4" />
    </svg>
  );
}

export function IconDotsHorizontal() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M3 8h.01M8 8h.01M13 8h.01" />
    </svg>
  );
}

export function IconLock() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
    </svg>
  );
}

export function IconUnlock() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" />
      <path d="M10.5 7V5a2.5 2.5 0 0 0-4.75-1.1" />
    </svg>
  );
}

export function IconChevronUp() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m4 10 4-4 4 4" />
    </svg>
  );
}

export function IconChevronDown() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}

/** Corners expand — enter fullscreen (pair: templates/icon-fullscreen.html). */
export function IconFullscreen() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6.25V3h3.25" />
      <path d="M13 6.25V3h-3.25" />
      <path d="M3 9.75V13h3.25" />
      <path d="M13 9.75V13h-3.25" />
    </svg>
  );
}

/** Corners collapse — exit fullscreen (pair: templates/icon-fullscreen-exit.html). */
export function IconFullscreenExit() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6.25 3v3.25H3" />
      <path d="M9.75 3v3.25H13" />
      <path d="M6.25 13v-3.25H3" />
      <path d="M9.75 13v-3.25H13" />
    </svg>
  );
}

export function IconVncCopy() {
  return (
    <svg viewBox="0 0 16 16" fill="none">
      <rect x="5" y="5" width="8" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5 11H4a1.5 1.5 0 0 1-1.5-1.5V4A1.5 1.5 0 0 1 4 2.5h5.5A1.5 1.5 0 0 1 11 4v1"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

const clipboardSheets = (
  <>
    <rect x="4" y="4.5" width="6.25" height="8" rx="1.25" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M4 10.75H3.25A1.25 1.25 0 0 1 2 9.5V3.5A1.25 1.25 0 0 1 3.25 2.25h4.25A1.25 1.25 0 0 1 8.75 3.5V4.5"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </>
);

/** Same sheets as copy-in; arrow out — session clipboard → local (templates/icon-copy-out.html). */
export function IconCopyOut() {
  return (
    <svg viewBox="0 0 16 16" fill="none">
      {clipboardSheets}
      <path
        d="M11.25 8.5H14.5M13 6.75 14.75 8.5 13 10.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Same sheets as copy-out; arrow in — local clipboard → session (templates/icon-copy-in.html). */
export function IconCopyIn() {
  return (
    <svg viewBox="0 0 16 16" fill="none">
      {clipboardSheets}
      <path
        d="M14.5 8.5H11.25M12.75 6.75 11 8.5 12.75 10.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconUpload() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 10V3m0 0L5.25 5.75M8 3l2.75 2.75" />
      <path d="M3 10v2.5A1.5 1.5 0 0 0 4.5 14h7a1.5 1.5 0 0 0 1.5-1.5V10" />
    </svg>
  );
}

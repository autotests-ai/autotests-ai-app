/** Panel bar reset — 16×16, stroke 1.5 (pair with copy/download; templates/icon-reset.html). */
export function IconReset() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 8a5.5 5.5 0 1 0 5.5-5.5 6 6 0 0 0-4.1 1.83L2.5 3.5" />
      <path d="M2.5 2.5v3h3" />
    </svg>
  );
}

/** Panel bar copy — 16×16, stroke 1.5 (pair with reset/download; templates/icon-copy.html). */
export function IconCopy() {
  return (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="5" width="8" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5 11H4a1.5 1.5 0 0 1-1.5-1.5V4A1.5 1.5 0 0 1 4 2.5h5.5A1.5 1.5 0 0 1 11 4v1"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

/** Panel bar download — tray A, 16×16, stroke 1.5 (templates/icon-download.html). */
export function IconDownload() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M8 2.5v7" />
      <path d="m5.25 7 2.75 2.75L10.75 7" />
      <path d="M3 11v1.5A1.5 1.5 0 0 0 4.5 14h7a1.5 1.5 0 0 0 1.5-1.5V11" />
    </svg>
  );
}

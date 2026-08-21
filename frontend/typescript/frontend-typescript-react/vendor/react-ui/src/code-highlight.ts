export type HighlightKind = 'shell' | 'json' | 'plain' | 'curl' | 'markdown';

export type HighlightOptions = {
  prefix?: string;
};

const JSON_TOKEN =
  /("(\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g;

/** Escape for HTML text nodes; keeps `"` for JSON_TOKEN matching. */
function escapeHtmlKeepQuotes(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapToken(prefix: string, cls: string, text: string): string {
  return `<span class="${prefix}-${cls}">${escapeHtml(text)}</span>`;
}

export function highlightJson(json: string, options?: HighlightOptions): string {
  const prefix = options?.prefix ?? 'ch-tok';
  let html = escapeHtmlKeepQuotes(json);

  html = html.replace(JSON_TOKEN, (match) => {
    let cls = `${prefix}-str`;
    if (/^"/.test(match)) {
      if (/:\s*$/.test(match)) {
        const key = match.replace(/:\s*$/, '');
        return (
          `<span class="${prefix}-key">${key}</span>` +
          `<span class="${prefix}-punct">:</span>`
        );
      }
      cls = `${prefix}-str`;
    } else if (match === 'true' || match === 'false') {
      cls = `${prefix}-bool`;
    } else if (match === 'null') {
      cls = `${prefix}-null`;
    } else {
      cls = `${prefix}-num`;
    }
    return `<span class="${cls}">${match}</span>`;
  });

  html = html.replace(/([{}\[\],])/g, (ch) => {
    return `<span class="${prefix}-punct">${ch}</span>`;
  });

  return html;
}

function highlightShellValue(value: string, prefix: string): string {
  if (value === 'true' || value === 'false') {
    return wrapToken(prefix, 'bool', value);
  }
  if (/^-?\d+(?:\.\d+)?$/.test(value)) {
    return wrapToken(prefix, 'num', value);
  }
  return wrapToken(prefix, 'str', value);
}

function highlightUrlToken(token: string, prefix: string): string | null {
  const match = token.match(/^(["'])([a-z][\w+.-]*:\/\/)([^/?#]+)([^?#]*)(?:\?([^#]*))?(#.*)?\1$/i);
  if (!match) return null;

  const [, quote, protocol, host, path, query, hash = ''] = match;
  const queryHtml = query
    ? wrapToken(prefix, 'punct', '?') +
      query
        .split('&')
        .map((parameter) => {
          const separator = parameter.indexOf('=');
          if (separator < 0) return wrapToken(prefix, 'key', parameter);
          return (
            wrapToken(prefix, 'key', parameter.slice(0, separator)) +
            wrapToken(prefix, 'punct', '=') +
            wrapToken(prefix, 'str', parameter.slice(separator + 1))
          );
        })
        .join(wrapToken(prefix, 'punct', '&'))
    : '';

  return (
    wrapToken(prefix, 'punct', quote) +
    wrapToken(prefix, 'comment', protocol) +
    wrapToken(prefix, 'cmd', host) +
    wrapToken(prefix, 'str', path) +
    queryHtml +
    wrapToken(prefix, 'comment', hash) +
    wrapToken(prefix, 'punct', quote)
  );
}

function highlightShellToken(token: string, prefix: string): string {
  if (/^\s*#/.test(token)) {
    return wrapToken(prefix, 'comment', token);
  }
  const highlightedUrl = highlightUrlToken(token, prefix);
  if (highlightedUrl) {
    return highlightedUrl;
  }
  if (/^'/.test(token)) {
    return wrapToken(prefix, 'str', token);
  }
  if (/^\\/.test(token)) {
    return wrapToken(prefix, 'punct', token);
  }
  if (/^-D/.test(token)) {
    const eq = token.indexOf('=');
    if (eq < 0) {
      return wrapToken(prefix, 'key', token);
    }
    return (
      wrapToken(prefix, 'key', token.slice(0, eq)) +
      wrapToken(prefix, 'punct', '=') +
      highlightShellValue(token.slice(eq + 1), prefix)
    );
  }
  if (token === 'curl') {
    return wrapToken(prefix, 'cmd', token);
  }
  if (
    /^--/.test(token) ||
    /^-[a-zA-Z]+$/.test(token) ||
    /^(POST|GET|PUT|DELETE|PATCH|HEAD)$/.test(token) ||
    token === 'export' ||
    token === 'test' ||
    token === './gradlew' ||
    token === 'gradle' ||
    token === 'allurectl' ||
    /^ALLURE_/.test(token) ||
    token === 'TEST_CASE_ID'
  ) {
    return wrapToken(prefix, 'key', token);
  }
  return escapeHtml(token);
}

const SHELL_TOKEN =
  /["'](?:wss?|https?):\/\/[^"']*["']|'[^']*'|-D[\w.]+(?:=[^\s\\']*)?|--[\w-]+|\bcurl\b|\.\/gradlew|allurectl|\bgradle\b|\bexport\b|\btest\b|\b(?:POST|GET|PUT|DELETE|PATCH|HEAD)\b|\b(?:ALLURE_[A-Z_]+|TEST_CASE_ID)\b|-[a-zA-Z]+\b|\\\s*$|\s+#.*$/g;

function highlightShellLine(line: string, prefix: string): string {
  if (/^\s*#/.test(line)) {
    return wrapToken(prefix, 'comment', line);
  }

  let html = '';
  let last = 0;
  let match: RegExpExecArray | null;

  SHELL_TOKEN.lastIndex = 0;
  while ((match = SHELL_TOKEN.exec(line)) !== null) {
    html += escapeHtml(line.slice(last, match.index));
    html += highlightShellToken(match[0], prefix);
    last = match.index + match[0].length;
  }
  html += escapeHtml(line.slice(last));
  return html;
}

export function highlightShell(text: string, options?: HighlightOptions): string {
  const prefix = options?.prefix ?? 'ch-tok';
  return String(text)
    .split('\n')
    .map((line) => highlightShellLine(line, prefix))
    .join('\n');
}

/**
 * `-d '{ … }'` / `-d'{ … }'` (possibly multiline). Returns null when the pattern is absent.
 */
function tryHighlightCurlQuotedData(
  text: string,
  options?: HighlightOptions,
): string | null {
  const prefix = options?.prefix ?? 'ch-tok';
  const lines = String(text).split('\n');
  // Capabilities curl uses `-d'{` (no space); configurator uses `-d '{`.
  const openIdx = lines.findIndex((line) => /(?:^|\s)-d\s*'/.test(line));
  if (openIdx < 0) return null;

  const openLine = lines[openIdx];
  const m = openLine.match(/^(.*-d\s*)'(.*)$/);
  if (!m) return null;

  const openWithoutQuote = m[1];
  const afterOpen = m[2];

  let jsonText: string;
  let closeIdx: number;

  const sameLineClose = afterOpen.indexOf("'");
  if (sameLineClose >= 0) {
    jsonText = afterOpen.slice(0, sameLineClose);
    closeIdx = openIdx;
  } else {
    const parts = [afterOpen];
    closeIdx = -1;
    for (let i = openIdx + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.endsWith("'")) {
        parts.push(line.slice(0, -1));
        closeIdx = i;
        break;
      }
      parts.push(line);
    }
    if (closeIdx < 0) return null;
    jsonText = parts.join('\n');
  }

  const openHl =
    highlightShellLine(openWithoutQuote, prefix) + wrapToken(prefix, 'punct', "'");
  const body = highlightJson(jsonText, options);
  const closeQuote = wrapToken(prefix, 'punct', "'");
  const head = lines.slice(0, openIdx).map((line) => highlightShellLine(line, prefix));
  const bodyLines = body.split('\n');

  if (closeIdx === openIdx || bodyLines.length === 1) {
    return [...head, openHl + body + closeQuote].join('\n');
  }

  const first = openHl + bodyLines[0];
  const mid = bodyLines.slice(1, -1);
  const last = bodyLines[bodyLines.length - 1] + closeQuote;
  return [...head, first, ...mid, last].join('\n');
}

/**
 * Shell + JSON for curl via `-d '{…}'` (multiline ok). Falls back to plain shell.
 * Name kept for API stability.
 */
export function highlightCurlHeredoc(text: string, options?: HighlightOptions): string {
  return tryHighlightCurlQuotedData(text, options) ?? highlightShell(text, options);
}

/**
 * Lightweight markdown for Agent prompts: headings, fenced JSON, inline
 * `code` / **bold**, list dashes. Same `.ch-tok-*` palette as shell/json.
 */
export function highlightMarkdown(text: string, options?: HighlightOptions): string {
  const prefix = options?.prefix ?? 'ch-tok';
  const lines = String(text).split('\n');
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const fenceOpen = line.match(/^```(\w*)\s*$/);
    if (fenceOpen) {
      out.push(wrapToken(prefix, 'punct', line));
      i += 1;
      const body: string[] = [];
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        body.push(lines[i]);
        i += 1;
      }
      const lang = fenceOpen[1] || '';
      if (lang === 'json' || (body.length > 0 && /^\s*[{[]/.test(body[0]))) {
        out.push(highlightJson(body.join('\n'), options));
      } else {
        out.push(...body.map((l) => escapeHtml(l)));
      }
      if (i < lines.length && /^```\s*$/.test(lines[i])) {
        out.push(wrapToken(prefix, 'punct', lines[i]));
        i += 1;
      }
      continue;
    }

    out.push(highlightMarkdownLine(line, prefix));
    i += 1;
  }

  return out.join('\n');
}

function highlightMarkdownInline(text: string, prefix: string): string {
  let html = '';
  let last = 0;
  const re = /`([^`]+)`|\*\*([^*]+)\*\*/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    html += escapeHtml(text.slice(last, match.index));
    if (match[1] != null) {
      html += wrapToken(prefix, 'punct', '`');
      html += wrapToken(prefix, 'str', match[1]);
      html += wrapToken(prefix, 'punct', '`');
    } else {
      html += wrapToken(prefix, 'punct', '**');
      html += wrapToken(prefix, 'key', match[2]);
      html += wrapToken(prefix, 'punct', '**');
    }
    last = match.index + match[0].length;
  }
  html += escapeHtml(text.slice(last));
  return html;
}

function highlightMarkdownLine(line: string, prefix: string): string {
  if (/^#{1,6}\s/.test(line)) {
    const m = line.match(/^(#{1,6})(\s+)(.*)$/);
    if (!m) return escapeHtml(line);
    return (
      wrapToken(prefix, 'cmd', m[1]) +
      escapeHtml(m[2]) +
      highlightMarkdownInline(m[3], prefix)
    );
  }
  if (/^-\s/.test(line)) {
    return wrapToken(prefix, 'punct', '-') + highlightMarkdownInline(line.slice(1), prefix);
  }
  return highlightMarkdownInline(line, prefix);
}

export function trimOutputBlankLines(text: string): string {
  return String(text).replace(/^\n+/, '').replace(/\n+$/, '');
}

export function highlightOutput(text: string, kind: HighlightKind): string {
  const trimmed = trimOutputBlankLines(text);
  switch (kind) {
    case 'json':
      return highlightJson(trimmed);
    case 'shell':
      return highlightShell(trimmed);
    case 'curl':
      return highlightCurlHeredoc(trimmed);
    case 'markdown':
      return highlightMarkdown(trimmed);
    case 'plain':
    default:
      return escapeHtml(trimmed);
  }
}

/** Mount highlighted terminal output — always colored (`.ch-code` + tokens). */
export function mountHighlightedOutput(
  el: Element | null | undefined,
  text: string,
  kind: HighlightKind = 'json',
): void {
  if (!el) return;
  el.classList.add('ch-code');
  el.innerHTML = highlightOutput(text, kind);
}

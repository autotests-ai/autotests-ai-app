import type { AnchorHTMLAttributes, CSSProperties, HTMLAttributes } from 'react';
import { cn } from './cn';

export interface BrandLogoProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'href'> {
  /** Present → `<a class="brand-logo-link">`; omit → `<span>` (catalog endorsed). */
  href?: string;
  /** Stack `by qa.guru` under the wordmark → `.brand-logo--endorsed`. */
  endorsed?: boolean;
  /** Lockup size → `--brand-logo-size`. CSS default `20px`. Catalog endorsed `34`. */
  size?: number;
  /** Wordmark. Default `Selenoid`. */
  word?: string;
  /** Version accent inside the wordmark. Default `3`. */
  ver?: string;
}

export interface BrandAttributionProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** Standalone catalog size (`12px`). Nested composition leaves CSS `0.36em`. */
  size?: number;
}

function BrandLogoMark() {
  return (
    <svg
      className="brand-logo__mark"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="1.6"
        y="1.6"
        width="20.8"
        height="20.8"
        rx="6.2"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      <rect x="7" y="7" width="10" height="10" rx="3" fill="currentColor" />
    </svg>
  );
}

function BrandAttributionInner() {
  return (
    <>
      <span>by</span>
      <span className="brand-attribution__name">
        qa<span className="brand-attribution__dot">.</span>guru
      </span>
    </>
  );
}

/**
 * Selenoid lockup (`.brand-logo` / `.brand-logo-link`). Thin wrapper —
 * markup SSOT: `design-system/templates/brand-logo.html` /
 * `css/brand-logo.css`. Catalog: `preview/chrome.html#section-brand-logo`.
 * Inline nested-square `svg.brand-logo__mark` (not `header__brand-logo`,
 * not `img`, not a vendor asset). Size `--brand-logo-size` (default `20px`).
 * Default `data-testid` `brand-logo` (template + catalog plain); endorsed
 * composition has none. `href` → `<a>`, otherwise `<span>`. Not `QaGuruLogo`,
 * `AllureLogo`, `AppHeader`, `Badge`, `Status`, `StatusTile`, `Indicator`,
 * `Callout`, `Panel`.
 */
export function BrandLogo({
  href,
  endorsed = false,
  size,
  word = 'Selenoid',
  ver = '3',
  className,
  style,
  'aria-label': ariaLabel,
  ...rest
}: BrandLogoProps) {
  const name = `${word} ${ver}`;
  const testId = endorsed ? undefined : 'brand-logo';
  const logoStyle =
    size != null || style
      ? ({
          ...(size != null ? { ['--brand-logo-size']: `${size}px` } : {}),
          ...style,
        } as CSSProperties)
      : undefined;

  const classNames = cn(
    'brand-logo',
    endorsed && 'brand-logo--endorsed',
    'brand-logo-link',
    className,
  );

  const content = (
    <>
      <BrandLogoMark />
      <span
        className="brand-logo__copy"
        aria-hidden={endorsed ? true : undefined}
      >
        <span className="brand-logo__word">
          {word}
          <span className="brand-logo__ver">{ver}</span>
        </span>
        {endorsed ? (
          <span className="brand-attribution">
            <BrandAttributionInner />
          </span>
        ) : null}
      </span>
    </>
  );

  const rootProps = {
    'data-testid': testId,
    ...rest,
    className: classNames,
    style: logoStyle,
    'aria-label': ariaLabel ?? (endorsed ? `${name} by qa.guru` : name),
  };

  if (href != null) {
    return (
      <a {...rootProps} href={href}>
        {content}
      </a>
    );
  }

  return <span {...rootProps}>{content}</span>;
}

/**
 * Reusable `by qa.guru` byline (`span.brand-attribution`). Catalog standalone
 * uses `size={12}` (`font-size: 12px`). Nested under endorsed `BrandLogo`
 * copy is `aria-hidden` on the parent — this companion is labeled
 * `by qa.guru` and has no default `data-testid`.
 */
export function BrandAttribution({
  size,
  className,
  style,
  'aria-label': ariaLabel = 'by qa.guru',
  ...rest
}: BrandAttributionProps) {
  const attributionStyle =
    size != null || style
      ? ({
          ...(size != null ? { fontSize: `${size}px` } : {}),
          ...style,
        } as CSSProperties)
      : undefined;

  return (
    <span
      {...rest}
      className={cn('brand-attribution', className)}
      aria-label={ariaLabel}
      style={attributionStyle}
    >
      <BrandAttributionInner />
    </span>
  );
}

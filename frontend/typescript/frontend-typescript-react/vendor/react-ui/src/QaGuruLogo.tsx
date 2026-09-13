import type { CSSProperties, ImgHTMLAttributes } from 'react';
import { cn } from './cn';

export type QaGuruLogoSize = 32 | 24 | 16;

export interface QaGuruLogoProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'children'> {
  /** Host-served asset URL. The library does not vendor the SVG. */
  src: string;
  /** Catalog size → `--qa-guru-logo-size` and HTML width/height. Default 32. */
  size?: QaGuruLogoSize;
}

/**
 * QA.GURU brand mark (`img.qa-guru-logo`). Thin wrapper —
 * markup SSOT: `design-system/templates/qa-guru-logo.html` /
 * `css/qa-guru-logo.css`. Catalog: `preview/chrome.html#section-qa-guru-logo`.
 * Square; size `--qa-guru-logo-size` (default `32px`) + HTML width/height;
 * `object-fit: contain`. Catalog 32 / 24 / 16. Default `data-testid`
 * `qa-guru-logo` (template); catalog 32 → `qa-guru-logo-32`. Alt `qa.guru`
 * on 32; 24/16 decorative (`alt=""` + `aria-hidden`). Not `BrandLogo`,
 * `AllureLogo`, `Badge`, `Status`, `StatusTile`, `Indicator`, `Callout`,
 * `Panel`.
 */
export function QaGuruLogo({
  src,
  size,
  className,
  alt,
  width,
  height,
  style,
  'aria-hidden': ariaHidden,
  ...rest
}: QaGuruLogoProps) {
  const px = size ?? 32;
  const decorative = size === 24 || size === 16;
  const resolvedAlt = alt ?? (decorative ? '' : 'qa.guru');
  const testId =
    size == null ? 'qa-guru-logo' : size === 32 ? 'qa-guru-logo-32' : undefined;
  const logoStyle =
    size != null || style
      ? ({
          ...(size != null ? { ['--qa-guru-logo-size']: `${size}px` } : {}),
          ...style,
        } as CSSProperties)
      : undefined;

  return (
    <img
      data-testid={testId}
      {...rest}
      className={cn('qa-guru-logo', className)}
      src={src}
      alt={resolvedAlt}
      width={width ?? px}
      height={height ?? px}
      aria-hidden={
        ariaHidden ?? (decorative && resolvedAlt === '' ? true : undefined)
      }
      style={logoStyle}
    />
  );
}

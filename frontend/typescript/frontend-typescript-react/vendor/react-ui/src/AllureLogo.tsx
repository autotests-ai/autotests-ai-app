import type { ImgHTMLAttributes } from 'react';
import { cn } from './cn';

export type AllureLogoVariant =
  | 'allure-1'
  | 'allure-2'
  | 'allure-3'
  | 'allure-testops'
  | 'testops-ru';

type AllureLogoMeta = {
  alt: string;
  testId: string;
  /** HTML fallback width; CSS `width: auto` follows the mark’s ratio. */
  width: number;
};

const ALLURE_LOGO: Record<AllureLogoVariant, AllureLogoMeta> = {
  'allure-1': {
    alt: 'Allure 1',
    testId: 'allure-logo-allure-1',
    width: 36,
  },
  'allure-2': {
    alt: 'Allure 2',
    testId: 'allure-logo-allure-2',
    width: 32,
  },
  'allure-3': {
    alt: 'Allure 3',
    testId: 'allure-logo-allure-3',
    width: 32,
  },
  'allure-testops': {
    alt: 'Allure TestOps',
    testId: 'allure-logo-allure-testops',
    width: 32,
  },
  'testops-ru': {
    alt: 'ТестОпс',
    testId: 'allure-logo-testops-ru',
    width: 32,
  },
};

export interface AllureLogoProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'children'> {
  /** Catalog mark → `.allure-logo--{variant}`. */
  variant: AllureLogoVariant;
  /** Host-served asset URL. The library does not vendor Allure SVG. */
  src: string;
}

/**
 * Official Allure / TestOps mark (`img.allure-logo`). Thin wrapper —
 * markup SSOT: `design-system/templates/allure-logo.html` /
 * `css/allure-logo.css`. Catalog: `preview/chrome.html#section-allure-logo`.
 * Height `--allure-logo-height` (default `32px`); width auto; `object-fit:
 * contain`. Allure 1 HTML fallback width `36`, others `32`. Not `QaGuruLogo`,
 * `BrandLogo`, `Badge`, `Status`, `StatusTile`, `Indicator`, `Callout`, `Panel`.
 */
export function AllureLogo({
  variant,
  src,
  className,
  alt,
  width,
  height,
  ...rest
}: AllureLogoProps) {
  const meta = ALLURE_LOGO[variant];

  return (
    <img
      data-testid={meta.testId}
      {...rest}
      className={cn('allure-logo', `allure-logo--${variant}`, className)}
      src={src}
      alt={alt ?? meta.alt}
      width={width ?? meta.width}
      height={height ?? 32}
    />
  );
}

/** Generated sibling of `env-hosts.js` — `PUBLIC_HOST` from deploy/matrix.yaml. */
export const PUBLIC_HOST: string;
export const PROD_ORIGIN: string;
export const STAGE_ORIGIN: string;
export function productHost(hostname?: string): string;
export function envOrigins(hostname?: string): { prod: string; stage: string };
export function envNavItems(hostname?: string): Array<{
  href: string;
  label: string;
  testid: string;
  match: 'host';
}>;

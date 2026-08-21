import { describe, expect, it } from 'vitest';
import { apiUrl, APP_BASE, appPath, API_BASE } from '../../lib/appBase';

describe('appBase — apex document root', () => {
  it('keeps the SPA and API at origin paths', () => {
    expect(APP_BASE).toBe('');
    expect(API_BASE).toBe('/api');
    expect(appPath('/')).toBe('/');
    expect(appPath('/js/header.js')).toBe('/js/header.js');
    expect(apiUrl('/health')).toBe('/api/health');
    expect(apiUrl('/api/health')).toBe('/api/health');
  });

  it('normalizes relative and empty paths', () => {
    expect(appPath('js/header.js')).toBe('/js/header.js');
    expect(appPath('')).toBe('/');
    expect(appPath(null as unknown as string)).toBe('/');
    expect(apiUrl('health')).toBe('/api/health');
    expect(apiUrl('/api')).toBe('/api');
    expect(apiUrl('')).toBe('/api');
  });
});

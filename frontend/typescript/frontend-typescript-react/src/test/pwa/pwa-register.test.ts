import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_SW_URL,
  PWA_ICON_PATHS,
  PWA_SW_CONTRACT,
  registerServiceWorker,
} from '../../pwa/pwa-register.js';

describe('pwa-register controllerchange reload', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function stubSw(controller: ServiceWorker | null) {
    const listeners = new Map<string, EventListener>();
    const register = vi.fn().mockResolvedValue({ update: vi.fn().mockResolvedValue(undefined) });
    const addEventListener = vi.fn((type: string, handler: EventListener) => {
      listeners.set(type, handler);
    });
    const reload = vi.fn();
    vi.stubGlobal('navigator', {
      serviceWorker: { controller, register, addEventListener },
    });
    vi.stubGlobal('location', { reload });
    return {
      emit(type: string) {
        listeners.get(type)?.(new Event(type));
      },
      reload,
      register,
      addEventListener,
    };
  }

  it('does not reload on first claim (no prior controller)', () => {
    const sw = stubSw(null);
    registerServiceWorker({ swUrl: '/sw.js' });
    sw.emit('controllerchange');
    expect(sw.reload).not.toHaveBeenCalled();
  });

  it('reloads when an existing controller is replaced', () => {
    const sw = stubSw({} as ServiceWorker);
    registerServiceWorker({ swUrl: '/sw.js' });
    sw.emit('controllerchange');
    expect(sw.reload).toHaveBeenCalledTimes(1);
  });

  it('reloads at most once per registration', () => {
    const sw = stubSw({} as ServiceWorker);
    registerServiceWorker({ swUrl: '/sw.js' });
    sw.emit('controllerchange');
    sw.emit('controllerchange');
    expect(sw.reload).toHaveBeenCalledTimes(1);
  });

  it('exports the PWA contract constants', () => {
    expect(DEFAULT_SW_URL).toBe('/sw.js');
    expect(PWA_ICON_PATHS).toContain('icons/pwa-192.png');
    expect(PWA_SW_CONTRACT.registerType).toBe('autoUpdate');
  });

  it('no-ops when serviceWorker is missing', () => {
    vi.stubGlobal('navigator', {});
    expect(() => registerServiceWorker()).not.toThrow();
  });

  it('does not listen for controllerchange when reload is disabled', () => {
    const sw = stubSw(null);
    registerServiceWorker({ reloadOnControllerChange: false, swUrl: '/sw.js' });
    expect(sw.addEventListener).not.toHaveBeenCalled();
    expect(sw.register).toHaveBeenCalledWith('/sw.js');
  });

  it('calls onRegistered after a successful register', async () => {
    const onRegistered = vi.fn();
    stubSw(null);
    registerServiceWorker({ swUrl: '/sw.js', onRegistered });
    await Promise.resolve();
    expect(onRegistered).toHaveBeenCalled();
  });

  it('swallows a failed update() on the registration', async () => {
    const onRegistered = vi.fn();
    const update = vi.fn().mockRejectedValue(new Error('update failed'));
    const register = vi.fn().mockResolvedValue({ update });
    vi.stubGlobal('navigator', {
      serviceWorker: { controller: null, register, addEventListener: vi.fn() },
    });
    registerServiceWorker({ swUrl: '/sw.js', onRegistered });
    await vi.waitFor(() => {
      expect(onRegistered).toHaveBeenCalled();
    });
    expect(update).toHaveBeenCalled();
  });

  it('warns when register rejects without onRegisterError', async () => {
    const register = vi.fn().mockRejectedValue(new Error('fail'));
    vi.stubGlobal('navigator', {
      serviceWorker: { controller: null, register, addEventListener: vi.fn() },
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    registerServiceWorker({ swUrl: '/sw.js' });
    await vi.waitFor(() => {
      expect(warn).toHaveBeenCalled();
    });
  });

  it('skips update() when the registration has none', async () => {
    const onRegistered = vi.fn();
    const register = vi.fn().mockResolvedValue({});
    vi.stubGlobal('navigator', {
      serviceWorker: { controller: null, register, addEventListener: vi.fn() },
    });
    registerServiceWorker({ swUrl: '/sw.js', onRegistered });
    await Promise.resolve();
    expect(onRegistered).toHaveBeenCalled();
  });

  it('calls onRegisterError when register rejects', async () => {
    const onRegisterError = vi.fn();
    const register = vi.fn().mockRejectedValue(new Error('fail'));
    vi.stubGlobal('navigator', {
      serviceWorker: { controller: null, register, addEventListener: vi.fn() },
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    registerServiceWorker({ swUrl: '/sw.js', onRegisterError });
    await vi.waitFor(() => {
      expect(onRegisterError).toHaveBeenCalled();
    });
    expect(warn).toHaveBeenCalled();
  });

  it('defers register until load when immediate is false', () => {
    const sw = stubSw(null);
    const loadHandlers: Array<() => void> = [];
    vi.spyOn(window, 'addEventListener').mockImplementation((type, handler) => {
      if (type === 'load') {
        loadHandlers.push(handler as () => void);
      }
    });
    registerServiceWorker({ immediate: false, swUrl: '/sw.js' });
    expect(sw.register).not.toHaveBeenCalled();
    loadHandlers[0]?.();
    expect(sw.register).toHaveBeenCalledWith('/sw.js');
  });
});

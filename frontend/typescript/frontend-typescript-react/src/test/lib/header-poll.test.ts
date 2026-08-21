import { afterEach, describe, expect, it, vi } from 'vitest';

const { mountHeaderPollToggle } = vi.hoisted(() => ({
  mountHeaderPollToggle: vi.fn(() => () => {}),
}));

vi.mock('../../../vendor/ds/js/poll-toggle.js', () => ({
  mountHeaderPollToggle,
}));

import { bindStackHeaderPoll, whenHeaderReady } from '../../lib/header-poll';

describe('header-poll', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('binds immediately when header-tools is already mounted', () => {
    document.body.innerHTML = '<div data-testid="header-tools"></div>';
    const disposeInner = vi.fn();
    const bind = vi.fn(() => disposeInner);
    const dispose = whenHeaderReady(bind);
    expect(bind).toHaveBeenCalledTimes(1);
    dispose();
    expect(disposeInner).toHaveBeenCalledTimes(1);
  });

  it('waits for header-tools then disconnects the observer', async () => {
    const bind = vi.fn(() => () => {});
    const dispose = whenHeaderReady(bind);
    expect(bind).not.toHaveBeenCalled();
    const tools = document.createElement('div');
    tools.setAttribute('data-testid', 'header-tools');
    document.body.append(tools);
    await vi.waitFor(() => {
      expect(bind).toHaveBeenCalledTimes(1);
    });
    tools.append(document.createElement('span'));
    await Promise.resolve();
    expect(bind).toHaveBeenCalledTimes(1);
    dispose();
  });

  it('disposes the observer if unmounted before the header appears', () => {
    const bind = vi.fn(() => () => {});
    const dispose = whenHeaderReady(bind);
    dispose();
    const tools = document.createElement('div');
    tools.setAttribute('data-testid', 'header-tools');
    document.body.append(tools);
    expect(bind).not.toHaveBeenCalled();
  });

  it('injects the vendor poll toggle once header-tools exists', () => {
    document.body.innerHTML = '<div data-testid="header-tools"></div>';
    const onTick = vi.fn();
    const dispose = bindStackHeaderPoll(onTick);
    expect(mountHeaderPollToggle).toHaveBeenCalledWith({
      defaultOn: true,
      onTick,
    });
    dispose();
  });
});

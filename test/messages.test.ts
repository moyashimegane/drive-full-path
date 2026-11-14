import { describe, expect, it, vi } from 'vitest';
import { handleRequest } from '../src/content/messages';

const controllerWith = (navigate: (id: string) => Promise<void>) => ({
  getPath: vi.fn().mockResolvedValue({ ok: true, path: [{ id: 'a', name: 'A' }] }),
  navigate: vi.fn(navigate),
});

describe('handleRequest', () => {
  it('answers a path request with the controller result', async () => {
    const controller = controllerWith(async () => {});
    await expect(handleRequest(controller, { type: 'dfp:getPath' })).resolves.toEqual({
      ok: true,
      path: [{ id: 'a', name: 'A' }],
    });
  });

  it('navigates and reports success', async () => {
    const controller = controllerWith(async () => {});
    await expect(handleRequest(controller, { type: 'dfp:navigate', id: 'a' })).resolves.toEqual({ ok: true });
    expect(controller.navigate).toHaveBeenCalledWith('a');
  });

  it('reports a failed navigation', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const controller = controllerWith(async () => {
      throw new Error('boom');
    });
    await expect(handleRequest(controller, { type: 'dfp:navigate', id: 'a' })).resolves.toEqual({ ok: false });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

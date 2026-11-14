import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_COPY_SETTINGS, SETTINGS_KEY, loadCopySettings, parseCopySettings, saveCopySettings } from '../src/shared/settings';

afterEach(() => { vi.unstubAllGlobals(); });

describe('copy settings', () => {
  it('uses an empty prefix and the "/" separator before any settings are saved', async () => {
    vi.stubGlobal('chrome', { storage: { local: { get: vi.fn().mockResolvedValue({}) } } });
    expect(await loadCopySettings()).toEqual({ prefix: '', separator: '/' });
    expect(chrome.storage.local.get).toHaveBeenCalledWith(SETTINGS_KEY);
  });

  it('persists the edited prefix including an empty string', async () => {
    const values: Record<string, unknown> = {};
    vi.stubGlobal('chrome', { storage: { local: {
      get: vi.fn(async () => values),
      set: vi.fn(async (update) => { Object.assign(values, update); }),
    } } });
    await saveCopySettings({ prefix: 'custom:', separator: '/' });
    expect(await loadCopySettings()).toEqual({ prefix: 'custom:', separator: '/' });
    await saveCopySettings({ prefix: '', separator: '/' });
    expect(await loadCopySettings()).toEqual({ prefix: '', separator: '/' });
  });

  it('persists the backslash separator', async () => {
    const values: Record<string, unknown> = {};
    vi.stubGlobal('chrome', { storage: { local: {
      get: vi.fn(async () => values),
      set: vi.fn(async (update) => { Object.assign(values, update); }),
    } } });
    await saveCopySettings({ prefix: 'custom:', separator: '\\' });
    expect(await loadCopySettings()).toEqual({ prefix: 'custom:', separator: '\\' });
  });

  it('uses defaults for malformed stored values', () => {
    expect(parseCopySettings(null)).toEqual(DEFAULT_COPY_SETTINGS);
    expect(parseCopySettings('invalid')).toEqual(DEFAULT_COPY_SETTINGS);
    expect(parseCopySettings({ prefix: 42 })).toEqual(DEFAULT_COPY_SETTINGS);
    expect(parseCopySettings({ prefix: 'custom:' })).toEqual({ ...DEFAULT_COPY_SETTINGS, prefix: 'custom:' });
  });

  it('falls back to "/" for any separator other than "/" and "\\"', () => {
    expect(parseCopySettings({ prefix: 'custom:', separator: '' })).toEqual({ prefix: 'custom:', separator: '/' });
    expect(parseCopySettings({ prefix: 'custom:', separator: ' > ' })).toEqual({ prefix: 'custom:', separator: '/' });
    expect(parseCopySettings({ prefix: 'custom:', separator: 1 })).toEqual({ prefix: 'custom:', separator: '/' });
  });

  it('keeps a prefix saved before the separator setting existed and uses "/"', () => {
    expect(parseCopySettings({ prefix: '/Volumes/Drive/' })).toEqual({ prefix: '/Volumes/Drive/', separator: '/' });
  });

  it('keeps the saved prefix and ignores the removed drive name setting', () => {
    expect(parseCopySettings({ prefix: '/Volumes/Drive/', driveName: '001_Team' })).toEqual({ prefix: '/Volumes/Drive/', separator: '/' });
  });
});

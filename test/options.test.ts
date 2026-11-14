import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initOptions, type OptionsApi } from '../src/options/options';
import { DEFAULT_COPY_SETTINGS } from '../src/shared/settings';
import { sleep } from '../src/content/wait';

const OPTIONS_BODY = /<body>([\s\S]*)<\/body>/.exec(readFileSync('static/options.html', 'utf8'))?.[1] ?? '';
const makeApi = (overrides: Partial<OptionsApi> = {}): OptionsApi => ({
  getMessage: vi.fn((key: string) => `msg:${key}`),
  loadSettings: vi.fn().mockResolvedValue(DEFAULT_COPY_SETTINGS),
  saveSettings: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});
const prefix = (): HTMLTextAreaElement => document.querySelector<HTMLTextAreaElement>('#prefix')!;
const separator = (): HTMLSelectElement => document.querySelector<HTMLSelectElement>('#separator')!;
const save = (): HTMLButtonElement => document.querySelector<HTMLButtonElement>('#save')!;
const status = (): string | null | undefined => document.querySelector('#status')?.textContent;

beforeEach(() => { document.body.innerHTML = OPTIONS_BODY; });

describe('options', () => {
  it('shows the prefix and the separator for editing', async () => {
    await initOptions(document, makeApi());
    expect(prefix().value).toBe(DEFAULT_COPY_SETTINGS.prefix);
    expect(separator().value).toBe('/');
    expect(document.querySelectorAll('input, textarea, select')).toHaveLength(2);
    expect(prefix().disabled).toBe(false);
    expect(separator().disabled).toBe(false);
    expect(save().disabled).toBe(false);
    expect(document.title).toBe('msg:optionsTitle');
  });

  it('offers "/" and "\\" as the only separators', async () => {
    await initOptions(document, makeApi());
    const options = Array.from(separator().options);
    expect(options.map((option) => option.value)).toEqual(['/', '\\']);
    expect(options.map((option) => option.textContent)).toEqual(['msg:separatorSlash', 'msg:separatorBackslash']);
  });

  it('shows the saved separator', async () => {
    await initOptions(document, makeApi({ loadSettings: vi.fn().mockResolvedValue({ prefix: 'G:\\', separator: '\\' }) }));
    expect(prefix().value).toBe('G:\\');
    expect(separator().value).toBe('\\');
  });

  it('saves the edited values and clears the saved message on further edits', async () => {
    const api = makeApi();
    await initOptions(document, api);
    prefix().value = '/Volumes/Drive/';
    save().click();
    expect(save().disabled).toBe(true);
    await sleep(0);
    expect(api.saveSettings).toHaveBeenCalledWith({ prefix: '/Volumes/Drive/', separator: '/' });
    expect(status()).toBe('msg:settingsSaved');
    expect(save().disabled).toBe(false);
    prefix().dispatchEvent(new Event('input', { bubbles: true }));
    expect(status()).toBe('');
  });

  it('saves the selected separator', async () => {
    const api = makeApi();
    await initOptions(document, api);
    separator().value = '\\';
    save().click();
    await sleep(0);
    expect(api.saveSettings).toHaveBeenCalledWith({ prefix: DEFAULT_COPY_SETTINGS.prefix, separator: '\\' });
  });

  it('allows disabling the prefix', async () => {
    const api = makeApi({ loadSettings: vi.fn().mockResolvedValue({ prefix: '/Volumes/Drive/', separator: '/' }) });
    await initOptions(document, api);
    prefix().value = '';
    save().click();
    await sleep(0);
    expect(api.saveSettings).toHaveBeenCalledWith({ prefix: '', separator: '/' });
  });

  it('prevents overwriting settings when loading fails', async () => {
    const api = makeApi({ loadSettings: vi.fn().mockRejectedValue(new Error('failed')) });
    await initOptions(document, api);
    expect(save().disabled).toBe(true);
    expect(prefix().disabled).toBe(true);
    expect(separator().disabled).toBe(true);
    expect(status()).toBe('msg:settingsLoadFailed');
    expect(api.saveSettings).not.toHaveBeenCalled();
  });

  it('allows retrying after a save failure', async () => {
    const api = makeApi({ saveSettings: vi.fn().mockRejectedValueOnce(new Error('failed')).mockResolvedValue(undefined) });
    await initOptions(document, api);
    save().click();
    await sleep(0);
    expect(status()).toBe('msg:settingsSaveFailed');
    expect(save().disabled).toBe(false);
    save().click();
    await sleep(0);
    expect(status()).toBe('msg:settingsSaved');
  });

  it('rejects missing form elements', async () => {
    document.body.innerHTML = '';
    await expect(initOptions(document, makeApi())).rejects.toThrow('missing form elements');
  });
});

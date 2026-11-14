import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initPopup, type PopupApi } from '../src/popup/popup';
import { sleep } from '../src/content/wait';
import { DEFAULT_COPY_SETTINGS } from '../src/shared/settings';

const POPUP_BODY = /<body>([\s\S]*)<\/body>/.exec(readFileSync('static/popup.html', 'utf8'))?.[1] ?? '';

const PATH = [
  { id: 'r', name: 'Shared Drive' },
  { id: null, name: 'No id' },
  { id: 'a', name: 'Folder A' },
  { id: 'd', name: 'Folder D' },
];

const makeApi = (overrides: Partial<PopupApi> = {}): PopupApi => ({
  queryActiveTabId: vi.fn().mockResolvedValue(7),
  sendMessage: vi.fn().mockResolvedValue({ ok: true, path: PATH }),
  getMessage: vi.fn((key: string) => `msg:${key}`),
  writeClipboard: vi.fn().mockResolvedValue(undefined),
  close: vi.fn(),
  loadSettings: vi.fn().mockResolvedValue(DEFAULT_COPY_SETTINGS),
  openOptions: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const byId = (id: string): HTMLElement => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`missing #${id}`);
  return element;
};

beforeEach(() => {
  document.body.innerHTML = POPUP_BODY;
});

describe('initPopup', () => {
  it('translates the static texts', async () => {
    await initPopup(document, makeApi());
    expect(document.querySelector('h1')?.textContent).toBe('msg:popupTitle');
    expect(byId('copy').textContent).toBe('msg:copyButton');
  });

  it('lists every folder, with links to all but the current one', async () => {
    await initPopup(document, makeApi());
    const items = Array.from(byId('path').querySelectorAll('li'));
    expect(items.map((item) => item.textContent)).toEqual(['Shared Drive', 'No id', 'Folder A', 'Folder D']);
    expect(items.map((item) => item.querySelector('button') !== null)).toEqual([true, false, true, false]);
    expect(items[3]?.querySelector('[aria-current="location"]')).not.toBeNull();
    expect(items[2]?.style.getPropertyValue('--depth')).toBe('2');
    expect(byId('path').hidden).toBe(false);
  });

  it('asks the page to navigate and closes the popup', async () => {
    const api = makeApi();
    await initPopup(document, api);
    byId('path').querySelector('button')?.click();
    await sleep(0);
    expect(api.sendMessage).toHaveBeenLastCalledWith(7, { type: 'dfp:navigate', id: 'r' });
    expect(api.close).toHaveBeenCalled();
  });

  it('copies the prefix followed by the path separated by "/"', async () => {
    const api = makeApi({ loadSettings: vi.fn().mockResolvedValue({ prefix: '/Volumes/Drive/', separator: '/' }) });
    await initPopup(document, api);
    const copy = byId('copy') as HTMLButtonElement;
    expect(copy.disabled).toBe(false);
    copy.click();
    await sleep(0);
    expect(api.writeClipboard).toHaveBeenCalledWith('/Volumes/Drive/Shared Drive/No id/Folder A/Folder D');
    expect(byId('status').textContent).toBe('msg:copied');
  });

  it('copies and previews a shared drive path with the saved prefix', async () => {
    const names = ['001_Team', '02_Sales', '03_Project', '作業データ', 'サンプル', '20260101_サンプル'];
    const api = makeApi({
      sendMessage: vi.fn().mockResolvedValue({ ok: true, path: names.map((name) => ({ id: null, name })) }),
      loadSettings: vi.fn().mockResolvedValue({ prefix: '/Volumes/Drive/', separator: '/' }),
    });
    await initPopup(document, api);
    byId('copy').click();
    const expected = '/Volumes/Drive/001_Team/02_Sales/03_Project/作業データ/サンプル/20260101_サンプル';
    expect(api.writeClipboard).toHaveBeenCalledWith(expected);
    expect(byId('copy-preview').textContent).toBe(expected);
    expect(byId('copy-preview').hidden).toBe(false);
  });

  it('copies and previews a Windows path when the saved separator is a backslash', async () => {
    const api = makeApi({ loadSettings: vi.fn().mockResolvedValue({ prefix: 'G:\\共有ドライブ\\', separator: '\\' }) });
    await initPopup(document, api);
    byId('copy').click();
    const expected = 'G:\\共有ドライブ\\Shared Drive\\No id\\Folder A\\Folder D';
    expect(api.writeClipboard).toHaveBeenCalledWith(expected);
    expect(byId('copy-preview').textContent).toBe(expected);
  });

  it('uses saved settings on every popup opening', async () => {
    const api = makeApi({ loadSettings: vi.fn().mockResolvedValue({ prefix: 'custom:', separator: '/' }) });
    await initPopup(document, api);
    byId('copy').click();
    expect(api.writeClipboard).toHaveBeenCalledWith('custom:Shared Drive/No id/Folder A/Folder D');
  });

  it('keeps copying disabled when settings cannot be loaded', async () => {
    const api = makeApi({ loadSettings: vi.fn().mockRejectedValue(new Error('storage failed')) });
    await initPopup(document, api);
    expect((byId('copy') as HTMLButtonElement).disabled).toBe(true);
    expect(byId('status').textContent).toBe('msg:settingsLoadFailed');
    expect(api.writeClipboard).not.toHaveBeenCalled();
  });

  it('opens options even outside Drive', async () => {
    const api = makeApi({ queryActiveTabId: vi.fn().mockResolvedValue(null) });
    await initPopup(document, api);
    byId('options').click();
    expect(api.openOptions).toHaveBeenCalled();
  });

  it('reports failure to open options', async () => {
    await initPopup(document, makeApi({ openOptions: vi.fn().mockRejectedValue(new Error('failed')) }));
    byId('options').click();
    await sleep(0);
    expect(byId('status').textContent).toBe('msg:optionsFailed');
  });

  it('says so when copying fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await initPopup(document, makeApi({ writeClipboard: vi.fn().mockRejectedValue(new Error('denied')) }));
    byId('copy').click();
    await sleep(0);
    expect(byId('status').textContent).toBe('msg:copyFailed');
    warn.mockRestore();
  });

  it('asks to open a folder when the tab is not a Drive page', async () => {
    await initPopup(document, makeApi({ sendMessage: vi.fn().mockRejectedValue(new Error('no receiver')) }));
    expect(byId('message').textContent).toBe('msg:notFolderView');
    expect(byId('message').hidden).toBe(false);
    expect((byId('copy') as HTMLButtonElement).disabled).toBe(true);
  });

  it('asks to open a folder when there is no active tab', async () => {
    await initPopup(document, makeApi({ queryActiveTabId: vi.fn().mockResolvedValue(null) }));
    expect(byId('message').textContent).toBe('msg:notFolderView');
  });

  it('explains a failed read', async () => {
    await initPopup(document, makeApi({ sendMessage: vi.fn().mockResolvedValue({ ok: false, reason: 'read-failed' }) }));
    expect(byId('message').textContent).toBe('msg:readFailed');
  });

  it('fails loudly when popup.html lacks an element', async () => {
    document.body.innerHTML = '';
    await expect(initPopup(document, makeApi())).rejects.toThrow(/missing #path/);
  });
});

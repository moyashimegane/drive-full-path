import { afterEach, describe, expect, it } from 'vitest';
import { readHiddenFolders, selectHiddenFolder } from '../src/content/menu';
import { HIDE_DROPDOWN_ATTR } from '../src/content/selectors';
import { sleep } from '../src/content/wait';
import { DEEP, FOLDER_A, type FakeDrive, installFakeDrive, mountBreadcrumb } from './fixtures/drive';

const collapsedButton = (): HTMLElement => {
  const button = document.querySelector<HTMLElement>('[data-target="collapsedFolderButton"]');
  if (!button) throw new Error('no collapsed button');
  return button;
};

let drive: FakeDrive | null = null;

afterEach(() => {
  drive?.dispose();
  drive = null;
});

describe('readHiddenFolders', () => {
  it('returns the hidden folders from the root down and closes the menu', async () => {
    mountBreadcrumb(DEEP);
    drive = installFakeDrive(document, DEEP.hidden);
    const folders = await readHiddenFolders(document, collapsedButton());
    expect(folders).toEqual(DEEP.hidden);
    expect(collapsedButton().getAttribute('aria-expanded')).toBe('false');
    expect(drive.openCount()).toBe(1);
  });

  it('keeps the dropdown hidden while reading and shows it again afterwards', async () => {
    mountBreadcrumb(DEEP);
    drive = installFakeDrive(document, DEEP.hidden);
    const reading = readHiddenFolders(document, collapsedButton());
    expect(document.documentElement.hasAttribute(HIDE_DROPDOWN_ATTR)).toBe(true);
    await reading;
    await sleep(350);
    expect(document.documentElement.hasAttribute(HIDE_DROPDOWN_ATTR)).toBe(false);
  });

  it('gives the focus back to the element that had it', async () => {
    mountBreadcrumb(DEEP);
    const input = document.createElement('input');
    document.body.append(input);
    input.focus();
    drive = installFakeDrive(document, DEEP.hidden);
    await readHiddenFolders(document, collapsedButton());
    expect(document.activeElement).toBe(input);
  });

  it('leaves nothing focused when nothing was focused before', async () => {
    mountBreadcrumb(DEEP);
    drive = installFakeDrive(document, DEEP.hidden);
    await readHiddenFolders(document, collapsedButton());
    expect(document.activeElement).toBe(document.body);
  });

  it('reads a menu the user already opened without closing it', async () => {
    mountBreadcrumb(DEEP);
    drive = installFakeDrive(document, DEEP.hidden);
    collapsedButton().click();
    const folders = await readHiddenFolders(document, collapsedButton());
    expect(folders).toEqual(DEEP.hidden);
    expect(collapsedButton().getAttribute('aria-expanded')).toBe('true');
  });

  it('closes the menu by toggling the button when Escape does not work', async () => {
    mountBreadcrumb(DEEP);
    drive = installFakeDrive(document, DEEP.hidden, { escapeCloses: false });
    await readHiddenFolders(document, collapsedButton());
    expect(collapsedButton().getAttribute('aria-expanded')).toBe('false');
  });

  it("waits for Drive to refill the menu instead of reading the previous folder's ancestors", async () => {
    mountBreadcrumb(DEEP);
    drive = installFakeDrive(document, DEEP.hidden, { staleItems: [DEEP.hidden[0] ?? FOLDER_A] });
    await expect(readHiddenFolders(document, collapsedButton())).resolves.toEqual(DEEP.hidden);
  });

  it('rejects when the menu never finishes loading', async () => {
    mountBreadcrumb(DEEP);
    drive = installFakeDrive(document, DEEP.hidden, { finishesLoading: false });
    await expect(readHiddenFolders(document, collapsedButton())).rejects.toThrow(/Timed out/);
    expect(collapsedButton().getAttribute('aria-expanded')).toBe('false');
  });

  it('rejects when the menu never opens', async () => {
    mountBreadcrumb(DEEP);
    drive = installFakeDrive(document, DEEP.hidden, { opens: false });
    await expect(readHiddenFolders(document, collapsedButton())).rejects.toThrow(/Timed out/);
  });
});

describe('selectHiddenFolder', () => {
  it('activates the folder in the menu although Drive ignores the first click', async () => {
    mountBreadcrumb(DEEP);
    drive = installFakeDrive(document, DEEP.hidden);
    await expect(selectHiddenFolder(document, collapsedButton(), FOLDER_A.id)).resolves.toBe(true);
    expect(drive.selected).toEqual([FOLDER_A.id]);
    expect(window.location.pathname).toBe(`/drive/folders/${FOLDER_A.id}`);
  });

  it('resolves false and closes the menu when Drive does not navigate', async () => {
    mountBreadcrumb(DEEP);
    drive = installFakeDrive(document, DEEP.hidden, { itemsActivate: false });
    await expect(selectHiddenFolder(document, collapsedButton(), FOLDER_A.id)).resolves.toBe(false);
    expect(collapsedButton().getAttribute('aria-expanded')).toBe('false');
    // The dropdown is unhidden only after it has been closed.
    expect(document.documentElement.hasAttribute(HIDE_DROPDOWN_ATTR)).toBe(true);
  });

  it('resolves false and closes the menu when the folder is not listed', async () => {
    mountBreadcrumb(DEEP);
    drive = installFakeDrive(document, DEEP.hidden);
    await expect(selectHiddenFolder(document, collapsedButton(), 'missing')).resolves.toBe(false);
    expect(collapsedButton().getAttribute('aria-expanded')).toBe('false');
    expect(drive.selected).toEqual([]);
  });
});

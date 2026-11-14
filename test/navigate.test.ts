import { afterEach, describe, expect, it, vi } from 'vitest';
import { navigateToFolder } from '../src/content/navigate';
import { CURRENT, DEEP, type FakeDrive, FOLDER_A, FOLDER_C, installFakeDrive, mountBreadcrumb } from './fixtures/drive';

let drive: FakeDrive | null = null;

afterEach(() => {
  drive?.dispose();
  drive = null;
});

describe('navigateToFolder', () => {
  it('does nothing for the current folder', async () => {
    mountBreadcrumb(DEEP);
    const navigateUrl = vi.fn();
    await expect(navigateToFolder(document, CURRENT.id, navigateUrl)).resolves.toBe('current');
    expect(navigateUrl).not.toHaveBeenCalled();
  });

  it("clicks Drive's own link for a visible folder", async () => {
    mountBreadcrumb(DEEP);
    drive = installFakeDrive(document, DEEP.hidden);
    await expect(navigateToFolder(document, FOLDER_C.id, vi.fn())).resolves.toBe('link');
    expect(drive.selected).toEqual([FOLDER_C.id]);
  });

  it("selects a hidden folder through Drive's menu", async () => {
    mountBreadcrumb(DEEP);
    drive = installFakeDrive(document, DEEP.hidden);
    await expect(navigateToFolder(document, FOLDER_A.id, vi.fn())).resolves.toBe('menu');
    expect(drive.selected).toEqual([FOLDER_A.id]);
  });

  it('loads the folder URL, keeping the account, when Drive offers no way to it', async () => {
    mountBreadcrumb(DEEP, `/drive/u/1/folders/${CURRENT.id}`);
    drive = installFakeDrive(document, DEEP.hidden);
    const navigateUrl = vi.fn();
    await expect(navigateToFolder(document, 'elsewhere', navigateUrl)).resolves.toBe('url');
    expect(navigateUrl).toHaveBeenCalledWith('/drive/u/1/folders/elsewhere');
  });

  it("loads the folder URL when Drive's menu does not open", async () => {
    mountBreadcrumb(DEEP);
    drive = installFakeDrive(document, DEEP.hidden, { opens: false });
    const navigateUrl = vi.fn();
    await expect(navigateToFolder(document, FOLDER_A.id, navigateUrl)).resolves.toBe('url');
    expect(navigateUrl).toHaveBeenCalledWith(`/drive/folders/${FOLDER_A.id}`);
  });

  it('loads the folder URL outside a folder view', async () => {
    document.body.innerHTML = '<main></main>';
    const navigateUrl = vi.fn();
    await expect(navigateToFolder(document, FOLDER_A.id, navigateUrl)).resolves.toBe('url');
    expect(navigateUrl).toHaveBeenCalledOnce();
  });
});

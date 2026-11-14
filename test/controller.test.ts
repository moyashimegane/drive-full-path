import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Controller, createController } from '../src/content/controller';
import { OWN_ITEM_ATTR } from '../src/content/selectors';
import { sleep } from '../src/content/wait';
import {
  breadcrumbListHtml,
  CURRENT,
  DEEP,
  type FakeDrive,
  FOLDER_A,
  FOLDER_B,
  installFakeDrive,
  mountBreadcrumb,
  ROOT,
  setPathname,
  SHALLOW,
} from './fixtures/drive';

const ownNames = (): string[] =>
  Array.from(document.querySelectorAll(`[${OWN_ITEM_ATTR}] [role="link"]`)).map((link) => link.textContent ?? '');

const settle = (): Promise<void> => sleep(150);

let drive: FakeDrive | null = null;
let controller: Controller | null = null;

afterEach(() => {
  controller?.stop();
  controller = null;
  drive?.dispose();
  drive = null;
});

const startOn = async (spec = DEEP, pathname?: string): Promise<Controller> => {
  mountBreadcrumb(spec, pathname);
  drive = installFakeDrive(document, spec.hidden);
  controller = createController(document, { debounceMs: 0, navigateUrl: vi.fn() });
  controller.start();
  // Wait for the first read instead of a fixed delay, which is flaky under load.
  await vi.waitFor(() => expect(ownNames()).toHaveLength(spec.hidden.length), { timeout: 3000 });
  await settle();
  return controller;
};

describe('createController', () => {
  it('shows the hidden folders in the breadcrumb once started', async () => {
    await startOn();
    expect(ownNames()).toEqual(['Shared Drive', 'Folder A', 'Folder B']);
  });

  it('returns the full path from the root to the current folder', async () => {
    const started = await startOn();
    const response = await started.getPath();
    expect(response).toEqual({
      ok: true,
      path: [...DEEP.hidden, ...DEEP.visibleAncestors, { id: CURRENT.id, name: CURRENT.name }],
    });
    expect(drive?.openCount()).toBe(1);
  });

  it('reads a path Drive shows in full without opening any menu', async () => {
    const started = await startOn(SHALLOW);
    expect(await started.getPath()).toEqual({
      ok: true,
      path: [...SHALLOW.visibleAncestors, { id: CURRENT.id, name: CURRENT.name }],
    });
    expect(drive?.openCount()).toBe(0);
    expect(ownNames()).toEqual([]);
  });

  it('puts the folders back from memory when Drive re-renders the same breadcrumb', async () => {
    await startOn();
    const list = document.querySelector('[role="list"]');
    if (!list) throw new Error('no list');
    list.innerHTML = breadcrumbListHtml(DEEP);
    await settle();
    expect(ownNames()).toEqual(['Shared Drive', 'Folder A', 'Folder B']);
    expect(drive?.openCount()).toBe(1);
  });

  it('reads the new path when the folder changes', async () => {
    await startOn();
    drive?.dispose();
    const next = { hidden: [ROOT, FOLDER_A], visibleAncestors: [FOLDER_B], current: 'Folder X' };
    drive = installFakeDrive(document, next.hidden);
    setPathname('/drive/folders/idX');
    const list = document.querySelector('[role="list"]');
    if (!list) throw new Error('no list');
    list.innerHTML = breadcrumbListHtml(next);
    await settle();
    expect(ownNames()).toEqual(['Shared Drive', 'Folder A']);
  });

  it("waits until Drive has removed the old folder's items before reading", async () => {
    const nav = mountBreadcrumb(DEEP);
    const list = nav.querySelector('[role="list"]');
    if (!list) throw new Error('no list');
    list.insertAdjacentHTML('afterbegin', breadcrumbListHtml(SHALLOW));
    drive = installFakeDrive(document, DEEP.hidden);
    controller = createController(document, { debounceMs: 0 });
    controller.start();
    await settle();
    expect(drive.openCount()).toBe(0);
    expect(ownNames()).toEqual([]);
    list.innerHTML = breadcrumbListHtml(DEEP);
    await settle();
    expect(ownNames()).toEqual(['Shared Drive', 'Folder A', 'Folder B']);
  });

  it('answers the popup once a transition ends', async () => {
    const nav = mountBreadcrumb(DEEP);
    const list = nav.querySelector('[role="list"]');
    if (!list) throw new Error('no list');
    list.insertAdjacentHTML('afterbegin', breadcrumbListHtml(SHALLOW));
    drive = installFakeDrive(document, DEEP.hidden);
    controller = createController(document, { debounceMs: 0 });
    const pending = controller.getPath();
    await sleep(50);
    list.innerHTML = breadcrumbListHtml(DEEP);
    expect(await pending).toEqual({
      ok: true,
      path: [...DEEP.hidden, ...DEEP.visibleAncestors, { id: CURRENT.id, name: CURRENT.name }],
    });
  });

  it('reports a page without a breadcrumb', async () => {
    const started = await startOn();
    document.body.innerHTML = '<main></main>';
    await settle();
    expect(await started.getPath()).toEqual({ ok: false, reason: 'not-folder-view' });
  });

  it('reports a failed read and does not retry it on its own', async () => {
    mountBreadcrumb(DEEP);
    drive = installFakeDrive(document, DEEP.hidden, { opens: false });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    controller = createController(document, { debounceMs: 0 });
    controller.start();
    await sleep(1300);
    expect(ownNames()).toEqual([]);
    expect(await controller.getPath()).toEqual({ ok: false, reason: 'read-failed' });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  }, 5000);

  it('navigates through Drive', async () => {
    const started = await startOn();
    await started.navigate(FOLDER_A.id);
    expect(drive?.selected).toEqual([FOLDER_A.id]);
  });

  it('navigates when an inserted folder is clicked', async () => {
    await startOn();
    const link = document.querySelector<HTMLElement>(`[${OWN_ITEM_ATTR}] [role="link"]`);
    link?.click();
    await settle();
    expect(drive?.selected).toEqual([ROOT.id]);
  });

  it('stops following Drive after stop()', async () => {
    const started = await startOn();
    started.stop();
    const list = document.querySelector('[role="list"]');
    if (!list) throw new Error('no list');
    list.innerHTML = breadcrumbListHtml(DEEP);
    await settle();
    expect(ownNames()).toEqual([]);
  });
});

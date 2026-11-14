import type { FolderPath } from '../shared/types';
import { simulateClick, simulateEscape, simulateHover } from './events';
import { HIDE_DROPDOWN_ATTR, SELECTORS } from './selectors';
import { waitFor } from './wait';

const OPEN_TIMEOUT_MS = 1000;
// Drive sets an aria-label on the menu about 40ms after opening it while it fills it,
// and removes it about 300ms later.
const LOADING_APPEAR_MS = 150;
const LOADING_TIMEOUT_MS = 2000;
const CLOSE_TIMEOUT_MS = 500;
// Drive changes the URL about 100ms after a menu item is activated.
const NAVIGATE_TIMEOUT_MS = 1000;
// Drive keeps animating the dropdown briefly after it reports itself closed.
const UNHIDE_DELAY_MS = 300;

const hideDepth = new WeakMap<Document, number>();

const changeHideDepth = (doc: Document, delta: number): void => {
  const depth = (hideDepth.get(doc) ?? 0) + delta;
  hideDepth.set(doc, depth);
  if (depth > 0) doc.documentElement.setAttribute(HIDE_DROPDOWN_ATTR, '');
  else doc.documentElement.removeAttribute(HIDE_DROPDOWN_ATTR);
};

/** Runs `task` while Drive's dropdown is kept invisible. */
const withHiddenDropdown = async <T>(doc: Document, task: () => Promise<T>): Promise<T> => {
  changeHideDepth(doc, 1);
  try {
    return await task();
  } finally {
    setTimeout(() => changeHideDepth(doc, -1), UNHIDE_DELAY_MS);
  }
};

const isExpanded = (button: Element): boolean => button.getAttribute('aria-expanded') === 'true';

// The newest dropdown is the last one; an older one can linger right after a folder change.
const findOpenDropdown = (doc: Document): HTMLElement | null =>
  Array.from(doc.querySelectorAll<HTMLElement>(SELECTORS.collapsedDropdown))
    .filter((dropdown) => dropdown.style.display !== 'none' && dropdown.querySelector(SELECTORS.menuItem) !== null)
    .at(-1) ?? null;

/**
 * Right after opening, the menu may still list the previous folder's ancestors.
 * Only the presence of the aria-label is checked, because its text is localized.
 */
const waitUntilLoaded = async (dropdown: Element): Promise<void> => {
  const isLoading = (): boolean => dropdown.hasAttribute('aria-label');
  const started = await waitFor(() => (isLoading() ? true : null), LOADING_APPEAR_MS).catch(() => false);
  if (started) await waitFor(() => (isLoading() ? null : true), LOADING_TIMEOUT_MS);
};

const openMenu = async (doc: Document, button: HTMLElement): Promise<HTMLElement> => {
  if (!isExpanded(button)) simulateClick(button);
  const dropdown = await waitFor(() => (isExpanded(button) ? findOpenDropdown(doc) : null), OPEN_TIMEOUT_MS);
  await waitUntilLoaded(dropdown);
  return dropdown;
};

const closeMenu = async (doc: Document, button: HTMLElement): Promise<void> => {
  if (!isExpanded(button)) return;
  simulateEscape(doc.activeElement ?? button);
  try {
    await waitFor(() => (isExpanded(button) ? null : true), CLOSE_TIMEOUT_MS);
  } catch {
    // Escape did not reach the menu; toggling the button closes it as well.
    simulateClick(button);
  }
};

const restoreFocus = (doc: Document, previous: Element | null): void => {
  const active = doc.activeElement;
  if (active === previous) return;
  if (previous instanceof HTMLElement && previous !== doc.body && previous.isConnected) {
    previous.focus({ preventScroll: true });
    return;
  }
  if (active instanceof HTMLElement) active.blur();
};

export const readMenuFolders = (dropdown: Element): FolderPath =>
  Array.from(dropdown.querySelectorAll(SELECTORS.menuItem))
    .map((item) => ({ id: item.getAttribute('data-id'), name: (item.textContent ?? '').trim() }))
    .filter((folder) => folder.name !== '');

/** Opens Drive's "..." menu out of sight, reads the folders it lists and closes it again. */
export const readHiddenFolders = async (doc: Document, button: HTMLElement): Promise<FolderPath> => {
  if (isExpanded(button)) {
    const dropdown = findOpenDropdown(doc);
    if (dropdown) return readMenuFolders(dropdown);
  }
  const previousFocus = doc.activeElement;
  return withHiddenDropdown(doc, async () => {
    try {
      return readMenuFolders(await openMenu(doc, button));
    } finally {
      await closeMenu(doc, button);
      restoreFocus(doc, previousFocus);
    }
  });
};

const activateItem = (item: Element): void => {
  simulateHover(item);
  simulateClick(item);
};

/**
 * Navigates through Drive's own "..." menu. Resolves false, with the menu closed again,
 * when the folder is not listed or Drive does not navigate.
 */
export const selectHiddenFolder = async (doc: Document, button: HTMLElement, id: string): Promise<boolean> =>
  withHiddenDropdown(doc, async () => {
    const dropdown = await openMenu(doc, button);
    const item = Array.from(dropdown.querySelectorAll(SELECTORS.menuItem)).find(
      (element) => element.getAttribute('data-id') === id,
    );
    if (!item) {
      await closeMenu(doc, button);
      return false;
    }
    const start = doc.location.href;
    activateItem(item);
    // Drive ignores the first click on a menu that has just opened and leaves it open.
    if (isExpanded(button)) activateItem(item);
    const moved = await waitFor(() => (doc.location.href === start ? null : true), NAVIGATE_TIMEOUT_MS).catch(
      () => false,
    );
    // Close it before the dropdown is unhidden, or it would show up on screen.
    if (!moved) await closeMenu(doc, button);
    return moved;
  });

import { folderIdFromPathname } from '../shared/path';
import type { Folder, FolderPath } from '../shared/types';
import { OWN_ITEM_ATTR, SELECTORS } from './selectors';

export interface BreadcrumbSnapshot {
  readonly nav: HTMLElement;
  /** Folders Drive shows itself, ending with the current folder. */
  readonly visible: FolderPath;
  /** The "..." button, present only when Drive hides upper folders. */
  readonly collapsedButton: HTMLElement | null;
  /**
   * True while Drive shows the old and the new folder's items side by side,
   * which it does for a few hundred milliseconds after a folder change.
   */
  readonly inTransition: boolean;
  /** Changes whenever the folder or Drive's own breadcrumb changes. */
  readonly signature: string;
}

const isRendered = (element: Element): boolean => element.getClientRects().length > 0;

export const findNav = (doc: Document): HTMLElement | null => {
  const navs = Array.from(doc.querySelectorAll<HTMLElement>(SELECTORS.nav));
  return navs.find(isRendered) ?? navs[0] ?? null;
};

export const nativeItems = (nav: Element): readonly HTMLElement[] =>
  Array.from(nav.querySelectorAll<HTMLElement>(SELECTORS.listItem)).filter(
    (item) => !item.hasAttribute(OWN_ITEM_ATTR),
  );

export const labelOf = (element: Element): string =>
  (element.getAttribute('aria-label') ?? element.textContent ?? '').trim();

const readItem = (item: Element, isLast: boolean, currentId: string | null): Folder | null => {
  if (item.querySelector(SELECTORS.collapsedButton)) return null;
  const link = item.querySelector(SELECTORS.folderLink);
  if (link) return { id: link.getAttribute('data-id'), name: labelOf(link) };
  const current = item.querySelector(SELECTORS.currentFolder) ?? item;
  return { id: isLast ? currentId : null, name: labelOf(current) };
};

export const snapshotBreadcrumb = (nav: HTMLElement, pathname: string): BreadcrumbSnapshot => {
  const currentId = folderIdFromPathname(pathname);
  const items = nativeItems(nav);
  const visible = items
    .map((item, index) => readItem(item, index === items.length - 1, currentId))
    .filter((folder): folder is Folder => folder !== null && folder.name !== '');
  const collapsedButtons = nav.querySelectorAll<HTMLElement>(SELECTORS.collapsedButton);
  const currentItems = items.filter(
    (item) => !item.querySelector(SELECTORS.collapsedButton) && !item.querySelector(SELECTORS.folderLink),
  );
  const inTransition = collapsedButtons.length > 1 || currentItems.length > 1;
  const collapsedButton = collapsedButtons[0] ?? null;
  const signature = [
    pathname,
    collapsedButton ? 'collapsed' : 'full',
    ...visible.map((folder) => `${folder.id ?? ''}:${folder.name}`),
  ].join('\n');
  return { nav, visible, collapsedButton, inTransition, signature };
};

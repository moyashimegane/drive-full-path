import { folderUrl } from '../shared/path';
import { findNav, nativeItems, snapshotBreadcrumb } from './breadcrumb';
import { simulateClick } from './events';
import { selectHiddenFolder } from './menu';
import { SELECTORS } from './selectors';

export type NavigationMethod = 'current' | 'link' | 'menu' | 'url';

export type UrlNavigator = (url: string) => void;

const findNativeLink = (nav: Element, id: string): HTMLElement | null =>
  nativeItems(nav)
    .map((item) => item.querySelector<HTMLElement>(SELECTORS.folderLink))
    .find((link) => link?.getAttribute('data-id') === id) ?? null;

/**
 * Moves to the folder through Drive's own UI so the page is not reloaded.
 * Falls back to loading the folder URL when Drive's UI does not offer it.
 */
export const navigateToFolder = async (
  doc: Document,
  id: string,
  navigateUrl: UrlNavigator = (url) => doc.location.assign(url),
): Promise<NavigationMethod> => {
  const nav = findNav(doc);
  if (nav) {
    const snapshot = snapshotBreadcrumb(nav, doc.location.pathname);
    if (snapshot.visible.at(-1)?.id === id) return 'current';
    const link = findNativeLink(nav, id);
    if (link) {
      simulateClick(link);
      return 'link';
    }
    if (snapshot.collapsedButton) {
      const selected = await selectHiddenFolder(doc, snapshot.collapsedButton, id).catch(() => false);
      if (selected) return 'menu';
    }
  }
  navigateUrl(folderUrl(doc.location.pathname, id));
  return 'url';
};

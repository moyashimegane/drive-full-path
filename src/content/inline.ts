import type { Folder, FolderPath } from '../shared/types';
import { nativeItems } from './breadcrumb';
import { EXPANDED_ATTR, OWN_ITEM_ATTR, SELECTORS } from './selectors';

export type NavigateHandler = (id: string) => void;

export const removeInline = (nav: Element): void => {
  nav.querySelectorAll(`[${OWN_ITEM_ATTR}]`).forEach((item) => item.remove());
  nav.removeAttribute(EXPANDED_ATTR);
};

export const isInlineRendered = (nav: Element): boolean =>
  nav.hasAttribute(EXPANDED_ATTR) && nav.querySelector(`[${OWN_ITEM_ATTR}]`) !== null;

const stripDriveAttributes = (element: Element): void => {
  Array.from(element.attributes)
    .filter((attribute) => attribute.name.startsWith('data-'))
    .forEach((attribute) => element.removeAttribute(attribute.name));
};

const createItem = (template: HTMLElement, folder: Folder, onNavigate: NavigateHandler): HTMLElement => {
  const item = template.cloneNode(true) as HTMLElement;
  stripDriveAttributes(item);
  item.removeAttribute('guidedhelpid');
  item.setAttribute(OWN_ITEM_ATTR, '');

  const link = item.querySelector<HTMLElement>(SELECTORS.folderLink);
  if (link) {
    // Without Drive's data-* attributes, Drive's own handlers ignore the copy.
    stripDriveAttributes(link);
    link.textContent = folder.name;
    link.setAttribute('aria-label', folder.name);
    link.title = folder.name;
    link.tabIndex = 0;
    const go = (event: Event): void => {
      event.preventDefault();
      event.stopPropagation();
      if (folder.id !== null) onNavigate(folder.id);
    };
    link.addEventListener('click', go);
    link.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') go(event);
    });
  }
  return item;
};

/**
 * Inserts the folders hidden behind "..." in front of Drive's first visible folder.
 * Each inserted item is a copy of that folder's item, so it matches Drive's styling.
 */
export const renderInline = (nav: HTMLElement, hidden: FolderPath, onNavigate: NavigateHandler): boolean => {
  removeInline(nav);
  if (hidden.length === 0) return false;
  const template = nativeItems(nav).find((item) => item.querySelector(SELECTORS.folderLink) !== null);
  if (!template) return false;
  template.before(...hidden.map((folder) => createItem(template, folder, onNavigate)));
  nav.setAttribute(EXPANDED_ATTR, '');
  return true;
};

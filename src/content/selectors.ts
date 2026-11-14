/**
 * Drive obfuscates its class names, so only stable attributes are used here.
 * aria-label text is localized and is never used to find elements.
 */
export const SELECTORS = {
  nav: 'nav[guidedhelpid="folder_path"]',
  listItem: '[role="listitem"]',
  collapsedButton: '[data-target="collapsedFolderButton"]',
  collapsedDropdown: '[data-target="collapsedFolderDropdown"]',
  menuItem: '[role="menuitem"]',
  folderLink: '[data-target="folder"][data-id]',
  currentFolder: '[role="button"]',
} as const;

/** Marks list items inserted by this extension. */
export const OWN_ITEM_ATTR = 'data-dfp-item';
/** Set on the nav while hidden folders are rendered inline; content.css hides "..." then. */
export const EXPANDED_ATTR = 'data-dfp-expanded';
/** Set on <html> while the extension opens Drive's dropdown, so it never shows on screen. */
export const HIDE_DROPDOWN_ATTR = 'data-dfp-hide-dropdown';

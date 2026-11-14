/**
 * Markup modeled on Drive's breadcrumb (2026-10). Folder names are dummies.
 * The aria-label of "..." is deliberately English to prove no localized text is relied on.
 */
export interface FakeFolder {
  readonly id: string;
  readonly name: string;
}

export interface BreadcrumbSpec {
  readonly hidden: readonly FakeFolder[];
  readonly visibleAncestors: readonly FakeFolder[];
  readonly current: string;
}

const CHEVRON = '<div class="o-Yc-vc"><div class="o-Yc-vc-Wb"><div class="c-Po"><svg></svg></div></div></div>';

const collapsedItem = (): string =>
  '<div class="o-Yc-o" guidedhelpid="folder_path_button" role="listitem">' +
  '<div class="h-d o-Yc-Vf-d a-c-d" data-target="collapsedFolderButton" title="Show path" aria-label="Show path"' +
  ' role="button" aria-expanded="false" aria-haspopup="true" tabindex="0"></div>' +
  `${CHEVRON}</div>`;

const ancestorItem = (folder: FakeFolder): string =>
  `<div class="o-Yc-o" role="listitem" data-menu-anchor="${folder.id}" style="min-width: 74px;">` +
  `<div class="o-Yc-o-T" tabindex="-1" role="link" aria-label="${folder.name}" data-target="folder"` +
  ` data-tooltip="${folder.name}" data-id="${folder.id}">${folder.name}</div>${CHEVRON}</div>`;

const currentItem = (name: string): string =>
  '<div class="o-Yc-o" guidedhelpid="folder_path_button" role="listitem">' +
  `<div class="h-sb-Ic h-R-w-d" role="button" data-tooltip="${name}" aria-label="${name}" tabindex="-1">` +
  `<div class="h-sb-Ic h-R-w-d-ff">${name}</div><div class="c-Po" aria-hidden="true"><svg></svg></div></div></div>`;

export const breadcrumbListHtml = (spec: BreadcrumbSpec): string =>
  (spec.hidden.length > 0 ? collapsedItem() : '') +
  spec.visibleAncestors.map(ancestorItem).join('') +
  currentItem(spec.current);

export const breadcrumbHtml = (spec: BreadcrumbSpec): string =>
  '<div class="o-Yc-j"><nav role="navigation" class="o-Yc" guidedhelpid="folder_path">' +
  '<div role="heading">Folder path</div>' +
  `<div class="o-Yc-Wb" role="list">${breadcrumbListHtml(spec)}</div></nav></div>`;

export const ROOT: FakeFolder = { id: '0AdummyRoot', name: 'Shared Drive' };
export const FOLDER_A: FakeFolder = { id: 'idA', name: 'Folder A' };
export const FOLDER_B: FakeFolder = { id: 'idB', name: 'Folder B' };
export const FOLDER_C: FakeFolder = { id: 'idC', name: 'Folder C' };
export const CURRENT: FakeFolder = { id: 'idD', name: 'Folder D' };

export const DEEP: BreadcrumbSpec = {
  hidden: [ROOT, FOLDER_A, FOLDER_B],
  visibleAncestors: [FOLDER_C],
  current: CURRENT.name,
};

export const SHALLOW: BreadcrumbSpec = {
  hidden: [],
  visibleAncestors: [ROOT, FOLDER_A],
  current: CURRENT.name,
};

export interface FakeDriveOptions {
  /** When false, clicking "..." does nothing (simulates a Drive change). */
  readonly opens?: boolean;
  /** When false, Escape does not close the menu. */
  readonly escapeCloses?: boolean;
  /** When false, clicking a menu item does nothing (simulates a Drive change). */
  readonly itemsActivate?: boolean;
  /** Folders the menu lists right after opening, before Drive refills it (a previous folder's). */
  readonly staleItems?: readonly FakeFolder[];
  /** When false, the menu never finishes loading. */
  readonly finishesLoading?: boolean;
}

const LOADING_STARTS_MS = 5;
const LOADING_ENDS_MS = 40;

export interface FakeDrive {
  readonly selected: string[];
  readonly openCount: () => number;
  readonly dispose: () => void;
}

/**
 * Mimics the behavior observed on the real page: the dropdown is created on click and
 * appended to <body>, it carries an aria-label while Drive (re)fills it, Escape closes it,
 * the first click on an item after the menu opens is ignored, and activating an item
 * closes the menu and changes the URL.
 */
export const installFakeDrive = (
  doc: Document,
  hidden: readonly FakeFolder[],
  options: FakeDriveOptions = {},
): FakeDrive => {
  const selected: string[] = [];
  let opens = 0;
  let dropdown: HTMLElement | null = null;

  const close = (): void => {
    doc.querySelector('[data-target="collapsedFolderButton"]')?.setAttribute('aria-expanded', 'false');
    if (dropdown) dropdown.style.display = 'none';
  };

  const navigateTo = (id: string): void => {
    selected.push(id);
    setPathname(`/drive/folders/${id}`);
  };

  const open = (button: Element): void => {
    opens += 1;
    dropdown?.remove();
    const menu = doc.createElement('div');
    menu.setAttribute('role', 'menu');
    menu.setAttribute('data-target', 'collapsedFolderDropdown');
    menu.tabIndex = -1;
    menu.style.display = 'block';
    let itemClicks = 0;
    const createItem = (folder: FakeFolder): HTMLElement => {
      const item = doc.createElement('div');
      item.setAttribute('role', 'menuitem');
      item.setAttribute('data-target', 'folder');
      item.setAttribute('data-id', folder.id);
      item.textContent = folder.name;
      item.addEventListener('click', () => {
        itemClicks += 1;
        if (itemClicks === 1 || options.itemsActivate === false) return;
        close();
        navigateTo(folder.id);
      });
      return item;
    };
    menu.append(...(options.staleItems ?? hidden).map(createItem));
    setTimeout(() => menu.setAttribute('aria-label', 'Loading menu'), LOADING_STARTS_MS);
    if (options.finishesLoading !== false) {
      setTimeout(() => {
        menu.replaceChildren(...hidden.map(createItem));
        menu.removeAttribute('aria-label');
      }, LOADING_ENDS_MS);
    }
    menu.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && options.escapeCloses !== false) close();
    });
    doc.body.append(menu);
    dropdown = menu;
    button.setAttribute('aria-expanded', 'true');
    menu.focus();
  };

  const onClick = (event: MouseEvent): void => {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest('[data-target="collapsedFolderButton"]');
    if (button) {
      if (options.opens === false) return;
      if (button.getAttribute('aria-expanded') === 'true') close();
      else open(button);
      return;
    }
    const link = target?.closest('nav [data-target="folder"][data-id]');
    const id = link?.getAttribute('data-id');
    if (id) navigateTo(id);
  };
  doc.addEventListener('click', onClick);

  return {
    selected,
    openCount: () => opens,
    dispose: () => {
      doc.removeEventListener('click', onClick);
      dropdown?.remove();
    },
  };
};

export const setPathname = (pathname: string): void => {
  window.history.replaceState({}, '', pathname);
};

export const mountBreadcrumb = (spec: BreadcrumbSpec, pathname = `/drive/folders/${CURRENT.id}`): HTMLElement => {
  document.body.innerHTML = breadcrumbHtml(spec);
  setPathname(pathname);
  const nav = document.querySelector<HTMLElement>('nav[guidedhelpid="folder_path"]');
  if (!nav) throw new Error('fixture has no nav');
  return nav;
};

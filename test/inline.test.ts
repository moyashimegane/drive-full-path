import { describe, expect, it, vi } from 'vitest';
import { isInlineRendered, removeInline, renderInline } from '../src/content/inline';
import { EXPANDED_ATTR, OWN_ITEM_ATTR } from '../src/content/selectors';
import { DEEP, FOLDER_A, mountBreadcrumb, SHALLOW } from './fixtures/drive';

const listTexts = (nav: Element): string[] =>
  Array.from(nav.querySelectorAll('[role="listitem"]')).map((item) => item.textContent?.trim() ?? '');

const ownLinks = (nav: Element): HTMLElement[] =>
  Array.from(nav.querySelectorAll<HTMLElement>(`[${OWN_ITEM_ATTR}] [role="link"]`));

describe('renderInline', () => {
  it('inserts the hidden folders in order in front of the first visible folder', () => {
    const nav = mountBreadcrumb(DEEP);
    expect(renderInline(nav, DEEP.hidden, () => {})).toBe(true);
    expect(listTexts(nav)).toEqual(['', 'Shared Drive', 'Folder A', 'Folder B', 'Folder C', 'Folder D']);
    expect(nav.hasAttribute(EXPANDED_ATTR)).toBe(true);
    expect(isInlineRendered(nav)).toBe(true);
  });

  it('removes Drive data attributes so Drive does not handle the copies', () => {
    const nav = mountBreadcrumb(DEEP);
    renderInline(nav, DEEP.hidden, () => {});
    const item = nav.querySelector(`[${OWN_ITEM_ATTR}]`);
    const link = ownLinks(nav)[0];
    expect(item?.hasAttribute('data-menu-anchor')).toBe(false);
    expect(link?.hasAttribute('data-target')).toBe(false);
    expect(link?.hasAttribute('data-id')).toBe(false);
    expect(link?.hasAttribute('data-tooltip')).toBe(false);
    expect(link?.getAttribute('aria-label')).toBe('Shared Drive');
    expect(link?.title).toBe('Shared Drive');
    expect(link?.tabIndex).toBe(0);
  });

  it('navigates on click and on Enter without letting the event reach Drive', () => {
    const nav = mountBreadcrumb(DEEP);
    const onNavigate = vi.fn();
    const driveHandler = vi.fn();
    nav.addEventListener('click', driveHandler);
    renderInline(nav, DEEP.hidden, onNavigate);
    const link = ownLinks(nav)[1];
    link?.click();
    link?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    link?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(onNavigate.mock.calls).toEqual([[FOLDER_A.id], [FOLDER_A.id]]);
    expect(driveHandler).not.toHaveBeenCalled();
  });

  it('does not navigate to a folder without an id', () => {
    const nav = mountBreadcrumb(DEEP);
    const onNavigate = vi.fn();
    renderInline(nav, [{ id: null, name: 'No id' }], onNavigate);
    ownLinks(nav)[0]?.click();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('replaces what it rendered before', () => {
    const nav = mountBreadcrumb(DEEP);
    renderInline(nav, DEEP.hidden, () => {});
    renderInline(nav, DEEP.hidden, () => {});
    expect(ownLinks(nav)).toHaveLength(DEEP.hidden.length);
  });

  it('renders nothing when no folder is hidden', () => {
    const nav = mountBreadcrumb(DEEP);
    expect(renderInline(nav, [], () => {})).toBe(false);
    expect(nav.hasAttribute(EXPANDED_ATTR)).toBe(false);
  });

  it('renders nothing when there is no visible folder to copy', () => {
    const nav = mountBreadcrumb({ ...SHALLOW, visibleAncestors: [] });
    expect(renderInline(nav, DEEP.hidden, () => {})).toBe(false);
  });
});

describe('removeInline', () => {
  it('removes the inserted folders and the expanded marker', () => {
    const nav = mountBreadcrumb(DEEP);
    renderInline(nav, DEEP.hidden, () => {});
    removeInline(nav);
    expect(ownLinks(nav)).toHaveLength(0);
    expect(isInlineRendered(nav)).toBe(false);
  });
});

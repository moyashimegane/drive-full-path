import { describe, expect, it } from 'vitest';
import { findNav, labelOf, snapshotBreadcrumb } from '../src/content/breadcrumb';
import { OWN_ITEM_ATTR } from '../src/content/selectors';
import { breadcrumbListHtml, CURRENT, DEEP, FOLDER_A, FOLDER_C, mountBreadcrumb, ROOT, SHALLOW } from './fixtures/drive';

describe('findNav', () => {
  it('returns null when the page has no breadcrumb', () => {
    document.body.innerHTML = '<main></main>';
    expect(findNav(document)).toBeNull();
  });

  it('finds the breadcrumb nav', () => {
    const nav = mountBreadcrumb(DEEP);
    expect(findNav(document)).toBe(nav);
  });
});

describe('snapshotBreadcrumb', () => {
  it('reads the visible folders and the "..." button of a collapsed path', () => {
    const nav = mountBreadcrumb(DEEP);
    const snapshot = snapshotBreadcrumb(nav, `/drive/folders/${CURRENT.id}`);
    expect(snapshot.visible).toEqual([FOLDER_C, CURRENT]);
    expect(snapshot.collapsedButton).not.toBeNull();
  });

  it('reads every folder of a path Drive shows in full', () => {
    const nav = mountBreadcrumb(SHALLOW);
    const snapshot = snapshotBreadcrumb(nav, `/drive/folders/${CURRENT.id}`);
    expect(snapshot.visible).toEqual([ROOT, FOLDER_A, CURRENT]);
    expect(snapshot.collapsedButton).toBeNull();
  });

  it('gives the current folder no id outside a folder URL', () => {
    const nav = mountBreadcrumb(SHALLOW, '/drive/my-drive');
    expect(snapshotBreadcrumb(nav, '/drive/my-drive').visible.at(-1)).toEqual({ id: null, name: CURRENT.name });
  });

  it('ignores items inserted by the extension', () => {
    const nav = mountBreadcrumb(DEEP);
    const before = snapshotBreadcrumb(nav, '/p').signature;
    const own = document.createElement('div');
    own.setAttribute('role', 'listitem');
    own.setAttribute(OWN_ITEM_ATTR, '');
    own.textContent = 'inserted';
    nav.querySelector('[role="list"]')?.prepend(own);
    expect(snapshotBreadcrumb(nav, '/p').signature).toBe(before);
  });

  it("detects Drive showing the old and the new folder's items side by side", () => {
    const nav = mountBreadcrumb(DEEP);
    expect(snapshotBreadcrumb(nav, '/p').inTransition).toBe(false);
    const list = nav.querySelector('[role="list"]');
    list?.insertAdjacentHTML('afterbegin', breadcrumbListHtml(SHALLOW));
    expect(snapshotBreadcrumb(nav, '/p').inTransition).toBe(true);
  });

  it('changes the signature when the folder changes', () => {
    const nav = mountBreadcrumb(DEEP);
    expect(snapshotBreadcrumb(nav, '/a').signature).not.toBe(snapshotBreadcrumb(nav, '/b').signature);
  });
});

describe('labelOf', () => {
  it('prefers aria-label and falls back to the text', () => {
    const element = document.createElement('div');
    element.textContent = '  Text  ';
    expect(labelOf(element)).toBe('Text');
    element.setAttribute('aria-label', 'Label');
    expect(labelOf(element)).toBe('Label');
  });
});

import { describe, expect, it } from 'vitest';
import { folderIdFromPathname, folderUrl, formatPath, formatCopyPath } from '../src/shared/path';
import { DEFAULT_COPY_SETTINGS } from '../src/shared/settings';

describe('formatPath', () => {
  const path = [
    { id: 'r', name: 'My Drive' },
    { id: 'a', name: 'A' },
    { id: null, name: 'B' },
  ];

  it('joins folder names with the given separator from the root down', () => {
    expect(formatPath(path, '/')).toBe('My Drive/A/B');
    expect(formatPath(path, '\\')).toBe('My Drive\\A\\B');
  });

  it('returns an empty string for an empty path', () => {
    expect(formatPath([], '/')).toBe('');
  });
});

describe('formatCopyPath', () => {
  const path = [{ id: 'root', name: '001_Team' }, { id: 'a', name: '資料' }];
  const settings = { prefix: '/Volumes/Drive/', separator: '/' } as const;

  it('prepends the prefix regardless of the first folder name', () => {
    expect(formatCopyPath(path, settings)).toBe('/Volumes/Drive/001_Team/資料');
    expect(formatCopyPath([{ id: 'other', name: 'Other' }, ...path], settings)).toBe('/Volumes/Drive/Other/001_Team/資料');
  });

  it('preserves arbitrary prefix text exactly', () => {
    expect(formatCopyPath(path, { prefix: 'Reference: ', separator: '/' })).toBe('Reference: 001_Team/資料');
    expect(formatCopyPath(path, { prefix: '', separator: '/' })).toBe('001_Team/資料');
  });

  it('uses the separator between folders and leaves the prefix as entered', () => {
    expect(formatCopyPath(path, { prefix: 'G:\\共有ドライブ\\', separator: '\\' })).toBe('G:\\共有ドライブ\\001_Team\\資料');
    expect(formatCopyPath(path, { prefix: 'a/b/', separator: '\\' })).toBe('a/b/001_Team\\資料');
  });

  it('copies only the folder names joined by "/" with the default settings', () => {
    expect(formatCopyPath(path, DEFAULT_COPY_SETTINGS)).toBe('001_Team/資料');
  });

  it('preserves Japanese Unicode spelling in copied folder names', () => {
    const name = '共有ドライブ';
    expect(formatCopyPath([{ id: 'r', name }], { prefix: '/', separator: '/' })).toBe(`/${name}`);
  });

  it('does not copy a prefix by itself for an empty path', () => {
    expect(formatCopyPath([], settings)).toBe('');
  });
});

describe('folderIdFromPathname', () => {
  it.each([
    ['/drive/folders/abc', 'abc'],
    ['/drive/u/1/folders/abc', 'abc'],
    ['/drive/folders/abc?resourcekey=x', 'abc'],
  ])('reads the folder id from %s', (pathname, id) => {
    expect(folderIdFromPathname(pathname)).toBe(id);
  });

  it('returns null outside a folder', () => {
    expect(folderIdFromPathname('/drive/my-drive')).toBeNull();
  });
});

describe('folderUrl', () => {
  it('builds a folder URL', () => {
    expect(folderUrl('/drive/folders/x', 'y')).toBe('/drive/folders/y');
  });

  it('keeps the /u/N/ account prefix', () => {
    expect(folderUrl('/drive/u/2/folders/x', 'y')).toBe('/drive/u/2/folders/y');
  });

  it('encodes the id', () => {
    expect(folderUrl('/drive/my-drive', 'a/b')).toBe('/drive/folders/a%2Fb');
  });
});

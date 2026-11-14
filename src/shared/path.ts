import type { FolderPath } from './types';
import type { CopySettings, PathSeparator } from './settings';

const FOLDER_ID_PATTERN = /\/folders\/([^/?#]+)/;
const ACCOUNT_PATTERN = /^\/drive\/u\/(\d+)\//;

export const formatPath = (path: FolderPath, separator: PathSeparator): string =>
  path.map((folder) => folder.name).join(separator);

export const formatCopyPath = (path: FolderPath, settings: CopySettings): string => {
  const formatted = formatPath(path, settings.separator);
  if (path.length === 0) return formatted;
  return settings.prefix + formatted;
};

export const folderIdFromPathname = (pathname: string): string | null =>
  pathname.match(FOLDER_ID_PATTERN)?.[1] ?? null;

/** Builds a folder URL that keeps the `/u/N/` account prefix of the current page. */
export const folderUrl = (pathname: string, id: string): string => {
  const account = pathname.match(ACCOUNT_PATTERN)?.[1];
  const prefix = account === undefined ? '/drive' : `/drive/u/${account}`;
  return `${prefix}/folders/${encodeURIComponent(id)}`;
};

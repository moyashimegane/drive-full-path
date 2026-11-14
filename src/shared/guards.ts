import type { Folder, PathResponse, Request } from './types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isFolder = (value: unknown): value is Folder =>
  isRecord(value) &&
  (typeof value.id === 'string' || value.id === null) &&
  typeof value.name === 'string';

export const isRequest = (value: unknown): value is Request => {
  if (!isRecord(value)) return false;
  if (value.type === 'dfp:getPath') return true;
  return value.type === 'dfp:navigate' && typeof value.id === 'string' && value.id !== '';
};

export const isPathResponse = (value: unknown): value is PathResponse => {
  if (!isRecord(value)) return false;
  if (value.ok === true) return Array.isArray(value.path) && value.path.every(isFolder);
  return value.ok === false && (value.reason === 'not-folder-view' || value.reason === 'read-failed');
};

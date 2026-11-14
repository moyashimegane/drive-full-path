export interface Folder {
  readonly id: string | null;
  readonly name: string;
}

export type FolderPath = readonly Folder[];

export type PathFailure = 'not-folder-view' | 'read-failed';

export type PathResponse =
  | { readonly ok: true; readonly path: FolderPath }
  | { readonly ok: false; readonly reason: PathFailure };

export interface NavigateResponse {
  readonly ok: boolean;
}

export type Request =
  | { readonly type: 'dfp:getPath' }
  | { readonly type: 'dfp:navigate'; readonly id: string };

import type { FolderPath, PathResponse } from '../shared/types';
import { type BreadcrumbSnapshot, findNav, snapshotBreadcrumb } from './breadcrumb';
import { isInlineRendered, removeInline, renderInline } from './inline';
import { readHiddenFolders } from './menu';
import { navigateToFolder, type UrlNavigator } from './navigate';
import { waitFor } from './wait';

const LOG_PREFIX = '[Full Path for Google Drive]';
const DEFAULT_DEBOUNCE_MS = 150;
// Drive takes up to about 600ms to replace the old folder's breadcrumb items.
const TRANSITION_TIMEOUT_MS = 3000;

interface CacheEntry {
  readonly signature: string;
  readonly hidden: FolderPath;
  readonly visible: FolderPath;
}

export interface Controller {
  readonly start: () => void;
  readonly stop: () => void;
  readonly getPath: () => Promise<PathResponse>;
  readonly navigate: (id: string) => Promise<void>;
}

export interface ControllerOptions {
  readonly debounceMs?: number;
  readonly navigateUrl?: UrlNavigator;
}

/**
 * Keeps the full path of the open folder in sync with Drive's breadcrumb:
 * re-reads it when the folder changes and re-inserts it when Drive re-renders.
 */
export const createController = (doc: Document, options: ControllerOptions = {}): Controller => {
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  let cache: CacheEntry | null = null;
  // A breadcrumb that failed to read is not retried automatically, only on request.
  let failedSignature: string | null = null;
  let inflight: Promise<CacheEntry | null> | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let observer: MutationObserver | null = null;

  const navigate = async (id: string): Promise<void> => {
    await navigateToFolder(doc, id, options.navigateUrl);
  };

  const render = (nav: HTMLElement, entry: CacheEntry): void => {
    renderInline(nav, entry.hidden, (id) => {
      navigate(id).catch((error: unknown) => console.warn(LOG_PREFIX, 'navigation failed', error));
    });
  };

  const currentSignature = (nav: HTMLElement): string =>
    snapshotBreadcrumb(nav, doc.location.pathname).signature;

  /** Resolves null when the page has no breadcrumb. */
  const stableSnapshot = async (): Promise<BreadcrumbSnapshot | null> => {
    const result = await waitFor(() => {
      const nav = findNav(doc);
      if (!nav) return { snapshot: null };
      const snapshot = snapshotBreadcrumb(nav, doc.location.pathname);
      return snapshot.inTransition ? null : { snapshot };
    }, TRANSITION_TIMEOUT_MS);
    return result.snapshot;
  };

  const read = async (onStart: (signature: string) => void): Promise<CacheEntry | null> => {
    const snapshot = await stableSnapshot();
    if (!snapshot) return null;
    onStart(snapshot.signature);
    const hidden = snapshot.collapsedButton ? await readHiddenFolders(doc, snapshot.collapsedButton) : [];
    return { signature: snapshot.signature, hidden, visible: snapshot.visible };
  };

  const refresh = (): Promise<CacheEntry | null> => {
    if (inflight) return inflight;
    let attempted: string | null = null;
    inflight = read((signature) => {
      attempted = signature;
    })
      .then(
        (entry) => {
          cache = entry;
          failedSignature = null;
          const nav = findNav(doc);
          // A result for a folder the user has already left must not be shown.
          if (entry && nav && currentSignature(nav) === entry.signature) render(nav, entry);
          return entry;
        },
        (error: unknown) => {
          failedSignature = attempted;
          throw error;
        },
      )
      .finally(() => {
        inflight = null;
        // The folder may have changed while the menu was being read.
        check();
      });
    return inflight;
  };

  const scheduleRefresh = (): void => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      refresh().catch((error: unknown) => console.warn(LOG_PREFIX, 'could not read the folder path', error));
    }, debounceMs);
  };

  function check(): void {
    if (inflight) return;
    const nav = findNav(doc);
    if (!nav) {
      cache = null;
      return;
    }
    const snapshot = snapshotBreadcrumb(nav, doc.location.pathname);
    if (cache?.signature === snapshot.signature) {
      if (cache.hidden.length > 0 && !isInlineRendered(nav)) render(nav, cache);
      return;
    }
    // Drop the old folder's path at once so it is never shown for the new folder.
    removeInline(nav);
    // Drive's own replacement of the old items triggers the next check.
    if (snapshot.inTransition) return;
    if (snapshot.signature !== failedSignature) scheduleRefresh();
  }

  const getPath = async (): Promise<PathResponse> => {
    const nav = findNav(doc);
    if (!nav) return { ok: false, reason: 'not-folder-view' };
    try {
      const signature = currentSignature(nav);
      const entry = cache?.signature === signature ? cache : await refresh();
      if (!entry) return { ok: false, reason: 'not-folder-view' };
      // The folder changed while it was being read.
      const latest = findNav(doc);
      if (!latest || entry.signature !== currentSignature(latest)) return { ok: false, reason: 'read-failed' };
      return { ok: true, path: [...entry.hidden, ...entry.visible] };
    } catch (error) {
      console.warn(LOG_PREFIX, 'could not read the folder path', error);
      return { ok: false, reason: 'read-failed' };
    }
  };

  const start = (): void => {
    if (observer) return;
    observer = new MutationObserver(check);
    observer.observe(doc.body, { childList: true, subtree: true, characterData: true });
    check();
  };

  const stop = (): void => {
    observer?.disconnect();
    observer = null;
    clearTimeout(timer);
  };

  return { start, stop, getPath, navigate };
};

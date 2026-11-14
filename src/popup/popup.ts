import { isPathResponse } from '../shared/guards';
import { applyMessages } from '../shared/i18n';
import { formatCopyPath } from '../shared/path';
import type { CopySettings } from '../shared/settings';
import type { FolderPath, PathFailure, Request } from '../shared/types';

export interface PopupApi {
  readonly queryActiveTabId: () => Promise<number | null>;
  readonly sendMessage: (tabId: number, request: Request) => Promise<unknown>;
  readonly getMessage: (key: string) => string;
  readonly writeClipboard: (text: string) => Promise<void>;
  readonly close: () => void;
  readonly loadSettings: () => Promise<CopySettings>;
  readonly openOptions: () => Promise<void>;
}

const FAILURE_MESSAGES: Readonly<Record<PathFailure, string>> = {
  'not-folder-view': 'notFolderView',
  'read-failed': 'readFailed',
};

const requireElement = <T extends Element>(doc: Document, selector: string): T => {
  const element = doc.querySelector<T>(selector);
  if (!element) throw new Error(`popup.html is missing ${selector}`);
  return element;
};

const renderPath = (doc: Document, list: HTMLElement, path: FolderPath, onSelect: (id: string) => void): void => {
  const items = path.map((folder, index) => {
    const item = doc.createElement('li');
    item.style.setProperty('--depth', String(index));
    const isCurrent = index === path.length - 1;
    if (isCurrent || folder.id === null) {
      const label = doc.createElement('span');
      label.className = isCurrent ? 'folder current' : 'folder';
      if (isCurrent) label.setAttribute('aria-current', 'location');
      label.textContent = folder.name;
      item.append(label);
    } else {
      const id = folder.id;
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = 'folder';
      button.textContent = folder.name;
      button.addEventListener('click', () => onSelect(id));
      item.append(button);
    }
    return item;
  });
  list.replaceChildren(...items);
  list.hidden = false;
};

const showMessage = (element: HTMLElement, text: string): void => {
  element.textContent = text;
  element.hidden = false;
};

const requestPath = async (api: PopupApi, tabId: number | null): Promise<unknown> => {
  if (tabId === null) return null;
  // Rejects when the tab has no content script, i.e. it is not a Drive page.
  return api.sendMessage(tabId, { type: 'dfp:getPath' }).catch(() => null);
};

export const initPopup = async (doc: Document, api: PopupApi): Promise<void> => {
  applyMessages(doc, api.getMessage);
  const list = requireElement<HTMLElement>(doc, '#path');
  const message = requireElement<HTMLElement>(doc, '#message');
  const copyButton = requireElement<HTMLButtonElement>(doc, '#copy');
  const status = requireElement<HTMLElement>(doc, '#status');
  const preview = requireElement<HTMLElement>(doc, '#copy-preview');
  const optionsButton = requireElement<HTMLButtonElement>(doc, '#options');
  optionsButton.addEventListener('click', () => {
    api.openOptions().catch(() => {
      status.textContent = api.getMessage('optionsFailed');
    });
  });

  const [tabId, settings] = await Promise.all([
    api.queryActiveTabId(),
    api.loadSettings().catch(() => null),
  ]);
  const response = await requestPath(api, tabId);
  if (tabId === null || !isPathResponse(response)) {
    showMessage(message, api.getMessage('notFolderView'));
    return;
  }
  if (!response.ok) {
    showMessage(message, api.getMessage(FAILURE_MESSAGES[response.reason]));
    return;
  }

  const { path } = response;
  renderPath(doc, list, path, (id) => {
    api
      .sendMessage(tabId, { type: 'dfp:navigate', id })
      .catch((error: unknown) => console.warn('[Full Path for Google Drive]', 'navigation failed', error))
      .finally(() => api.close());
  });

  if (!settings) {
    status.textContent = api.getMessage('settingsLoadFailed');
    return;
  }
  const copyPath = formatCopyPath(path, settings);
  preview.textContent = copyPath;
  preview.hidden = false;
  copyButton.disabled = false;
  copyButton.addEventListener('click', () => {
    api.writeClipboard(copyPath).then(
      () => {
        status.textContent = api.getMessage('copied');
      },
      (error: unknown) => {
        console.warn('[Full Path for Google Drive]', 'copy failed', error);
        status.textContent = api.getMessage('copyFailed');
      },
    );
  });
};

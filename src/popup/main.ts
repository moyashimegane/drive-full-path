import { initPopup } from './popup';
import { loadCopySettings } from '../shared/settings';

void initPopup(document, {
  queryActiveTabId: async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab?.id ?? null;
  },
  sendMessage: (tabId, request) => chrome.tabs.sendMessage(tabId, request),
  getMessage: (key) => chrome.i18n.getMessage(key),
  writeClipboard: (text) => navigator.clipboard.writeText(text),
  close: () => window.close(),
  loadSettings: loadCopySettings,
  openOptions: () => chrome.runtime.openOptionsPage(),
});

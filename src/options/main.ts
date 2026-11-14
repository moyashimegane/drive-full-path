import { initOptions } from './options';
import { loadCopySettings, saveCopySettings } from '../shared/settings';

void initOptions(document, {
  getMessage: (key) => chrome.i18n.getMessage(key),
  loadSettings: loadCopySettings,
  saveSettings: saveCopySettings,
});

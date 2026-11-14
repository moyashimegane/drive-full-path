import { applyMessages } from '../shared/i18n';
import { parseCopySettings, type CopySettings } from '../shared/settings';

export interface OptionsApi {
  readonly getMessage: (key: string) => string;
  readonly loadSettings: () => Promise<CopySettings>;
  readonly saveSettings: (settings: CopySettings) => Promise<void>;
}

export const initOptions = async (doc: Document, api: OptionsApi): Promise<void> => {
  applyMessages(doc, api.getMessage);
  doc.title = api.getMessage('optionsTitle');
  const form = doc.querySelector<HTMLFormElement>('#settings');
  const prefix = doc.querySelector<HTMLTextAreaElement>('#prefix');
  const separator = doc.querySelector<HTMLSelectElement>('#separator');
  const save = doc.querySelector<HTMLButtonElement>('#save');
  const status = doc.querySelector<HTMLElement>('#status');
  if (!form || !prefix || !separator || !save || !status) throw new Error('options.html is missing form elements');

  try {
    const settings = await api.loadSettings();
    prefix.value = settings.prefix;
    separator.value = settings.separator;
  } catch {
    status.textContent = api.getMessage('settingsLoadFailed');
    return;
  }
  prefix.disabled = false;
  separator.disabled = false;
  save.disabled = false;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    save.disabled = true;
    status.textContent = '';
    api.saveSettings(parseCopySettings({ prefix: prefix.value, separator: separator.value })).then(
      () => { status.textContent = api.getMessage('settingsSaved'); },
      () => { status.textContent = api.getMessage('settingsSaveFailed'); },
    ).finally(() => { save.disabled = false; });
  });
  form.addEventListener('input', () => { status.textContent = ''; });
};

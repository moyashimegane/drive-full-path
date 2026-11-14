const PATH_SEPARATORS = ['/', '\\'] as const;

export type PathSeparator = (typeof PATH_SEPARATORS)[number];

export interface CopySettings {
  readonly prefix: string;
  readonly separator: PathSeparator;
}

export const SETTINGS_KEY = 'copySettings';

export const DEFAULT_COPY_SETTINGS: CopySettings = {
  prefix: '',
  separator: '/',
};

const isPathSeparator = (value: unknown): value is PathSeparator =>
  PATH_SEPARATORS.some((separator) => separator === value);

export const parseCopySettings = (value: unknown): CopySettings => {
  if (typeof value !== 'object' || value === null) return { ...DEFAULT_COPY_SETTINGS };
  const settings = value as Record<string, unknown>;
  return {
    prefix: typeof settings.prefix === 'string' ? settings.prefix : DEFAULT_COPY_SETTINGS.prefix,
    separator: isPathSeparator(settings.separator) ? settings.separator : DEFAULT_COPY_SETTINGS.separator,
  };
};

export const loadCopySettings = async (): Promise<CopySettings> => {
  const values = await chrome.storage.local.get(SETTINGS_KEY);
  return parseCopySettings(values[SETTINGS_KEY]);
};

export const saveCopySettings = async (settings: CopySettings): Promise<void> => {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
};

export const applyMessages = (doc: Document, getMessage: (key: string) => string): void => {
  doc.querySelectorAll<HTMLElement>('[data-i18n]').forEach((element) => {
    element.textContent = getMessage(element.dataset.i18n ?? '');
  });
};

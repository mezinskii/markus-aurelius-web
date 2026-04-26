export type Footnote = { key: string; text: string };

export function renderWithFootnotes(
  text: string,
  footnotes: Footnote[] | null | undefined,
): string {
  const map = new Map<string, string>();
  if (footnotes) for (const fn of footnotes) map.set(fn.key, fn.text);

  const replace = (_: string, key: string) => {
    const fnText = map.get(key);
    if (fnText) {
      return `<sup class="fn-sup" role="button" tabindex="0" data-fn-key="${key}" data-fn-text="${escapeAttr(fnText)}">${key}</sup>`;
    }
    return `<sup class="fn-sup" data-fn-key="${key}">${key}</sup>`;
  };

  return text
    .replace(/\{\{fn:(\d+)\}\}/g, replace)
    .replace(/\[(\d+)\]/g, replace);
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, ' ');
}

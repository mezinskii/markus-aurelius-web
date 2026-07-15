/**
 * Quotation + citation strings for the academic passage page.
 *
 * All of these are built at render time and shipped to the browser inside the
 * `acad-share-data` JSON blob, so the copy handlers are pure lookups. Keeping
 * the derivation server-side means a copied attribution can't drift from the
 * translator credit the page actually displays.
 */
import type { PTBlock } from '../sanity';
import type { Lang } from '../ui';

/**
 * Flatten Portable Text to plain prose, keeping paragraph breaks.
 *
 * Footnote markers live in `markDefs` rather than in span text, so they fall
 * out on their own — a copied quotation shouldn't carry dangling superscripts
 * whose notes didn't come along.
 */
export function ptToPlain(blocks: PTBlock[] | null | undefined): string {
  if (!blocks) return '';
  const paras: string[] = [];
  for (const b of blocks) {
    if (b._type !== 'block') continue;
    let s = '';
    for (const c of b.children ?? []) {
      if (c._type === 'span' && typeof c.text === 'string') s += c.text;
    }
    s = s.replace(/[ \t]+/g, ' ').trim();
    if (s) paras.push(s);
  }
  // Drop the trailing translator credit baked into the source body — the same
  // `*(пер. Роговин)*` paragraph that stripTranslatorCredit removes from the
  // HTML. We already state the translator in the attribution line.
  if (paras.length > 1 && /^\([^()]*\)$/.test(paras[paras.length - 1])) paras.pop();
  return paras.join('\n\n');
}

export interface CiteFacts {
  lang: Lang;
  /** Roman book number, e.g. "II" — matches what the page shows. */
  roman: string;
  chapter: number;
  /** Absolute canonical URL of the passage. */
  url: string;
}

const AUTHOR: Record<Lang, string> = { en: 'Marcus Aurelius', ru: 'Марк Аврелий' };
const WORK: Record<Lang, string> = { en: 'Meditations', ru: 'Размышления' };

/** "Marcus Aurelius, Meditations II.14" / "Марк Аврелий. Размышления, II.14" */
export function workRef(f: CiteFacts): string {
  return f.lang === 'ru'
    ? `${AUTHOR.ru}. ${WORK.ru}, ${f.roman}.${f.chapter}`
    : `${AUTHOR.en}, ${WORK.en} ${f.roman}.${f.chapter}`;
}

/**
 * Reference line with no passage text — what you drop in a footnote.
 * `credit` is a ready-made "trans.: George Long, 1862" style string; it uses a
 * colon so the name can stay in the nominative and Russian needs no declension.
 */
export function citationLine(f: CiteFacts, credit: string): string {
  return `${workRef(f)} · ${credit} · ${f.url}`;
}

/** Passage text followed by its attribution and canonical link. */
export function quotationBlock(f: CiteFacts, text: string, credit: string): string {
  return `${text}\n\n— ${workRef(f)} · ${credit}\n${f.url}`;
}

/**
 * Sequential navigation for passage pages — prev/next neighbours plus the
 * passage's position inside its book and the full chapter list for a jump grid.
 *
 * Built once inside `getStaticPaths`, from the same `passage` + `passageCard`
 * arrays that route already fetches, so this costs no extra Sanity query.
 *
 * Numbering rule (mirrors getMeditationsBookCards in sanity.ts): a book that has
 * passageCards is ordered by *card chapters*, because that's what its detail
 * pages render; a book without cards falls back to the legacy George Long /
 * Роговин sections. The two diverge — Book VI has 58 Long sections but 59 card
 * chapters — so mixing them would produce neighbours that 404 or skip a passage.
 * Crossing a book boundary is allowed: the last chapter of VI leads into VII.1,
 * which is exactly what a reader going straight through expects.
 */
import type { MeditationPassage, PassageCard } from './sanity';
import type { Lang } from './ui';
import { ptToPlain } from './academic/cite';

export interface PassageNeighbor {
  book: number;
  /** Chapter/section id as it appears in the URL. */
  section: string;
  /** Short plain-text opening of the passage — the preview on a nav card. */
  preview: string;
}

export interface PassageNav {
  prev: PassageNeighbor | null;
  next: PassageNeighbor | null;
  /** Every chapter of the *current* book, in reading order (the jump grid). */
  chapters: string[];
  /** 1-based position of this passage within its book. */
  position: number;
  /** Number of passages in this book. */
  total: number;
}

const PREVIEW_MAX = 130;

/** Footnote markers (`{{fn:3}}`, `[3]`) are stripped — a preview shouldn't carry
 *  superscript debris whose notes didn't come along. */
function snippet(raw: string): string {
  const s = raw.replace(/\{\{fn:\d+\}\}|\[\d+\]/g, '').replace(/\s+/g, ' ').trim();
  if (s.length <= PREVIEW_MAX) return s;
  const cut = s.slice(0, PREVIEW_MAX);
  const lastSpace = cut.lastIndexOf(' ');
  const body = lastSpace > PREVIEW_MAX * 0.6 ? cut.slice(0, lastSpace) : cut;
  return body.replace(/[,;:.\-–—]+$/, '') + '…';
}

const bySection = (a: PassageNeighbor, b: PassageNeighbor) =>
  parseInt(a.section, 10) - parseInt(b.section, 10);

function push(map: Map<number, PassageNeighbor[]>, n: PassageNeighbor): void {
  const list = map.get(n.book);
  if (list) list.push(n);
  else map.set(n.book, [n]);
}

/**
 * Returns a lookup keyed `"<book>.<section>"` — the same key shape the routes
 * use to attach a passageCard to a path.
 */
export function buildPassageNav(
  legacy: MeditationPassage[],
  cards: PassageCard[],
  lang: Lang,
): Map<string, PassageNav> {
  const cardBooks = new Map<number, PassageNeighbor[]>();
  for (const c of cards) {
    push(cardBooks, {
      book: c.book,
      section: String(c.chapter),
      preview: snippet(ptToPlain(lang === 'ru' ? c.russianText : c.englishText)),
    });
  }

  const legacyBooks = new Map<number, PassageNeighbor[]>();
  for (const p of legacy) {
    push(legacyBooks, { book: p.book, section: p.section, preview: snippet(p.text ?? '') });
  }

  const books = [...new Set([...cardBooks.keys(), ...legacyBooks.keys()])].sort((a, b) => a - b);

  // One flat reading order across the whole corpus, plus each entry's book context.
  type Entry = { n: PassageNeighbor; chapters: string[]; position: number; total: number };
  const entries: Entry[] = [];
  for (const book of books) {
    const list = (cardBooks.get(book) ?? legacyBooks.get(book) ?? []).slice().sort(bySection);
    const chapters = list.map(x => x.section);
    list.forEach((n, i) => entries.push({ n, chapters, position: i + 1, total: list.length }));
  }

  const nav = new Map<string, PassageNav>();
  entries.forEach((e, i) => {
    nav.set(`${e.n.book}.${e.n.section}`, {
      prev: entries[i - 1]?.n ?? null,
      next: entries[i + 1]?.n ?? null,
      chapters: e.chapters,
      position: e.position,
      total: e.total,
    });
  });
  return nav;
}

import type { IndexEntry, IndexType } from './search-index';

export type { IndexEntry, IndexType };

export interface SearchHit {
  entry: IndexEntry;
  score: number;
  snippetHtml: string;
}

const WORD_CHAR = /[\p{L}\p{N}]/u;

function isWordChar(ch: string | undefined): boolean {
  if (!ch) return false;
  return WORD_CHAR.test(ch);
}

/** Lowercase + collapse Russian ё→е. Punctuation kept (we use indices into this string). */
export function normalize(s: string): string {
  return s.toLowerCase().replace(/ё/g, 'е').replace(/Ё/g, 'Е');
}

/** Split a query into trimmed, normalized words (≥1 char). */
export function tokenize(q: string): string[] {
  return normalize(q)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(w => w.length > 0);
}

/** All non-overlapping match positions of `needle` in `haystack`. */
function findAll(haystack: string, needle: string): number[] {
  if (!needle) return [];
  const out: number[] = [];
  let from = 0;
  while (true) {
    const i = haystack.indexOf(needle, from);
    if (i < 0) break;
    out.push(i);
    from = i + needle.length;
  }
  return out;
}

interface ScoredMatch {
  /** Positions of every match span (start, length) used to build the snippet. */
  spans: Array<{ start: number; len: number }>;
  score: number;
}

/**
 * Score a normalized text against a query.
 * Ranking, highest-first:
 *   1. Exact phrase at word boundary
 *   2. Exact phrase substring
 *   3. All query words present at word boundaries
 *   4. All query words present (any position)
 *   5. Some query words present
 */
function scoreEntry(text: string, words: string[], phrase: string): ScoredMatch | null {
  if (!words.length) return null;
  const spans: Array<{ start: number; len: number }> = [];
  let score = 0;

  if (phrase.length > 0 && words.length > 1) {
    const phraseHits = findAll(text, phrase);
    for (const i of phraseHits) {
      const before = text[i - 1];
      const after = text[i + phrase.length];
      const wb = !isWordChar(before) && !isWordChar(after);
      score += wb ? 200 : 100;
      spans.push({ start: i, len: phrase.length });
    }
  }

  let wordsFoundCount = 0;
  let wordsFoundAtBoundary = 0;

  for (const w of words) {
    const hits = findAll(text, w);
    if (!hits.length) continue;
    wordsFoundCount++;
    let anyBoundary = false;
    let perWord = 0;
    for (const i of hits) {
      const before = text[i - 1];
      const after = text[i + w.length];
      const startsWord = !isWordChar(before);
      const endsWord = !isWordChar(after);
      if (startsWord && endsWord) {
        perWord += 30;
        anyBoundary = true;
      } else if (startsWord || endsWord) {
        perWord += 10;
      } else {
        perWord += 3;
      }
      spans.push({ start: i, len: w.length });
    }
    if (anyBoundary) wordsFoundAtBoundary++;
    score += Math.min(perWord, 90);
  }

  if (wordsFoundCount === 0) return null;
  if (wordsFoundCount === words.length) score += 50;
  if (wordsFoundAtBoundary === words.length) score += 30;
  score += wordsFoundCount * 5;

  return { spans, score };
}

/** Merge overlapping/touching spans into sorted, disjoint ranges. */
function mergeSpans(spans: Array<{ start: number; len: number }>): Array<{ start: number; end: number }> {
  if (!spans.length) return [];
  const sorted = spans.map(s => ({ start: s.start, end: s.start + s.len })).sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const cur = sorted[i];
    if (cur.start <= last.end) {
      last.end = Math.max(last.end, cur.end);
    } else {
      merged.push(cur);
    }
  }
  return merged;
}

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ESC[c]);
}

/**
 * Build a snippet from `original` (real text) using `normalized` (lowercased) for matching.
 * Wraps matched ranges in <mark>. Includes ~40 chars of context before the first match
 * and trims to ~220 chars total. Renders ellipses on truncation.
 */
function buildSnippet(
  original: string,
  normalized: string,
  spans: Array<{ start: number; len: number }>,
  maxLen = 220,
  leadCtx = 40,
): string {
  const ranges = mergeSpans(spans);
  if (!ranges.length) {
    const truncated = original.length > maxLen ? original.slice(0, maxLen) + '…' : original;
    return escapeHtml(truncated);
  }
  const first = ranges[0];
  const start = Math.max(0, first.start - leadCtx);
  const end = Math.min(original.length, start + maxLen);
  const visibleRanges = ranges
    .filter(r => r.start < end && r.end > start)
    .map(r => ({ start: Math.max(r.start, start), end: Math.min(r.end, end) }));

  let html = '';
  let cursor = start;
  for (const r of visibleRanges) {
    if (r.start > cursor) html += escapeHtml(original.slice(cursor, r.start));
    html += '<mark>' + escapeHtml(original.slice(r.start, r.end)) + '</mark>';
    cursor = r.end;
  }
  if (cursor < end) html += escapeHtml(original.slice(cursor, end));

  return (start > 0 ? '… ' : '') + html + (end < original.length ? ' …' : '');
}

interface PreparedEntry extends IndexEntry {
  _n: string;
}

/** Lazily-cached normalized text on each entry. */
function prepare(entries: IndexEntry[]): PreparedEntry[] {
  return entries.map(e => {
    const cached = (e as PreparedEntry)._n;
    if (cached !== undefined) return e as PreparedEntry;
    const prepared = e as PreparedEntry;
    prepared._n = normalize(e.text);
    return prepared;
  });
}

const TYPE_RANK: Record<IndexType, number> = { m: 2, l: 1, s: 0 };

export function search(entries: IndexEntry[], query: string, limit = 40): SearchHit[] {
  const prepared = prepare(entries);
  const words = tokenize(query);
  if (!words.length) return [];
  const phrase = normalize(query.trim());

  const hits: SearchHit[] = [];
  for (const e of prepared) {
    const m = scoreEntry(e._n, words, phrase);
    if (!m) continue;
    hits.push({
      entry: e,
      score: m.score,
      snippetHtml: buildSnippet(e.text, e._n, m.spans),
    });
  }

  hits.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const tr = TYPE_RANK[b.entry.type] - TYPE_RANK[a.entry.type];
    if (tr !== 0) return tr;
    return a.entry.ref.localeCompare(b.entry.ref);
  });

  return hits.slice(0, limit);
}

/** Build a URL with ?q= and a #:~:text= fragment for browser-native highlighting. */
export function buildHighlightedUrl(baseUrl: string, query: string): string {
  const trimmed = query.trim();
  if (!trimmed) return baseUrl;
  const [pathPart, hashPart] = baseUrl.split('#');
  const sep = pathPart.includes('?') ? '&' : '?';
  const withQuery = `${pathPart}${sep}q=${encodeURIComponent(trimmed)}`;
  // Native scroll-to-text. Skip if base already had its own hash anchor (e.g. /sayings#s12).
  if (hashPart) return `${withQuery}#${hashPart}`;
  return `${withQuery}#:~:text=${encodeURIComponent(trimmed)}`;
}

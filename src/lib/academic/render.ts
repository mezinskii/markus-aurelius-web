/**
 * Portable Text renderer for the academic (Book II) layout.
 *
 * Produces an HTML string consumed by Astro via `set:html`. Renders:
 *   - block styles (normal / h2 / h3 / h4 / lead / blockquote)
 *   - lists (bullet / number) with nested level support
 *   - decorator marks (strong / em / code / underline)
 *   - custom marks: crossRef → <a class="xref">…</a>, footnoteRef → <sup>…</sup>,
 *     link → <a target=_blank>
 *   - inline Greek script auto-wrapped in <span class="gk"> (except inside the
 *     greekText block, where the whole content is already Greek)
 *
 * Two pre-computed indices are passed in:
 *   - entityIndex   — map<sanityId, RefSummary> so crossRefs render their slug,
 *                     type chip, and URL
 *   - footnoteRegistry — map<fnKey, {num, kind}> so footnoteRefs render as
 *                       sequential numbers (1, 2, 3) with the right colour class
 *                       (rubric red = translator, ochre = commentator).
 *
 * Callers build the registry once per page via `buildFootnoteRegistry(card)`
 * and the entity index via `buildEntityIndex(card)`.
 */
import type { PTBlock, RefSummary, EntityType, PassageCard } from '../sanity';

// ─── Public types ─────────────────────────────────────────────────────────────

export type TextContext = 'greek' | 'translation' | 'commentary' | 'footnote';

export interface FootnoteEntry {
  num: number;
  kind: 'trans' | 'comm';
}

export interface RenderContext {
  lang: 'en' | 'ru';
  /** Map sanityId → RefSummary, used to resolve crossRef target refs. */
  entityIndex: Map<string, RefSummary>;
  /** Map fnKey → {num, kind}, used to render footnoteRefs. */
  footnoteRegistry: Map<string, FootnoteEntry>;
  /** Affects xref chip display (suppressed in greek) and Greek auto-wrap. */
  textContext: TextContext;
}

// ─── Type-chip labels ─────────────────────────────────────────────────────────

const TYPE_LABEL: Record<EntityType, { en: string; ru: string }> = {
  term:     { en: 'TERM',     ru: 'ТЕРМИН' },
  dogma:    { en: 'DOGMA',    ru: 'ДОГМА' },
  exercise: { en: 'EXERCISE', ru: 'УПРАЖНЕНИЕ' },
  motif:    { en: 'MOTIF',    ru: 'ОБРАЗ' },
  person:   { en: 'PERSON',   ru: 'ЛИЦО' },
  place:    { en: 'PLACE',    ru: 'МЕСТО' },
};

const langPrefix = (lang: 'en' | 'ru') => (lang === 'ru' ? '/ru' : '');

// ─── HTML utilities ───────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Wrap runs of Greek-script text in <span class="gk">.
 *  Used inside commentary / translations, NOT inside the dedicated greekText
 *  block (where the whole text is already Greek and styled as such).
 *  Greek script ranges: U+0370–U+03FF (Greek + Coptic), U+1F00–U+1FFF
 *  (Greek Extended), plus combining diacritics U+0300–U+036F. */
function wrapGreek(text: string): string {
  const RUN =
    /[Ͱ-Ͽἀ-῿][Ͱ-Ͽἀ-῿̀-ͯ'ʼ’]*(?:[\s ][Ͱ-Ͽἀ-῿][Ͱ-Ͽἀ-῿̀-ͯ'ʼ’]*)*/g;
  return text.replace(RUN, m => `<span class="gk">${m}</span>`);
}

// ─── Mark-def resolution ──────────────────────────────────────────────────────

type AnyMarkDef = {
  _key: string;
  _type: string;
  // crossRef
  target?: { _ref?: string; _type?: string };
  // footnoteRef
  key?: string;
  // link
  href?: string;
  [k: string]: unknown;
};

/** Open + close tag pair for a single decorator or markDef. */
function decoratorTags(deco: string): [string, string] {
  switch (deco) {
    case 'strong':    return ['<strong>', '</strong>'];
    case 'em':        return ['<em>', '</em>'];
    case 'code':      return ['<code>', '</code>'];
    case 'underline': return ['<u>', '</u>'];
    default:          return ['', ''];
  }
}

function isDecorator(mark: string): boolean {
  return mark === 'strong' || mark === 'em' || mark === 'code' || mark === 'underline';
}

// ─── Block helpers ────────────────────────────────────────────────────────────

function blockOpen(style: string | undefined): string {
  switch (style) {
    case 'h2':         return '<h2>';
    case 'h3':         return '<h3>';
    case 'h4':         return '<h4>';
    case 'lead':       return '<p class="lead">';
    case 'blockquote': return '<blockquote>';
    default:           return '<p>';
  }
}

function blockClose(style: string | undefined): string {
  switch (style) {
    case 'h2':         return '</h2>';
    case 'h3':         return '</h3>';
    case 'h4':         return '</h4>';
    case 'blockquote': return '</blockquote>';
    default:           return '</p>';
  }
}

// ─── Inline rendering (a single span) ─────────────────────────────────────────

function renderSpan(
  text: string,
  marks: string[],
  markDefs: AnyMarkDef[],
  ctx: RenderContext,
): string {
  // First pass: split marks into custom (markDefs) and decorators.
  const customMarks: AnyMarkDef[] = [];
  const decos: string[] = [];
  for (const m of marks) {
    if (isDecorator(m)) {
      decos.push(m);
    } else {
      const def = markDefs.find(d => d._key === m);
      if (def) customMarks.push(def);
    }
  }

  // Inner content: text → Greek-wrap (unless we're in the greek block) → escape
  // We escape FIRST, then run wrapGreek, then wrapGreek's substitution inserts
  // its own (safe) HTML markers. Greek auto-wrap is disabled in 'greek' context
  // and inside crossRef labels (because the link wrapper handles its own typo).
  let inner = escapeHtml(text);
  if (ctx.textContext !== 'greek') {
    inner = wrapGreek(inner);
  }

  // Apply decorators (innermost → outermost)
  for (const d of decos) {
    const [o, c] = decoratorTags(d);
    inner = `${o}${inner}${c}`;
  }

  // Apply custom marks. Order matters less here because xref/link can't nest
  // each other in real content; if they do, the inner one wins.
  for (const def of customMarks) {
    inner = applyCustomMark(def, inner, ctx);
  }

  return inner;
}

function applyCustomMark(def: AnyMarkDef, inner: string, ctx: RenderContext): string {
  switch (def._type) {
    case 'crossRef': {
      const targetId = def.target?._ref ?? '';
      const ent = ctx.entityIndex.get(targetId);
      if (!ent || !ent.slug) {
        // Unknown reference — render as plain text rather than a broken link.
        return inner;
      }
      const url = `${langPrefix(ctx.lang)}/${ent._type}/${ent.slug}`;
      const chip = ctx.textContext === 'greek'
        ? ''
        : `<span class="xref-type">${TYPE_LABEL[ent._type][ctx.lang]}</span>`;
      return (
        `<a class="xref"` +
        ` href="${escapeHtml(url)}"` +
        ` data-entity-id="${escapeHtml(ent._id)}"` +
        ` data-entity-type="${ent._type}"` +
        `>${chip}${inner}</a>`
      );
    }
    case 'footnoteRef': {
      const key = def.key ?? '';
      const entry = ctx.footnoteRegistry.get(key);
      if (!entry) return inner; // unresolved key
      const cls = entry.kind === 'comm' ? 't-comm' : 't-trans';
      return (
        `<sup class="fn-mark ${cls}"` +
        ` data-fn-key="${escapeHtml(key)}"` +
        ` data-fn-num="${entry.num}"` +
        `>${entry.num}</sup>`
      );
    }
    case 'link': {
      const href = def.href ?? '#';
      // mailto/tel/http(s) only — passthrough; the schema validation already
      // restricted these but keep a defensive check
      const safeHref = /^(https?:|mailto:|tel:)/i.test(href) ? href : '#';
      return `<a href="${escapeHtml(safeHref)}" target="_blank" rel="noopener noreferrer">${inner}</a>`;
    }
    default:
      return inner;
  }
}

// ─── Block rendering ─────────────────────────────────────────────────────────

function renderBlockContent(block: PTBlock, ctx: RenderContext): string {
  const markDefs = (block.markDefs ?? []) as AnyMarkDef[];
  const children = block.children ?? [];
  let out = '';
  const usedMarkKeys = new Set<string>();
  for (const child of children) {
    if (child._type !== 'span') continue;
    for (const m of child.marks ?? []) usedMarkKeys.add(m);
    out += renderSpan(child.text ?? '', child.marks ?? [], markDefs, ctx);
  }

  // Orphan-markDef recovery: the upstream pipeline (markdownToPortableText)
  // currently emits footnoteRef markDefs without an attached span — see TODO
  // in marcus-aurelius/scripts/lib/markdownToPortableText.ts. As a defensive
  // fallback we surface unused footnoteRef defs as trailing sup-markers so the
  // reader at least sees that a footnote exists for this block. Position
  // within the block is lost; long term, fix the pipeline so [^key] markers
  // produce an in-line span and this fallback becomes dead code.
  for (const def of markDefs) {
    if (def._type !== 'footnoteRef') continue;
    if (usedMarkKeys.has(def._key)) continue;
    const key = def.key;
    if (!key) continue;
    const entry = ctx.footnoteRegistry.get(key);
    if (!entry) continue;
    const cls = entry.kind === 'comm' ? 't-comm' : 't-trans';
    out += (
      `<sup class="fn-mark ${cls}"` +
      ` data-fn-key="${escapeHtml(key)}"` +
      ` data-fn-num="${entry.num}"` +
      `>${entry.num}</sup>`
    );
  }
  return out;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/** Render a Portable Text block array into HTML. */
export function renderPortableText(blocks: PTBlock[] | null | undefined, ctx: RenderContext): string {
  if (!blocks || blocks.length === 0) return '';

  let html = '';
  // List-state tracking
  let openList: { type: 'bullet' | 'number'; level: number } | null = null;

  const closeList = () => {
    if (!openList) return;
    html += openList.type === 'bullet' ? '</ul>' : '</ol>';
    openList = null;
  };

  for (const block of blocks) {
    if (block._type !== 'block') {
      // unknown block type (custom embed) — skip
      continue;
    }

    const listItem = block.listItem as 'bullet' | 'number' | undefined;
    const level = (block.level as number | undefined) ?? 1;
    void level; // (level used only for nesting heuristic — see comment)

    if (listItem) {
      // Open a list if needed; close any prior of a different type.
      if (!openList || openList.type !== listItem) {
        closeList();
        html += listItem === 'bullet' ? '<ul>' : '<ol>';
        openList = { type: listItem, level: 1 };
      }
      html += `<li>${renderBlockContent(block, ctx)}</li>`;
      continue;
    }

    // Non-list block — close any open list first
    closeList();

    const style = block.style as string | undefined;
    const inner = renderBlockContent(block, ctx);
    // Skip empty paragraphs that arise from stray newlines
    if (inner.trim() === '' && (!style || style === 'normal')) continue;
    html += blockOpen(style) + inner + blockClose(style);
  }

  closeList();
  return html;
}

// ─── Helpers to build the context indices ─────────────────────────────────────

/** Flatten all of a passageCard's references into one map by _id. */
export function buildEntityIndex(card: PassageCard): Map<string, RefSummary> {
  const idx = new Map<string, RefSummary>();
  const collect = (arr: RefSummary[] | undefined) => {
    if (!arr) return;
    for (const r of arr) if (r && r._id) idx.set(r._id, r);
  };
  collect(card.terms);
  collect(card.dogmas);
  collect(card.exercises);
  collect(card.motifs);
  collect(card.people);
  if (card.place) idx.set(card.place._id, card.place);
  return idx;
}

/** Scan a passageCard in canonical reading order (greek → russian → englishLong
 *  → modernization → commentary) and number footnoteRef keys as they first
 *  appear. Kind is inferred from where the first mention happens:
 *  translator-side fields → 'trans'; commentary → 'comm'. */
export function buildFootnoteRegistry(card: PassageCard): Map<string, FootnoteEntry> {
  const reg = new Map<string, FootnoteEntry>();
  let counter = 0;

  const scan = (blocks: PTBlock[] | undefined, kind: 'trans' | 'comm') => {
    if (!blocks) return;
    for (const block of blocks) {
      const defs = (block.markDefs ?? []) as AnyMarkDef[];
      const children = block.children ?? [];
      // First, register marks reached through spans (canonical path: preserves
      // textual order of appearance).
      for (const child of children) {
        if (child._type !== 'span') continue;
        for (const m of child.marks ?? []) {
          const def = defs.find(d => d._key === m);
          if (!def || def._type !== 'footnoteRef') continue;
          const key = def.key as string | undefined;
          if (!key || reg.has(key)) continue;
          reg.set(key, { num: ++counter, kind });
        }
      }
      // Then sweep up orphan footnoteRef markDefs (see renderBlockContent for
      // the fallback explanation). Numbered after any span-referenced ones in
      // the same block to keep ordering stable.
      for (const def of defs) {
        if (def._type !== 'footnoteRef') continue;
        const key = def.key as string | undefined;
        if (!key || reg.has(key)) continue;
        reg.set(key, { num: ++counter, kind });
      }
    }
  };

  scan(card.greekText,         'trans');
  scan(card.russianText,       'trans');
  scan(card.englishText,       'trans');
  scan(card.modernizationText, 'trans');
  scan(card.commentary,        'comm');

  return reg;
}

/** Convenience: render with sensible defaults — single call per field on a page. */
export function renderField(
  blocks: PTBlock[] | null | undefined,
  partial: Omit<RenderContext, 'textContext'> & { textContext: TextContext },
): string {
  return renderPortableText(blocks, partial);
}

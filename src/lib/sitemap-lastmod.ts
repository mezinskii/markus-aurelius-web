/** Build-time `lastmod` data for the sitemap.
 *
 *  Google uses `<lastmod>` to decide which URLs are worth recrawling. Without it
 *  the whole 1700-URL sitemap looks equally stale, which is why the switch to
 *  slash-less canonical URLs took months to propagate.
 *
 *  This module runs from `astro.config.mjs`, i.e. before Astro's env pipeline is
 *  up, so it cannot reuse `src/lib/sanity.ts` (whose client is configured through
 *  `import.meta.env`). It reads `process.env` with a `.env` fallback and talks to
 *  the Sanity HTTP API directly.
 *
 *  Every failure path degrades to an empty map: a sitemap without `lastmod` is
 *  still valid, a broken build is not.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ─── Env ──────────────────────────────────────────────────────────────────────

let dotenv: Record<string, string> | null = null;

/** Parse the project `.env` so a plain `npm run build` also produces lastmod.
 *  On Vercel the vars live in `process.env` and this file is absent. */
function envFromDisk(): Record<string, string> {
  if (dotenv) return dotenv;
  dotenv = {};
  try {
    for (const line of readFileSync(resolve(process.cwd(), '.env'), 'utf8').split(/\r?\n/)) {
      const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
      if (m) dotenv[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch {
    // no .env — process.env is the only source
  }
  return dotenv;
}

const env = (name: string): string | undefined => process.env[name] || envFromDisk()[name];

// ─── Sanity ───────────────────────────────────────────────────────────────────

const API_VERSION = '2026-04-20';

/** Single combined GROQ query — one round trip for every doc type we date. */
const QUERY = `{
  "cards": *[_type=="passageCard"]{book, chapter, _updatedAt},
  "meditations": *[_type=="passage" && work._ref=="work.meditations"]{book, section, translator, _updatedAt},
  "fronto": *[_type=="passage" && work._ref=="work.fronto-correspondence"]{letter, language, _updatedAt},
  "sayings": *[_type=="passage" && work._ref=="work.marcus-sayings"]{language, _updatedAt},
  "entities": *[_type in ["term","dogma","exercise","motif","person","place"]]{
    _type, _updatedAt,
    "slug": select(
      _type == "term"     => termId,
      _type == "dogma"    => dogmaId,
      _type == "exercise" => exerciseId,
      _type == "motif"    => motifId,
      _type == "person"   => personId,
      _type == "place"    => placeId
    )
  }
}`;

interface SanityRows {
  cards: Array<{ book: number; chapter: number; _updatedAt: string }>;
  meditations: Array<{ book: number; section: string; translator: string; _updatedAt: string }>;
  fronto: Array<{ letter: number; language: string; _updatedAt: string }>;
  sayings: Array<{ language: string; _updatedAt: string }>;
  entities: Array<{ _type: string; slug: string | null; _updatedAt: string }>;
}

async function fetchRows(): Promise<SanityRows> {
  const projectId = env('SANITY_PROJECT_ID') ?? '13u931c6';
  const dataset = env('PUBLIC_SANITY_DATASET') ?? 'production';
  const token = env('SANITY_API_TOKEN');

  const url =
    `https://${projectId}.api.sanity.io/v${API_VERSION}/data/query/${dataset}` +
    `?query=${encodeURIComponent(QUERY)}`;

  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Sanity query failed: ${res.status} ${res.statusText}`);

  const body = (await res.json()) as { result?: Partial<SanityRows> };
  const r = body.result ?? {};
  return {
    cards: r.cards ?? [],
    meditations: r.meditations ?? [],
    fronto: r.fronto ?? [],
    sayings: r.sayings ?? [],
    entities: r.entities ?? [],
  };
}

// ─── Path map ─────────────────────────────────────────────────────────────────

/** Keys are locale-qualified pathnames with no trailing slash (`/` for home),
 *  matching what `serialize` derives from each sitemap entry. */
type LastmodMap = Map<string, string>;

/** Route segment per entity type — `/term/[slug]`, `/dogma/[slug]`, … */
const ENTITY_ROUTES = new Set(['term', 'dogma', 'exercise', 'motif', 'person', 'place']);

/** Localised path pair: `/x` for EN, `/ru/x` for RU. */
const localised = (lang: 'en' | 'ru', path: string) =>
  lang === 'ru' ? (path === '/' ? '/ru' : '/ru' + path) : path;

function buildMap(rows: SanityRows): LastmodMap {
  const map: LastmodMap = new Map();

  /** Keep the most recent date seen for a path. */
  const bump = (path: string, iso: string | undefined) => {
    if (!iso) return;
    const current = map.get(path);
    if (!current || iso > current) map.set(path, iso);
  };

  /** Stamp a leaf page plus every index that lists it. */
  const bumpAll = (lang: 'en' | 'ru', paths: string[], iso: string) => {
    for (const p of paths) bump(localised(lang, p), iso);
    // Home and the table of contents change whenever any content does.
    bump(localised(lang, '/'), iso);
    bump(localised(lang, '/contents'), iso);
  };

  // passageCards are bilingual — one document feeds both locales.
  for (const c of rows.cards) {
    if (c.book == null || c.chapter == null) continue;
    for (const lang of ['en', 'ru'] as const) {
      bumpAll(lang, [`/passage/${c.book}/${c.chapter}`, `/book/${c.book}`], c._updatedAt);
    }
  }

  // Legacy Meditations passages are per-translation: Long → EN, Роговин → RU.
  for (const p of rows.meditations) {
    if (p.book == null || p.section == null) continue;
    const lang = p.translator === 'Роговин' ? 'ru' : 'en';
    bumpAll(lang, [`/passage/${p.book}/${p.section}`, `/book/${p.book}`], p._updatedAt);
  }

  for (const f of rows.fronto) {
    if (f.letter == null) continue;
    const lang = f.language === 'ru' ? 'ru' : 'en';
    bumpAll(lang, [`/fronto/${f.letter}`, '/fronto'], f._updatedAt);
  }

  for (const s of rows.sayings) {
    const lang = s.language === 'ru' ? 'ru' : 'en';
    bumpAll(lang, ['/sayings'], s._updatedAt);
  }

  for (const e of rows.entities) {
    if (!e.slug || !ENTITY_ROUTES.has(e._type)) continue;
    const paths = [`/${e._type}/${e.slug}`];
    if (e._type === 'person') paths.push('/people');
    for (const lang of ['en', 'ru'] as const) bumpAll(lang, paths, e._updatedAt);
  }

  return map;
}

// ─── Public API ───────────────────────────────────────────────────────────────

let cached: Promise<LastmodMap> | null = null;

/** Memoised so the 1700 `serialize` calls share a single Sanity round trip. */
export function lastmodMap(): Promise<LastmodMap> {
  if (!cached) {
    cached = fetchRows()
      .then(rows => {
        const map = buildMap(rows);
        console.log(`[sitemap] lastmod resolved for ${map.size} paths`);
        return map;
      })
      .catch((err: unknown) => {
        console.warn(`[sitemap] lastmod unavailable, emitting sitemap without it: ${err}`);
        return new Map<string, string>();
      });
  }
  return cached;
}

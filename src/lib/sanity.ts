import { createClient } from '@sanity/client';

export const client = createClient({
  projectId: import.meta.env.SANITY_PROJECT_ID ?? '13u931c6',
  dataset: import.meta.env.PUBLIC_SANITY_DATASET ?? 'production',
  token: import.meta.env.SANITY_API_TOKEN,
  apiVersion: '2026-04-20',
  useCdn: false,
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MeditationPassage {
  _id: string;
  passageId: string;
  book: number;
  section: string;
  text: string;
  language: 'en' | 'ru' | 'tr';
  translator: string;
  footnotes: Array<{ key: string; text: string }> | null;
}

export interface FrontoPassage {
  _id: string;
  passageId: string;
  letter: number;
  section: string;
  order: number | null;
  text: string;
  language: 'en' | 'ru';
  translator: string;
  author: { _id: string; name: Record<string, string> };
  addressee: { _id: string; name: Record<string, string> } | null;
  footnotes: Array<{ key: string; text: string }> | null;
}

export interface FrontoLetterIndex {
  letter: number;
  sender: string;
  addressee: string | null;
  preview: string;
  sectionCount: number;
}

// ─── Meditations queries ───────────────────────────────────────────────────────

export async function getMeditationsBook(
  book: number,
  lang: 'en' | 'ru' = 'en',
): Promise<MeditationPassage[]> {
  const translator = lang === 'ru' ? 'Роговин' : 'George Long';
  const rows = await client.fetch<MeditationPassage[]>(
    `*[_type=="passage" && work._ref=="work.meditations" && book==$book && translator==$translator]
     {_id, passageId, book, section, text, language, translator, footnotes}`,
    { book, translator },
  );
  // section is stored as a string; sort numerically so "10" follows "9", not "1".
  return rows.sort((a, b) => parseInt(a.section, 10) - parseInt(b.section, 10));
}

export async function getAllMeditationsPassages(
  lang: 'en' | 'ru' = 'en',
): Promise<MeditationPassage[]> {
  const translator = lang === 'ru' ? 'Роговин' : 'George Long';
  return client.fetch<MeditationPassage[]>(
    `*[_type=="passage" && work._ref=="work.meditations" && translator==$translator]
     | order(book asc, section asc) {_id, passageId, book, section, text, language, translator, footnotes}`,
    { translator },
  );
}

export async function getMeditationsPassage(
  book: number,
  section: string,
  lang: 'en' | 'ru' = 'en',
): Promise<MeditationPassage | null> {
  const translator = lang === 'ru' ? 'Роговин' : 'George Long';
  const results = await client.fetch<MeditationPassage[]>(
    `*[_type=="passage" && work._ref=="work.meditations"
       && book==$book && section==$section && translator==$translator][0..0]
     {_id, passageId, book, section, text, language, translator, footnotes}`,
    { book, section, translator },
  );
  return results[0] ?? null;
}

// ─── Fronto queries ────────────────────────────────────────────────────────────

export async function getFrontoLettersIndex(
  lang: 'en' | 'ru' = 'en',
): Promise<FrontoLetterIndex[]> {
  const rows = await client.fetch<Array<{
    letter: number;
    section: string;
    text: string;
    sender: string;
    addressee: string | null;
  }>>(
    `*[_type=="passage" && work._ref=="work.fronto-correspondence" && language==$lang]
     {
       letter,
       section,
       text,
       "sender": coalesce(author->name[$lang], author->name.en),
       "addressee": coalesce(addressee->name[$lang], addressee->name.en)
     }`,
    { lang },
  );

  const byLetter = new Map<number, typeof rows>();
  for (const r of rows) {
    if (r.letter == null) continue;
    if (!byLetter.has(r.letter)) byLetter.set(r.letter, []);
    byLetter.get(r.letter)!.push(r);
  }

  // Sort sections numerically (section IDs are strings like "1","2","10")
  const sectionNum = (s: string) => parseInt(s, 10);

  const result: FrontoLetterIndex[] = [];
  for (const letter of [...byLetter.keys()].sort((a, b) => a - b)) {
    const sections = byLetter.get(letter)!.slice().sort((a, b) => sectionNum(a.section) - sectionNum(b.section));
    const first = sections[0];
    result.push({
      letter,
      sender: first.sender,
      addressee: first.addressee,
      preview: first.text ? first.text.replace(/\{\{fn:\d+\}\}/g, '').slice(0, 180) : '',
      sectionCount: sections.length,
    });
  }

  return result;
}

export async function getFrontoLetter(
  letter: number,
  lang: 'en' | 'ru' = 'en',
): Promise<FrontoPassage[]> {
  const rows = await client.fetch<FrontoPassage[]>(
    `*[_type=="passage" && work._ref=="work.fronto-correspondence" && letter==$letter && language==$lang]
     {
       _id, passageId, letter, section, order, text, language, translator,
       "author": author->{_id, name},
       "addressee": addressee->{_id, name},
       footnotes
     }`,
    { letter, lang },
  );
  // section is stored as a string; sort numerically so "10" follows "9", not "1".
  return rows.sort((a, b) => parseInt(a.section, 10) - parseInt(b.section, 10));
}

// ─── Sayings queries ───────────────────────────────────────────────────────────

export interface Saying {
  _id: string;
  passageId: string;
  chapter: number;
  order: number;
  source: string;
  text: string;
  translator: string;
  language: string;
  footnotes: Array<{ key: string; text: string }> | null;
}

export async function getAllSayings(lang: 'en' | 'ru' = 'en'): Promise<Saying[]> {
  return client.fetch<Saying[]>(
    `*[_type=="passage" && work._ref=="work.marcus-sayings" && language==$lang]
     | order(order asc)
     {_id, passageId, chapter, order, source, text, translator, language, footnotes}`,
    { lang },
  );
}

export async function getFrontoLetterNumbers(
  lang: 'en' | 'ru' = 'en',
): Promise<number[]> {
  const rows = await client.fetch<Array<{ letter: number }>>(
    `*[_type=="passage" && work._ref=="work.fronto-correspondence" && language==$lang]
     | order(letter asc) { letter }`,
    { lang },
  );
  const seen = new Set<number>();
  const result: number[] = [];
  for (const r of rows) {
    if (!seen.has(r.letter)) { seen.add(r.letter); result.push(r.letter); }
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACADEMIC / Book II — passageCard + entity cards (term, dogma, exercise, motif,
// person, place). Independent of the legacy `passage` doctype above; old books
// continue to render through the legacy queries unchanged.
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Shared types ─────────────────────────────────────────────────────────────

/** Minimal Portable Text block shape — opaque to consumers; renderer reads marks. */
export type PTBlock = {
  _type: string;
  _key: string;
  style?: string;
  listItem?: string;
  level?: number;
  children?: Array<{
    _key: string;
    _type: string;
    text?: string;
    marks?: string[];
    [k: string]: unknown;
  }>;
  markDefs?: Array<{
    _key: string;
    _type: string;
    [k: string]: unknown;
  }>;
  [k: string]: unknown;
};

export type EntityType = 'term' | 'dogma' | 'exercise' | 'motif' | 'person' | 'place';

/** A cross-reference summary — used for inline xrefs, related-entities sidebar,
 *  and the related-concepts list on entity pages. */
export interface RefSummary {
  _id: string;
  _type: EntityType;
  /** stable slug (termId / dogmaId / exerciseId / motifId / personId / placeId) */
  slug: string;
  /** primary display (greek headword for term/motif/exercise; title for dogma; name for person/place) */
  headword: string | null;
  /** transliteration — term / motif / exercise only */
  translit?: string | null;
  /** short localized label below the headword (translation for term, title for dogma, etc.) */
  gloss?: string | null;
}

export interface PassageCardFootnote {
  _key: string;
  /** stable footnote key from the source markdown (e.g. "pindar-fr-292") */
  key: string;
  body: PTBlock[];
}

export interface PassageCard {
  _id: string;
  cardId: string;
  book: number;
  chapter: number;
  discipline: 'assent' | 'desire' | 'action' | null;
  secondaryDiscipline: 'assent' | 'desire' | 'action' | null;
  status: string;
  createdAt: string | null;

  // Texts — all four are returned. Page chooses which to show based on locale +
  // (for EN) user translator preference (Long vs Modern).
  greekText: PTBlock[];
  russianText: PTBlock[];
  russianTranslator: string;
  englishText: PTBlock[];
  englishTranslator: string;
  modernizationText: PTBlock[];
  modernizationNote: string;

  /** Bilingual academic commentary — already resolved to current locale. */
  commentary: PTBlock[];

  parallels: string[];
  /** Footnote bodies already resolved to current locale. */
  footnotes: PassageCardFootnote[];

  // Cross-references — resolved to RefSummary for display.
  terms: RefSummary[];
  dogmas: RefSummary[];
  exercises: RefSummary[];
  motifs: RefSummary[];
  people: RefSummary[];
  place: RefSummary | null;
}

export interface EntitySection {
  /** stable id used as section anchor — definition / source / notes / etc. */
  id: string;
  body: PTBlock[];
}

export interface AppearanceRef {
  cardId: string;
  book: number;
  chapter: number;
  /** Plain-text preview from the locale's translation, ~160 chars. */
  preview: string;
}

export interface EntityCardData {
  _id: string;
  _type: EntityType;
  slug: string;
  /** Per-type display props — only the fields applicable to the type are populated. */
  display: {
    /** Greek headword (term/motif/exercise) — null for dogma/person/place. */
    headword: string | null;
    /** Latin transliteration of the headword — term/motif/exercise. */
    translit: string | null;
    /** Original Greek name — person/place. */
    greekForm: string | null;
    /** Latinised form — person/place. */
    latinForm: string | null;
    /** Localised long title — dogma/exercise/motif. */
    title: string | null;
    /** Localised display name — person/place. */
    name: string | null;
    /** Free-form dates — person. */
    dates: string | null;
    /** School enum value (stoic/peripatetic/...) — person. */
    school: string | null;
    /** Localised free-form role — person. */
    role: string | null;
    /** Localised free-form location — place. */
    location: string | null;
    /** Localised free-form period — place. */
    period: string | null;
    /** Localised free-form birthplace — person. */
    birthplace: string | null;
    /** Enum (ethics/physics/...) — term. */
    partOfPhilosophy: string | null;
    /** Enum (assent/desire/action) — exercise. */
    discipline: string | null;
    /** Free-form Hadot citation — exercise. */
    hadotReference: string | null;
    /** SVF reference string — dogma. */
    sourceSvf: string | null;
    /** Long & Sedley reference — dogma. */
    sourceLs: string | null;
    /** Both languages of the short gloss for term — design shows them side-by-side. */
    translationRu: string | null;
    translationEn: string | null;
  };
  /** Body sections in their canonical order per type. */
  sections: EntitySection[];
  /** Related concepts — multi-type chips in the sidebar. */
  related: RefSummary[];
  /** PassageCards that reference this entity, sorted by book/chapter. */
  appearsIn: AppearanceRef[];
}

// ─── GROQ fragments ────────────────────────────────────────────────────────────

// Resolve any concept-type reference into a RefSummary. Uses GROQ `select()` to
// pick the right "slug" and "headword" fields per actual `_type`.
const REF_SUMMARY_FRAGMENT = `{
  _id,
  _type,
  "slug": select(
    _type == "term"     => termId,
    _type == "dogma"    => dogmaId,
    _type == "exercise" => exerciseId,
    _type == "motif"    => motifId,
    _type == "person"   => personId,
    _type == "place"    => placeId
  ),
  "headword": select(
    _type == "term"     => greek,
    _type == "motif"    => title[$lang],
    _type == "exercise" => title[$lang],
    _type == "dogma"    => title[$lang],
    _type == "person"   => name[$lang],
    _type == "place"    => name[$lang]
  ),
  "translit": select(
    _type == "term"     => translit,
    _type == "motif"    => null,
    _type == "exercise" => null,
    _type in ["dogma", "person", "place"] => null
  ),
  "gloss": select(
    _type == "term"     => translation[$lang],
    _type == "dogma"    => null,
    _type == "exercise" => null,
    _type == "motif"    => null,
    _type == "person"   => role[$lang],
    _type == "place"    => period[$lang]
  )
}`;

// ─── PassageCard queries ───────────────────────────────────────────────────────

/** Returns true iff a passageCard exists for the given (book, chapter).
 *  Cheap; used to decide whether the /passage/[book]/[section] route should
 *  render the new academic layout or fall through to the legacy passage page. */
export async function hasPassageCard(book: number, chapter: number): Promise<boolean> {
  const count = await client.fetch<number>(
    `count(*[_type=="passageCard" && book==$book && chapter==$chapter])`,
    { book, chapter },
  );
  return count > 0;
}

// Projection used by both single-card and bulk-fetch passageCard queries.
const PASSAGE_CARD_PROJECTION = `{
  _id, cardId, book, chapter, discipline, secondaryDiscipline, status, createdAt,
  greekText,
  russianText,
  "russianTranslator": russianTranslator[$lang],
  englishText,
  "englishTranslator": englishTranslator[$lang],
  modernizationText,
  "modernizationNote": modernizationNote[$lang],
  "commentary": commentary[$lang],
  parallels,
  "footnotes": footnotes[]{_key, key, "bodyRu": body.ru, "bodyEn": body.en},
  "terms":     terms[]->     ${REF_SUMMARY_FRAGMENT},
  "dogmas":    dogmas[]->    ${REF_SUMMARY_FRAGMENT},
  "exercises": exercises[]-> ${REF_SUMMARY_FRAGMENT},
  "motifs":    motifs[]->    ${REF_SUMMARY_FRAGMENT},
  "people":    people[]->    ${REF_SUMMARY_FRAGMENT},
  "place":     place->       ${REF_SUMMARY_FRAGMENT}
}`;

/** Footnote defs are written once in the source markdown (currently in the
 *  author's working language). The pipeline files the body under whichever
 *  language section it landed in, so the *other* language ends up empty. To
 *  avoid the page showing nothing on that side, fall back to the non-empty
 *  body — better to show the existing-language text than a missing footnote.
 *  When proper bilingual footnote bodies land upstream this fallback becomes
 *  a no-op. */
function resolveFootnoteBody(
  fn: { key: string; _key: string; bodyRu?: PTBlock[]; bodyEn?: PTBlock[] },
  lang: 'en' | 'ru',
): PassageCardFootnote {
  const ru = Array.isArray(fn.bodyRu) ? fn.bodyRu : [];
  const en = Array.isArray(fn.bodyEn) ? fn.bodyEn : [];
  const preferred = lang === 'ru' ? ru : en;
  const fallback  = lang === 'ru' ? en : ru;
  return {
    _key: fn._key,
    key: fn.key,
    body: preferred.length > 0 ? preferred : fallback,
  };
}

function normalizePassageCard(raw: unknown, lang: 'en' | 'ru'): PassageCard {
  const card = raw as PassageCard & {
    footnotes: Array<{ _key: string; key: string; bodyRu?: PTBlock[]; bodyEn?: PTBlock[] }>;
  };
  card.footnotes = (card.footnotes ?? []).map(fn => resolveFootnoteBody(fn, lang));
  return card as PassageCard;
}

/** Fetches a single passageCard with all references resolved into RefSummary form,
 *  and all bilingual fields collapsed to the current locale. */
export async function getPassageCard(
  book: number,
  chapter: number,
  lang: 'en' | 'ru',
): Promise<PassageCard | null> {
  const result = await client.fetch<unknown>(
    `*[_type=="passageCard" && book==$book && chapter==$chapter][0]${PASSAGE_CARD_PROJECTION}`,
    { book, chapter, lang },
  );
  return result ? normalizePassageCard(result, lang) : null;
}

/** All passageCards fully resolved for the current locale.
 *  Used in getStaticPaths to attach a card to each (book, section) entry. */
export async function getAllPassageCards(lang: 'en' | 'ru'): Promise<PassageCard[]> {
  const rows = await client.fetch<unknown[]>(
    `*[_type=="passageCard"] | order(book asc, chapter asc) ${PASSAGE_CARD_PROJECTION}`,
    { lang },
  );
  return rows.map(r => normalizePassageCard(r, lang));
}

/** All passageCards in the dataset — used by getStaticPaths in the dynamic route. */
export async function getAllPassageCardPaths(): Promise<Array<{ book: number; chapter: number }>> {
  return client.fetch<Array<{ book: number; chapter: number }>>(
    `*[_type=="passageCard"]{book, chapter} | order(book asc, chapter asc)`,
  );
}

// ─── Entity queries ───────────────────────────────────────────────────────────

/** Section ordering per type — matches the canonical structure of each schema.
 *  The page template uses this to know which body fields to render in which order. */
const SECTION_ORDER: Record<EntityType, ReadonlyArray<string>> = {
  term:     ['definition', 'source', 'notes'],
  dogma:    ['formulation', 'sourcesInTradition', 'notes'],
  exercise: ['description', 'technique', 'examples'],
  motif:    ['description', 'source', 'usage'],
  person:   ['biography', 'philosophicalSignificance', 'mentionsInMarcus', 'literature'],
  place:    ['historicalContext', 'connectionToMarcus', 'literature'],
};

/** Per-type id-field name (termId, dogmaId, …) used for slug lookups. */
const SLUG_FIELD: Record<EntityType, string> = {
  term:     'termId',
  dogma:    'dogmaId',
  exercise: 'exerciseId',
  motif:    'motifId',
  person:   'personId',
  place:    'placeId',
};

/** Per-type GROQ projection of body sections + type-specific display fields.
 *  Returns objects shaped to fit EntityCardData. */
function buildEntityProjection(type: EntityType): string {
  // common fields that may appear in any entity
  const sectionFields = SECTION_ORDER[type]
    .map(id => `"section_${id}": ${id}[$lang]`)
    .join(',\n      ');

  // type-specific display fields
  let displayFields = '';
  switch (type) {
    case 'term':
      displayFields = `
      "headword": greek,
      "translit": translit,
      "translationRu": translation.ru,
      "translationEn": translation.en,
      "partOfPhilosophy": partOfPhilosophy`;
      break;
    case 'dogma':
      displayFields = `
      "title": title[$lang],
      "sourceSvf": sourceSvf,
      "sourceLs": sourceLs`;
      break;
    case 'exercise':
      displayFields = `
      "title": title[$lang],
      "hadotReference": hadotReference,
      "discipline": discipline`;
      break;
    case 'motif':
      displayFields = `
      "title": title[$lang]`;
      break;
    case 'person':
      displayFields = `
      "name": name[$lang],
      "greekForm": greekName,
      "latinForm": latinName,
      "dates": dates[$lang],
      "birthplace": birthplace[$lang],
      "school": school,
      "role": role[$lang]`;
      break;
    case 'place':
      displayFields = `
      "name": name[$lang],
      "greekForm": greekName,
      "latinForm": latinName,
      "location": location[$lang],
      "period": period[$lang]`;
      break;
  }

  // Related concepts. Motif has two related arrays (relatedTerms + relatedDogmas)
  // and we merge+dedupe in TS. Term/dogma/exercise have relatedTerms (multi-type
  // since the schema relaxation). Person/place have no related arrays — the
  // coalesce makes the GROQ still valid and yields [].
  const relatedFragment = type === 'motif'
    ? `"related": (coalesce(relatedTerms, []) + coalesce(relatedDogmas, []))[]-> ${REF_SUMMARY_FRAGMENT}`
    : `"related": coalesce(relatedTerms, [])[]-> ${REF_SUMMARY_FRAGMENT}`;

  // Appears-in: every passageCard that references this entity. Preview is plain
  // text of the locale's translation, sliced server-side for cheap transfer.
  const appearsInFragment = `"appearsIn": *[_type=="passageCard" && references(^._id)]{
    cardId, book, chapter,
    "preview": pt::text(select(
      $lang == "ru" => russianText,
      $lang == "en" => englishText
    ))
  } | order(book asc, chapter asc)`;

  return `${sectionFields},${displayFields},
    ${relatedFragment},
    ${appearsInFragment}`;
}

/** Fetch one entity with sections collapsed to the locale, related refs resolved,
 *  and a list of passageCards that reference it. */
export async function getEntity(
  type: EntityType,
  slug: string,
  lang: 'en' | 'ru',
): Promise<EntityCardData | null> {
  const slugField = SLUG_FIELD[type];

  // Build a per-type query that returns a flat row; we normalise into
  // EntityCardData below.
  const projection = buildEntityProjection(type);
  const query = `*[_type==$type && ${slugField}==$slug][0]{
    _id, _type,
    "slug": ${slugField},
    ${projection}
  }`;

  const raw = await client.fetch<Record<string, unknown> | null>(query, {
    type,
    slug,
    lang,
  });
  if (!raw) return null;

  // Flatten "section_<id>" keys into a sections array preserving canonical order.
  const sections: EntitySection[] = SECTION_ORDER[type]
    .map(id => ({ id, body: (raw[`section_${id}`] as PTBlock[]) ?? [] }))
    .filter(s => Array.isArray(s.body) && s.body.length > 0);

  // Pull display fields back out (any unset for this type stay null).
  const display: EntityCardData['display'] = {
    headword:         (raw.headword         as string | null) ?? null,
    translit:         (raw.translit         as string | null) ?? null,
    greekForm:        (raw.greekForm        as string | null) ?? null,
    latinForm:        (raw.latinForm        as string | null) ?? null,
    title:            (raw.title            as string | null) ?? null,
    name:             (raw.name             as string | null) ?? null,
    dates:            (raw.dates            as string | null) ?? null,
    school:           (raw.school           as string | null) ?? null,
    role:             (raw.role             as string | null) ?? null,
    location:         (raw.location         as string | null) ?? null,
    period:           (raw.period           as string | null) ?? null,
    birthplace:       (raw.birthplace       as string | null) ?? null,
    partOfPhilosophy: (raw.partOfPhilosophy as string | null) ?? null,
    discipline:       (raw.discipline       as string | null) ?? null,
    hadotReference:   (raw.hadotReference   as string | null) ?? null,
    sourceSvf:        (raw.sourceSvf        as string | null) ?? null,
    sourceLs:         (raw.sourceLs         as string | null) ?? null,
    translationRu:    (raw.translationRu    as string | null) ?? null,
    translationEn:    (raw.translationEn    as string | null) ?? null,
  };

  // De-dup related by _id (motif merges relatedTerms+relatedDogmas which may overlap).
  const seen = new Set<string>();
  const related: RefSummary[] = ((raw.related as RefSummary[]) ?? [])
    .filter(r => r && r._id && !seen.has(r._id) && (seen.add(r._id), true));

  const appearsIn: AppearanceRef[] = ((raw.appearsIn as Array<{
    cardId: string; book: number; chapter: number; preview: string;
  }>) ?? []).map(a => ({
    cardId: a.cardId,
    book: a.book,
    chapter: a.chapter,
    preview: typeof a.preview === 'string' ? a.preview.slice(0, 200).trim() : '',
  }));

  return {
    _id: raw._id as string,
    _type: type,
    slug: raw.slug as string,
    display,
    sections,
    related,
    appearsIn,
  };
}

// ─── People hub ────────────────────────────────────────────────────────────────

/** Hub grouping for the /people page. Mirrors the `category` enum in the
 *  Sanity person schema. */
export type PersonCategory = 'family' | 'teachers' | 'figures';

export interface PersonHubItem {
  slug: string;
  name: string | null;
  latinForm: string | null;
  greekForm: string | null;
  dates: string | null;
  role: string | null;
  school: string | null;
  category: PersonCategory | null;
}

/** All people with a hub category, shaped for the /people index. Sorted
 *  alphabetically by display name within each category (an index nominum) —
 *  predictable and stable as more people are added. */
export async function getAllPeople(lang: 'en' | 'ru'): Promise<PersonHubItem[]> {
  const rows = await client.fetch<PersonHubItem[]>(
    `*[_type=="person" && defined(category)]{
      "slug": personId,
      "name": name[$lang],
      "latinForm": latinName,
      "greekForm": greekName,
      "dates": dates[$lang],
      "role": role[$lang],
      "school": school,
      "category": category
    }`,
    { lang },
  );

  return rows.sort((a, b) => (a.name ?? a.slug).localeCompare(b.name ?? b.slug, lang));
}

/** All slugs of a given entity type — for getStaticPaths in the per-type route. */
export async function getAllEntitySlugs(type: EntityType): Promise<string[]> {
  const slugField = SLUG_FIELD[type];
  return client.fetch<string[]>(
    `*[_type==$type].${slugField}`,
    { type },
  );
}

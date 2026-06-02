// Generate 1200x630 OG images for the main pages, every passageCard, and
// every entity card (term/dogma/exercise/motif/person/place) in both locales.
// Run: node scripts/build-og.mjs
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import wawoff2 from 'wawoff2';
import { createClient } from '@sanity/client';

// Tiny .env loader (no dotenv dep in this project). Only sets keys that
// aren't already in process.env so a real shell-level export still wins.
{
  const envPath = path.resolve(process.cwd(), '.env');
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m) continue;
      let v = m[2];
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  }
}

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const FONTS = path.join(ROOT, 'node_modules');
const OUT = path.join(ROOT, 'public', 'og');

const COLORS = {
  bg: '#f5efe3',
  text: '#1a1a1a',
  textSoft: '#403628',
  textMute: '#6a5d40',
  ochre: '#a08840',
  ochreDeep: '#8a6f2f',
  rule: '#c4b89e',
};

// Satori does not understand woff2 and has flaky cyrillic support for woff,
// so we convert each subset's woff2 → ttf at script start using wawoff2.
async function w2t(filename) {
  const buf = await readFile(path.join(
    FONTS, '@fontsource/eb-garamond/files', filename,
  ));
  return Buffer.from(await wawoff2.decompress(buf));
}

async function loadFonts() {
  const [
    latin400, latinExt400,
    cyr400, cyrExt400,
    gk400, gkExt400,
    latin400i, latinExt400i,
    cyr400i, cyrExt400i,
    gk400i, gkExt400i,
    latin600, cyr600, gk600,
  ] = await Promise.all([
    w2t('eb-garamond-latin-400-normal.woff2'),
    w2t('eb-garamond-latin-ext-400-normal.woff2'),
    w2t('eb-garamond-cyrillic-400-normal.woff2'),
    w2t('eb-garamond-cyrillic-ext-400-normal.woff2'),
    w2t('eb-garamond-greek-400-normal.woff2'),
    w2t('eb-garamond-greek-ext-400-normal.woff2'),
    w2t('eb-garamond-latin-400-italic.woff2'),
    w2t('eb-garamond-latin-ext-400-italic.woff2'),
    w2t('eb-garamond-cyrillic-400-italic.woff2'),
    w2t('eb-garamond-cyrillic-ext-400-italic.woff2'),
    w2t('eb-garamond-greek-400-italic.woff2'),
    w2t('eb-garamond-greek-ext-400-italic.woff2'),
    w2t('eb-garamond-latin-500-normal.woff2'),
    w2t('eb-garamond-cyrillic-500-normal.woff2'),
    w2t('eb-garamond-greek-500-normal.woff2'),
  ]);
  // Satori merges fonts that share name+weight+style and keeps only the first,
  // so each Unicode subset MUST be registered under its own family name; the
  // cascade then has to be expressed via the comma-separated fontFamily list.
  return [
    { name: 'EBLa',    data: latin400,    weight: 400, style: 'normal' },
    { name: 'EBLaExt', data: latinExt400, weight: 400, style: 'normal' },
    { name: 'EBLa',    data: latin400i,   weight: 400, style: 'italic' },
    { name: 'EBLaExt', data: latinExt400i,weight: 400, style: 'italic' },
    { name: 'EBLa',    data: latin600,    weight: 600, style: 'normal' },
    { name: 'EBCy',    data: cyr400,      weight: 400, style: 'normal' },
    { name: 'EBCyExt', data: cyrExt400,   weight: 400, style: 'normal' },
    { name: 'EBCy',    data: cyr400i,     weight: 400, style: 'italic' },
    { name: 'EBCyExt', data: cyrExt400i,  weight: 400, style: 'italic' },
    { name: 'EBCy',    data: cyr600,      weight: 600, style: 'normal' },
    { name: 'EBGk',    data: gk400,       weight: 400, style: 'normal' },
    { name: 'EBGkExt', data: gkExt400,    weight: 400, style: 'normal' },
    { name: 'EBGk',    data: gk400i,      weight: 400, style: 'italic' },
    { name: 'EBGkExt', data: gkExt400i,   weight: 400, style: 'italic' },
    { name: 'EBGk',    data: gk600,       weight: 600, style: 'normal' },
  ];
}

// In Satori, fontFamily can be a comma-separated list (CSS style). Satori
// walks the list font-by-font; if a glyph is missing in family A it tries B.
// Order matters: list each base subset before its -ext companion since the
// base subset covers the common letter ranges.
const FONT_FAMILY = 'EBLa, EBLaExt, EBCy, EBCyExt, EBGk, EBGkExt';

// Build a Satori-compatible JSX-ish tree (plain object form).
function template({ eyebrow, titleA, titleB, sub, domain }) {
  const fontFamily = FONT_FAMILY;
  return {
    type: 'div',
    props: {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: COLORS.bg,
        padding: '72px 88px',
        fontFamily,
        position: 'relative',
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              fontSize: 22,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: COLORS.textMute,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 18,
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    width: 56,
                    height: 1,
                    backgroundColor: COLORS.rule,
                  },
                },
              },
              { type: 'span', props: { children: eyebrow } },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: {
              marginTop: 56,
              display: 'flex',
              flexDirection: 'column',
              fontSize: 88,
              lineHeight: 1.02,
              color: COLORS.text,
              letterSpacing: '-0.015em',
            },
            children: [
              { type: 'div', props: { children: titleA } },
              {
                type: 'div',
                props: {
                  style: { fontStyle: 'italic', color: COLORS.ochreDeep, marginTop: 4 },
                  children: titleB,
                },
              },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: {
              marginTop: 32,
              fontSize: 30,
              color: COLORS.textSoft,
              lineHeight: 1.4,
              maxWidth: 940,
            },
            children: sub,
          },
        },
        {
          type: 'div',
          props: {
            style: {
              marginTop: 'auto',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 22,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: COLORS.ochre,
              fontWeight: 600,
            },
            children: [
              { type: 'div', props: { children: 'Read Aurelius' } },
              { type: 'div', props: { children: domain } },
            ],
          },
        },
      ],
    },
  };
}

async function render(tree, fonts) {
  const svg = await satori(tree, { width: 1200, height: 630, fonts });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } })
    .render()
    .asPng();
  return png;
}

// ── Sanity client + academic-route OG builders ───────────────────────────────

const SITE_ORIGIN = (process.env.PUBLIC_SITE_URL ?? 'https://readaurelius.org')
  .replace(/\/$/, '');

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID ?? '13u931c6',
  dataset: process.env.PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2026-04-20',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

const ROMAN = ['','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];

function clip(s, n) {
  if (!s) return '';
  const t = String(s).replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t;
}

// One short label per discipline / per locale.
const DISCIPLINE = {
  assent: { en: 'Discipline of assent', ru: 'Дисциплина согласия' },
  desire: { en: 'Discipline of desire', ru: 'Дисциплина желания' },
  action: { en: 'Discipline of action', ru: 'Дисциплина действия' },
};

const TYPE_CHIP = {
  term:     { en: 'TERM',     ru: 'ТЕРМИН'     },
  dogma:    { en: 'DOGMA',    ru: 'ДОГМА'      },
  exercise: { en: 'EXERCISE', ru: 'УПРАЖНЕНИЕ' },
  motif:    { en: 'MOTIF',    ru: 'ОБРАЗ'      },
  person:   { en: 'PERSON',   ru: 'ЛИЦО'       },
  place:    { en: 'PLACE',    ru: 'МЕСТО'      },
};

const TYPE_PATH = {
  term: 'term', dogma: 'dogma', exercise: 'exercise',
  motif: 'motif', person: 'person', place: 'place',
};

async function fetchPassageCards() {
  return sanity.fetch(`*[_type=="passageCard"] | order(book asc, chapter asc) {
    cardId, book, chapter, discipline,
    "previewEn": pt::text(englishText),
    "previewRu": pt::text(russianText),
  }`);
}

async function fetchEntities() {
  return sanity.fetch(`*[_type in ["term","dogma","exercise","motif","person","place"]] {
    _type, _id,
    "slug": select(
      _type == "term"     => termId,
      _type == "dogma"    => dogmaId,
      _type == "exercise" => exerciseId,
      _type == "motif"    => motifId,
      _type == "person"   => personId,
      _type == "place"    => placeId
    ),
    // Per-type display fields collapsed here; not all are populated for each type.
    "greek":      select(_type == "term" => greek),
    "translit":   select(_type == "term" => translit),
    "translation":select(_type == "term" => translation),
    "title":      select(_type in ["dogma","exercise","motif"] => title),
    "name":       select(_type in ["person","place"] => name),
    "greekForm":  select(_type in ["person","place"] => greekName),
    "latinForm":  select(_type in ["person","place"] => latinName),
    "dates":      select(_type == "person" => dates),
    "role":       select(_type == "person" => role),
    "location":   select(_type == "place"  => location),
    "period":     select(_type == "place"  => period),
    // First section body as plain text, used for the OG sub-line preview.
    "previewEn":  pt::text(coalesce(definition.en, formulation.en, description.en, biography.en, historicalContext.en)),
    "previewRu":  pt::text(coalesce(definition.ru, formulation.ru, description.ru, biography.ru, historicalContext.ru)),
  }`);
}

function buildPassageEntries(cards) {
  const out = [];
  for (const c of cards) {
    const roman = ROMAN[c.book] ?? String(c.book);
    const disc = c.discipline ? DISCIPLINE[c.discipline] : null;
    out.push({
      slug: `passage-${c.book}-${c.chapter}-en`,
      eyebrow: `Marcus Aurelius · Meditations · Book ${roman}`,
      titleA: `Med. ${roman}.${c.chapter}`,
      titleB: disc?.en ?? 'A passage from the notebook',
      sub: clip(c.previewEn, 220),
      domain: `readaurelius.org/passage/${c.book}/${c.chapter}`,
    });
    out.push({
      slug: `passage-${c.book}-${c.chapter}-ru`,
      eyebrow: `Марк Аврелий · Размышления · Книга ${roman}`,
      titleA: `Med. ${roman}.${c.chapter}`,
      titleB: disc?.ru ?? 'Пассаж из записной книжки',
      sub: clip(c.previewRu, 220),
      domain: `readaurelius.org/ru/passage/${c.book}/${c.chapter}`,
    });
  }
  return out;
}

function buildEntityEntries(entities) {
  const out = [];
  for (const e of entities) {
    if (!e.slug || !TYPE_PATH[e._type]) continue;
    const eyebrowEn = `${TYPE_CHIP[e._type].en} · ${e.slug}`;
    const eyebrowRu = `${TYPE_CHIP[e._type].ru} · ${e.slug}`;
    const pathFragment = `${TYPE_PATH[e._type]}/${e.slug}`;

    let titleA_en, titleB_en, titleA_ru, titleB_ru;
    let sub_en = clip(e.previewEn, 220);
    let sub_ru = clip(e.previewRu, 220);

    if (e._type === 'term') {
      titleA_en = e.greek ?? e.slug;
      titleB_en = e.translit ?? '';
      titleA_ru = e.greek ?? e.slug;
      titleB_ru = e.translit ?? '';
      const glossEn = e.translation?.en;
      const glossRu = e.translation?.ru;
      if (glossEn) sub_en = clip(glossEn + (e.previewEn ? ' · ' + e.previewEn : ''), 220);
      if (glossRu) sub_ru = clip(glossRu + (e.previewRu ? ' · ' + e.previewRu : ''), 220);
    } else if (e._type === 'dogma' || e._type === 'exercise' || e._type === 'motif') {
      const t = e.title ?? {};
      const splitTitle = (s) => {
        if (!s) return ['', ''];
        const i = s.indexOf(' — ');
        return i > 0 ? [s.slice(0, i), s.slice(i + 3)] : [s, ''];
      };
      [titleA_en, titleB_en] = splitTitle(t.en);
      [titleA_ru, titleB_ru] = splitTitle(t.ru);
    } else if (e._type === 'person' || e._type === 'place') {
      const n = e.name ?? {};
      titleA_en = n.en ?? e.slug;
      titleA_ru = n.ru ?? e.slug;
      const altEn = e.greekForm ?? e.latinForm ?? '';
      const altRu = e.greekForm ?? e.latinForm ?? '';
      titleB_en = altEn;
      titleB_ru = altRu;
      if (e._type === 'person') {
        const datesEn = e.dates?.en ? `· ${e.dates.en}` : '';
        const roleEn  = e.role?.en ?? '';
        sub_en = clip([roleEn, datesEn].filter(Boolean).join(' '), 220);
        const datesRu = e.dates?.ru ? `· ${e.dates.ru}` : '';
        const roleRu  = e.role?.ru ?? '';
        sub_ru = clip([roleRu, datesRu].filter(Boolean).join(' '), 220);
      } else {
        const locEn = e.location?.en ?? '';
        const perEn = e.period?.en ?? '';
        sub_en = clip([locEn, perEn].filter(Boolean).join(' · '), 220);
        const locRu = e.location?.ru ?? '';
        const perRu = e.period?.ru ?? '';
        sub_ru = clip([locRu, perRu].filter(Boolean).join(' · '), 220);
      }
    }

    out.push({
      slug: `${TYPE_PATH[e._type]}-${e.slug}-en`,
      eyebrow: eyebrowEn,
      titleA: titleA_en ?? e.slug,
      titleB: titleB_en ?? '',
      sub: sub_en,
      domain: `readaurelius.org/${pathFragment}`,
    });
    out.push({
      slug: `${TYPE_PATH[e._type]}-${e.slug}-ru`,
      eyebrow: eyebrowRu,
      titleA: titleA_ru ?? e.slug,
      titleB: titleB_ru ?? '',
      sub: sub_ru,
      domain: `readaurelius.org/ru/${pathFragment}`,
    });
  }
  return out;
}

async function main() {
  const fonts = await loadFonts();
  await mkdir(OUT, { recursive: true });

  const pages = [
    {
      slug: 'home-en',
      eyebrow: 'Marcus Aurelius · 121–180 CE',
      titleA: 'Meditations',
      titleB: 'for one reader',
      sub: 'The private notebook of a Roman emperor and Stoic philosopher — twelve books, 487 passages, free to read online.',
      domain: 'readaurelius.org',
    },
    {
      slug: 'home-ru',
      eyebrow: 'Марк Аврелий · 121–180 гг.',
      titleA: 'Размышления',
      titleB: 'для одного читателя',
      sub: '«Размышления» Марка Аврелия — двенадцать книг, 487 пассажей. Полный текст в переводе Семёна Роговина (1914).',
      domain: 'readaurelius.org',
    },
    {
      slug: 'contents-en',
      eyebrow: 'The twelve books',
      titleA: 'Contents of the',
      titleB: 'Meditations',
      sub: 'All twelve books and 487 passages of Marcus Aurelius, in the public-domain George Long translation (1862).',
      domain: 'readaurelius.org/contents',
    },
    {
      slug: 'contents-ru',
      eyebrow: 'Двенадцать книг',
      titleA: 'Оглавление',
      titleB: '«Размышлений»',
      sub: 'Все двенадцать книг и 487 пассажей Марка Аврелия в переводе Семёна Роговина (1914). Public domain.',
      domain: 'readaurelius.org/ru/contents',
    },
    {
      slug: 'about-en',
      eyebrow: 'A quiet reader',
      titleA: 'About',
      titleB: "Marcus Aurelius's Meditations",
      sub: 'No commentary, no ads, no signup. Twelve books in the public-domain George Long translation (1862).',
      domain: 'readaurelius.org/about',
    },
    {
      slug: 'about-ru',
      eyebrow: 'Тихая читальня',
      titleA: 'О сайте',
      titleB: '«Размышления» онлайн',
      sub: 'Без комментариев, без рекламы, без регистрации. Перевод Семёна Роговина (1914), public domain.',
      domain: 'readaurelius.org/ru/about',
    },
    {
      slug: 'sayings-en',
      eyebrow: 'Recorded by ancient biographers',
      titleA: 'Quotes and',
      titleB: 'Sayings',
      sub: 'Short fragments of Marcus Aurelius preserved by Dio Cassius and the Historia Augusta — not from the Meditations.',
      domain: 'readaurelius.org/sayings',
    },
    {
      slug: 'sayings-ru',
      eyebrow: 'Записано древними биографами',
      titleA: 'Цитаты и',
      titleB: 'изречения',
      sub: 'Короткие фрагменты Марка Аврелия, сохранённые у Диона Кассия и в Historia Augusta — не из «Размышлений».',
      domain: 'readaurelius.org/ru/sayings',
    },
    {
      slug: 'fronto-en',
      eyebrow: 'c. 138–166 CE · Loeb Classical Library',
      titleA: 'Letters of',
      titleB: 'Marcus Aurelius & Fronto',
      sub: 'The surviving correspondence between Marcus Aurelius and his rhetoric teacher, in the C. R. Haines translation (1919).',
      domain: 'readaurelius.org/fronto',
    },
    {
      slug: 'fronto-ru',
      eyebrow: 'ок. 138–166 гг. · Loeb',
      titleA: 'Переписка',
      titleB: 'Марка Аврелия с Фронтоном',
      sub: 'Сохранившиеся письма между Марком Аврелием и его учителем риторики. Перевод C. R. Haines (1919).',
      domain: 'readaurelius.org/ru/fronto',
    },
    {
      slug: 'people-en',
      eyebrow: 'Meditations · Book I and beyond',
      titleA: 'The People of',
      titleB: 'Marcus Aurelius',
      sub: 'Family, teachers of philosophy and rhetoric, and the figures he names — with biographies and links to the passages.',
      domain: 'readaurelius.org/people',
    },
    {
      slug: 'people-ru',
      eyebrow: 'Размышления · Книга I и далее',
      titleA: 'Люди',
      titleB: 'Марка Аврелия',
      sub: 'Семья, учителя философии и риторики и те, кого он упоминает — с биографиями и ссылками на пассажи.',
      domain: 'readaurelius.org/ru/people',
    },
  ];

  // Academic routes (Book II passages + entity cards) — fetched from Sanity.
  let academic = [];
  try {
    const [cards, entities] = await Promise.all([
      fetchPassageCards(),
      fetchEntities(),
    ]);
    academic = [
      ...buildPassageEntries(cards),
      ...buildEntityEntries(entities),
    ];
    console.log(`Fetched ${cards.length} passageCards + ${entities.length} entities from Sanity`);
  } catch (err) {
    console.warn(`Sanity fetch failed — skipping academic OG images: ${err.message}`);
  }

  const allPages = [...pages, ...academic];

  let i = 0;
  for (const p of allPages) {
    i++;
    const tree = template(p);
    const png = await render(tree, fonts);
    const out = path.join(OUT, `${p.slug}.png`);
    await writeFile(out, png);
    // Verbose log only every 10th image once we're past the static set.
    if (i <= pages.length || i % 10 === 0 || i === allPages.length) {
      console.log(`[${i}/${allPages.length}] ✓ ${p.slug}.png  (${(png.length / 1024).toFixed(1)} KB)`);
    }
  }

  // Default fallback uses the en home image.
  await writeFile(
    path.join(OUT, 'default.png'),
    await readFile(path.join(OUT, 'home-en.png')),
  );
  console.log(`✓ default.png  (copied from home-en.png)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

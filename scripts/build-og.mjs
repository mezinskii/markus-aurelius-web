// Generate 1200x630 OG images for the main pages.
// Run: node scripts/build-og.mjs
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import wawoff2 from 'wawoff2';

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
    latin400i, latinExt400i,
    cyr400i, cyrExt400i,
    latin600, cyr600,
  ] = await Promise.all([
    w2t('eb-garamond-latin-400-normal.woff2'),
    w2t('eb-garamond-latin-ext-400-normal.woff2'),
    w2t('eb-garamond-cyrillic-400-normal.woff2'),
    w2t('eb-garamond-cyrillic-ext-400-normal.woff2'),
    w2t('eb-garamond-latin-400-italic.woff2'),
    w2t('eb-garamond-latin-ext-400-italic.woff2'),
    w2t('eb-garamond-cyrillic-400-italic.woff2'),
    w2t('eb-garamond-cyrillic-ext-400-italic.woff2'),
    w2t('eb-garamond-latin-500-normal.woff2'),
    w2t('eb-garamond-cyrillic-500-normal.woff2'),
  ]);
  return [
    { name: 'EBL', data: latin400,    weight: 400, style: 'normal' },
    { name: 'EBL', data: latinExt400, weight: 400, style: 'normal' },
    { name: 'EBL', data: latin400i,   weight: 400, style: 'italic' },
    { name: 'EBL', data: latinExt400i,weight: 400, style: 'italic' },
    { name: 'EBL', data: latin600,    weight: 600, style: 'normal' },
    { name: 'EBC', data: cyr400,      weight: 400, style: 'normal' },
    { name: 'EBC', data: cyrExt400,   weight: 400, style: 'normal' },
    { name: 'EBC', data: cyr400i,     weight: 400, style: 'italic' },
    { name: 'EBC', data: cyrExt400i,  weight: 400, style: 'italic' },
    { name: 'EBC', data: cyr600,      weight: 600, style: 'normal' },
  ];
}

// In Satori, fontFamily can be a comma-separated list (CSS style). Satori
// walks the list font-by-font; if a glyph is missing in family A it tries B.
const FONT_FAMILY = 'EBL, EBC';

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
  ];

  for (const p of pages) {
    const tree = template(p);
    const png = await render(tree, fonts);
    const out = path.join(OUT, `${p.slug}.png`);
    await writeFile(out, png);
    console.log(`✓ ${p.slug}.png  (${(png.length / 1024).toFixed(1)} KB)`);
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

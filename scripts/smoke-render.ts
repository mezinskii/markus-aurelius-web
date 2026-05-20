/**
 * Smoke test for the PT renderer against a real passageCard.
 * Run: `node --env-file=.env --import tsx scripts/smoke-render.ts`
 */
import { createClient } from '@sanity/client';
import {
  renderPortableText,
  buildEntityIndex,
  buildFootnoteRegistry,
} from '../src/lib/academic/render.ts';

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID ?? '13u931c6',
  dataset:   process.env.PUBLIC_SANITY_DATASET ?? 'production',
  token:     process.env.SANITY_API_TOKEN,
  apiVersion: '2026-04-20',
  useCdn: false,
});

const REF = `{
  _id, _type,
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
  "translit": select(_type == "term" => translit, _type in ["motif","exercise","dogma","person","place"] => null),
  "gloss":    select(
    _type == "term"   => translation[$lang],
    _type == "person" => role[$lang],
    _type == "place"  => period[$lang],
    _type in ["dogma","exercise","motif"] => null
  )
}`;

const lang = 'en' as const;
const card = await client.fetch(
  `*[_type=="passageCard" && book==2 && chapter==13][0]{
     _id, cardId, book, chapter, discipline, secondaryDiscipline, status, createdAt,
     greekText,
     russianText, "russianTranslator": russianTranslator[$lang],
     englishText, "englishTranslator": englishTranslator[$lang],
     modernizationText, "modernizationNote": modernizationNote[$lang],
     "commentary": commentary[$lang],
     parallels,
     "footnotes": footnotes[]{_key, key, "body": body[$lang]},
     "terms":     terms[]->     ${REF},
     "dogmas":    dogmas[]->    ${REF},
     "exercises": exercises[]-> ${REF},
     "motifs":    motifs[]->    ${REF},
     "people":    people[]->    ${REF},
     "place":     place->       ${REF}
   }`,
  { lang },
);

const entityIndex = buildEntityIndex(card as any);
const fnReg       = buildFootnoteRegistry(card as any);

console.log('--- footnote registry ---');
for (const [k, v] of fnReg) console.log(`  ${k} → #${v.num} (${v.kind})`);

const baseCtx = { lang, entityIndex, footnoteRegistry: fnReg } as const;

const sections: Array<{ label: string; blocks: any; tc: any }> = [
  { label: 'greekText',         blocks: card.greekText,         tc: 'greek' },
  { label: 'englishText',       blocks: card.englishText,       tc: 'translation' },
  { label: 'modernizationText', blocks: card.modernizationText, tc: 'translation' },
  { label: 'commentary[0..2]',  blocks: card.commentary?.slice(0, 3), tc: 'commentary' },
];

for (const { label, blocks, tc } of sections) {
  const html = renderPortableText(blocks, { ...baseCtx, textContext: tc });
  console.log(`\n--- ${label} (${tc}) ---`);
  console.log(html.slice(0, 700));
  if (html.length > 700) console.log(`  … [+${html.length - 700} chars]`);
}

if (card.footnotes?.length) {
  const fn = card.footnotes[0];
  const html = renderPortableText(fn.body, { ...baseCtx, textContext: 'footnote' });
  console.log(`\n--- footnote.body (${fn.key}) ---`);
  console.log(html);
}

const enHtml = renderPortableText(card.englishText, { ...baseCtx, textContext: 'translation' });
const comHtml = renderPortableText(card.commentary, { ...baseCtx, textContext: 'commentary' });
const greekHtml = renderPortableText(card.greekText, { ...baseCtx, textContext: 'greek' });

const summary = {
  hasXref:        /<a class="xref"/.test(enHtml),
  hasFnMark:      /<sup class="fn-mark/.test(enHtml),
  greekWrapped:   /<span class="gk">/.test(comHtml),
  greekUnwrapped: !/<span class="gk">/.test(greekHtml),
  hasGreekXref:   /<a class="xref"/.test(greekHtml),
  greekNoChip:    !/<span class="xref-type">/.test(
    // only check the spans that ARE inside greek block
    greekHtml,
  ),
};
console.log('\n--- assertions ---');
for (const [k, v] of Object.entries(summary)) console.log('  ' + (v ? '✓' : '✗') + ' ' + k);

if (!Object.values(summary).every(Boolean)) {
  console.error('\nFAILED');
  process.exit(1);
}
console.log('\nOK');

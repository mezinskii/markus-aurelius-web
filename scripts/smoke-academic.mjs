/**
 * Smoke test for the new academic Sanity queries.
 * Run: `node --env-file=.env scripts/smoke-academic.mjs`
 * Requires .env at repo root with SANITY_PROJECT_ID (+ token optional for public data).
 */
import { createClient } from '@sanity/client';

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
  "translit": select(
    _type == "term" => translit,
    _type in ["motif","exercise","dogma","person","place"] => null
  ),
  "gloss": select(
    _type == "term"   => translation[$lang],
    _type == "person" => role[$lang],
    _type == "place"  => period[$lang],
    _type in ["dogma","exercise","motif"] => null
  )
}`;

async function checkPassageCard() {
  const lang = 'en';
  const card = await client.fetch(
    `*[_type=="passageCard" && book==$book && chapter==$chapter][0]{
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
    { book: 2, chapter: 13, lang },
  );

  console.log('\n=== passageCard 2:13 (en) ===');
  if (!card) { console.log('  NOT FOUND'); return; }
  console.log('  _id:', card._id);
  console.log('  cardId:', card.cardId, 'discipline:', card.discipline);
  console.log('  translators:', card.russianTranslator, '/', card.englishTranslator);
  console.log('  greekText blocks:', card.greekText?.length ?? 0);
  console.log('  englishText blocks:', card.englishText?.length ?? 0);
  console.log('  commentary blocks (en):', card.commentary?.length ?? 0);
  console.log('  footnotes:', (card.footnotes ?? []).length);
  console.log('  refs:',
    'terms=', card.terms?.length ?? 0,
    'dogmas=', card.dogmas?.length ?? 0,
    'exercises=', card.exercises?.length ?? 0,
    'motifs=', card.motifs?.length ?? 0,
    'people=', card.people?.length ?? 0,
    'place=', card.place?.slug ?? '—');
  if (card.terms?.[0]) console.log('  first term ref:', JSON.stringify(card.terms[0]));
}

async function checkEntity() {
  const lang = 'en';
  // term · daimon — should have all section types + many appearances
  const term = await client.fetch(
    `*[_type=="term" && termId==$slug][0]{
       _id, _type, "slug": termId,
       "headword": greek,
       "translit": translit,
       "translationRu": translation.ru,
       "translationEn": translation.en,
       "partOfPhilosophy": partOfPhilosophy,
       "section_definition": definition[$lang],
       "section_source":     source[$lang],
       "section_notes":      notes[$lang],
       "related": coalesce(relatedTerms, [])[]-> ${REF},
       "appearsIn": *[_type=="passageCard" && references(^._id)]{
         cardId, book, chapter,
         "preview": pt::text(select(
           $lang == "ru" => russianText,
           $lang == "en" => englishText
         ))
       } | order(book asc, chapter asc)
     }`,
    { slug: 'daimon', lang },
  );

  console.log('\n=== term · daimon (en) ===');
  if (!term) { console.log('  NOT FOUND'); return; }
  console.log('  _id:', term._id, 'headword:', term.headword, 'translit:', term.translit);
  console.log('  translation: ru=', term.translationRu, '| en=', term.translationEn);
  console.log('  section sizes:',
    'definition=', term.section_definition?.length ?? 0,
    'source=',     term.section_source?.length     ?? 0,
    'notes=',      term.section_notes?.length      ?? 0);
  console.log('  related:', (term.related ?? []).length,
    'first=', term.related?.[0] ? JSON.stringify(term.related[0]).slice(0, 120) : '—');
  console.log('  appearsIn:', (term.appearsIn ?? []).length, 'passages');
  if (term.appearsIn?.[0]) {
    const a = term.appearsIn[0];
    console.log('    first:', `${a.book}.${a.chapter}`, '→', (a.preview || '').slice(0, 100), '…');
  }
}

async function checkPaths() {
  const paths = await client.fetch(`*[_type=="passageCard"]{book, chapter}`);
  const slugs = {};
  for (const t of ['term','dogma','exercise','motif','person','place']) {
    const field = { term: 'termId', dogma: 'dogmaId', exercise: 'exerciseId', motif: 'motifId', person: 'personId', place: 'placeId' }[t];
    slugs[t] = (await client.fetch(`*[_type==$t].${field}`, { t })).filter(Boolean);
  }
  console.log('\n=== paths ===');
  console.log('  passageCard:', paths.length);
  for (const [t, ss] of Object.entries(slugs)) console.log(`  ${t}: ${ss.length} (${ss.slice(0,3).join(', ')}${ss.length>3?', …':''})`);
}

(async () => {
  try {
    await checkPassageCard();
    await checkEntity();
    await checkPaths();
    console.log('\nOK');
  } catch (e) {
    console.error('\nFAILED');
    console.error(e?.message ?? e);
    process.exit(1);
  }
})();

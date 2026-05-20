/**
 * Inspect raw PT structure for greekText/commentary to find what markDef types
 * are present. Run: node --env-file=.env scripts/debug-pt-marks.mjs
 */
import { createClient } from '@sanity/client';

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID ?? '13u931c6',
  dataset:   process.env.PUBLIC_SANITY_DATASET ?? 'production',
  token:     process.env.SANITY_API_TOKEN,
  apiVersion: '2026-04-20',
  useCdn: false,
});

const card = await client.fetch(
  `*[_type=="passageCard" && book==2 && chapter==13][0]{
     greekText, "russianText": russianText, "englishText": englishText,
     "modernizationText": modernizationText, "commentary": commentary,
     footnotes,
   }`
);

function scan(label, blocks) {
  console.log(`\n=== ${label} ===`);
  if (!blocks) { console.log('  (empty)'); return; }
  const fields = ['ru', 'en'];
  if (blocks.ru || blocks.en) {
    for (const f of fields) {
      if (blocks[f]) {
        console.log(`-- ${label}.${f} (${blocks[f].length} blocks) --`);
        scanBlocks(blocks[f]);
      }
    }
  } else if (Array.isArray(blocks)) {
    scanBlocks(blocks);
  }
}

function scanBlocks(blocks) {
  for (let i = 0; i < Math.min(blocks.length, 3); i++) {
    const block = blocks[i];
    const types = (block.markDefs ?? []).map(d => d._type);
    const marks = (block.children ?? []).flatMap(c => c.marks ?? []);
    const text = (block.children ?? []).map(c => c.text ?? '').join('').slice(0, 110);
    console.log(`  [${i}] markDefs(${types.length}):`, types.join(','), '| children.marks:', marks.join(','));
    console.log(`       text: ${text}…`);
  }
  // also count all footnoteRef markdefs in entire array
  const fnDefs = blocks.flatMap(b => (b.markDefs ?? []).filter(d => d._type === 'footnoteRef'));
  console.log(`  TOTAL footnoteRef markDefs in this array: ${fnDefs.length}`);
  if (fnDefs.length) console.log('  example fn markDef:', JSON.stringify(fnDefs[0]));
}

scan('greekText',         card.greekText);
scan('russianText',       card.russianText);
scan('englishText',       card.englishText);
scan('modernizationText', card.modernizationText);
scan('commentary',        card.commentary);

console.log('\n=== footnotes array ===');
console.log(JSON.stringify(card.footnotes?.map(f => ({_key: f._key, key: f.key, body_keys: Object.keys(f.body ?? {})})) ?? [], null, 2));

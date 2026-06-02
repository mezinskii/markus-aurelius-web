/**
 * One-off migration: set `category` on every person document.
 * Categories: family | teachers | figures  (see personType.ts).
 *
 * Run:  node scripts/set-person-category.mjs          (dry run — prints plan)
 *       node scripts/set-person-category.mjs --commit (writes to Sanity)
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@sanity/client';

// minimal .env loader — web .env first, then studio .env as fallback
for (const p of ['../.env', '../../studio-stoic-app/.env']) {
  try {
    for (const line of readFileSync(new URL(p, import.meta.url), 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {}
}

const token =
  process.env.SANITY_API_TOKEN_EDIT || process.env.SANITY_API_TOKEN;
if (!token) {
  console.error('No write token found (SANITY_API_TOKEN_EDIT / SANITY_API_TOKEN).');
  process.exit(1);
}

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID ?? '13u931c6',
  dataset: process.env.PUBLIC_SANITY_DATASET ?? 'production',
  token,
  apiVersion: '2026-04-20',
  useCdn: false,
});

/** personId → category */
const CATEGORY = {
  // Family — relatives by blood or adoption
  'marcus-annius-verus': 'family',
  'marcus-annius-verus-the-younger': 'family',
  'domitia-lucilla': 'family',
  'antoninus-pius': 'family',
  'catilius-severus': 'family',
  // Teachers & mentors — those who personally taught Marcus
  'junius-rusticus': 'teachers',
  'apollonius': 'teachers',
  'claudius-maximus': 'teachers',
  'catulus': 'teachers',
  'sextus': 'teachers',
  'diognetus': 'teachers',
  'bacchius': 'teachers',
  'tandasis': 'teachers',
  'marcianus': 'teachers',
  'alexander-the-grammarian': 'teachers',
  'alexander-the-platonist': 'teachers',
  'claudius-severus': 'teachers',
  'fronto': 'teachers',
  // Philosophers & contemporaries — cited as examples / in Marcus's orbit
  'theophrastus': 'figures',
  'monimus': 'figures',
  'plutarch': 'figures',
  'aelius-aristides': 'figures',
};

const COMMIT = process.argv.includes('--commit');

const docs = await client.fetch(
  `*[_type=="person"]{_id, "id": personId, "current": category}`,
);

const known = new Set(Object.keys(CATEGORY));
const seen = new Set();
let planned = 0;

console.log(`Found ${docs.length} person docs.\n`);
const tx = client.transaction();

for (const d of docs) {
  seen.add(d.id);
  const target = CATEGORY[d.id];
  if (!target) {
    console.log(`  ⚠ NO MAPPING for "${d.id}" — leaving as ${d.current ?? '(unset)'}`);
    continue;
  }
  if (d.current === target) {
    console.log(`  = ${d.id} already "${target}"`);
    continue;
  }
  console.log(`  → ${d.id}: ${d.current ?? '(unset)'} ⇒ ${target}`);
  tx.patch(d._id, { set: { category: target } });
  planned++;
}

const missing = [...known].filter((id) => !seen.has(id));
if (missing.length) {
  console.log(`\n⚠ Mapped ids NOT found in Sanity: ${missing.join(', ')}`);
}

console.log(`\n${planned} document(s) to update.`);
if (!COMMIT) {
  console.log('Dry run. Re-run with --commit to write.');
  process.exit(0);
}
if (planned === 0) {
  console.log('Nothing to commit.');
  process.exit(0);
}
const res = await tx.commit();
console.log(`Committed. ${res.results.length} transaction result(s).`);

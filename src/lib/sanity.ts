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
  const translator = lang === 'ru' ? 'Семён Роговин' : 'George Long';
  return client.fetch<MeditationPassage[]>(
    `*[_type=="passage" && work._ref=="work.meditations" && book==$book && translator==$translator]
     | order(section asc) {_id, passageId, book, section, text, language, translator, footnotes}`,
    { book, translator },
  );
}

export async function getAllMeditationsPassages(
  lang: 'en' | 'ru' = 'en',
): Promise<MeditationPassage[]> {
  const translator = lang === 'ru' ? 'Семён Роговин' : 'George Long';
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
  const translator = lang === 'ru' ? 'Семён Роговин' : 'George Long';
  const results = await client.fetch<MeditationPassage[]>(
    `*[_type=="passage" && work._ref=="work.meditations"
       && book==$book && section==$section && translator==$translator][0..0]
     {_id, passageId, book, section, text, language, translator, footnotes}`,
    { book, section, translator },
  );
  return results[0] ?? null;
}

// ─── Fronto queries ────────────────────────────────────────────────────────────

export async function getFrontoLettersIndex(): Promise<FrontoLetterIndex[]> {
  // Get first section of each letter for index display
  const rows = await client.fetch<Array<{
    letter: number;
    sender: string;
    addressee: string | null;
    text: string;
  }>>(
    `*[_type=="passage" && work._ref=="work.fronto-correspondence" && section=="1"]
     | order(letter asc)
     {
       letter,
       "sender": author->name.en,
       "addressee": addressee->name.en,
       text
     }`,
  );

  // Count sections per letter with a separate targeted query
  const allLetterNums = rows.map(r => r.letter);
  const allPassages = await client.fetch<Array<{ letter: number }>>(
    `*[_type=="passage" && work._ref=="work.fronto-correspondence"] { letter }`,
  );

  const countMap = new Map<number, number>();
  for (const p of allPassages) {
    if (p.letter != null) countMap.set(p.letter, (countMap.get(p.letter) ?? 0) + 1);
  }

  return rows.map(r => ({
    letter: r.letter,
    sender: r.sender,
    addressee: r.addressee,
    preview: r.text ? r.text.replace(/\{\{fn:\d+\}\}/g, '').slice(0, 180) : '',
    sectionCount: countMap.get(r.letter) ?? 1,
  }));
}

export async function getFrontoLetter(letter: number): Promise<FrontoPassage[]> {
  return client.fetch<FrontoPassage[]>(
    `*[_type=="passage" && work._ref=="work.fronto-correspondence" && letter==$letter]
     | order(section asc)
     {
       _id, passageId, letter, section, order, text, language, translator,
       "author": author->{_id, name},
       "addressee": addressee->{_id, name},
       footnotes
     }`,
    { letter },
  );
}

export async function getFrontoLetterNumbers(): Promise<number[]> {
  const rows = await client.fetch<Array<{ letter: number }>>(
    `*[_type=="passage" && work._ref=="work.fronto-correspondence"]
     | order(letter asc) { letter }`,
  );
  const seen = new Set<number>();
  const result: number[] = [];
  for (const r of rows) {
    if (!seen.has(r.letter)) { seen.add(r.letter); result.push(r.letter); }
  }
  return result;
}

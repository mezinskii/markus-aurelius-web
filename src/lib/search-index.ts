import { client } from './sanity';
import { romanize, type Lang } from './ui';

export type IndexType = 'm' | 'l' | 's';

export interface IndexEntry {
  url: string;
  type: IndexType;
  ref: string;
  text: string;
  meta?: string;
}

const FN_MARKER = /\{\{fn:\d+\}\}|\[\d+\]/g;

function strip(text: string): string {
  return text.replace(FN_MARKER, '').replace(/\s+/g, ' ').trim();
}

export async function buildSearchIndex(lang: Lang): Promise<IndexEntry[]> {
  const translator = lang === 'ru' ? 'Роговин' : 'George Long';
  const langPrefix = lang === 'ru' ? '/ru' : '';
  const bookLabel = lang === 'ru' ? 'Книга' : 'Book';
  const letterLabel = lang === 'ru' ? 'Письмо' : 'Letter';
  const sayingLabel = lang === 'ru' ? 'Изречение' : 'Saying';

  const meditations = await client.fetch<Array<{
    book: number; section: string; text: string;
  }>>(
    `*[_type=="passage" && work._ref=="work.meditations" && translator==$translator]
     | order(book asc, section asc) { book, section, text }`,
    { translator },
  );

  // Fronto is only available in English (Haines, 1919); the RU page shows the same
  // English text wrapped in Russian UI. Index it under both languages so users can
  // navigate to it from either side of the site.
  const fronto = await client.fetch<Array<{
    letter: number; section: string; text: string;
    sender: string; addressee: string | null;
  }>>(
    `*[_type=="passage" && work._ref=="work.fronto-correspondence"]
     | order(letter asc, section asc) {
       letter, section, text,
       "sender": author->name.en,
       "addressee": addressee->name.en
     }`,
  );

  const sayings = await client.fetch<Array<{
    order: number; source: string; text: string;
  }>>(
    `*[_type=="passage" && work._ref=="work.marcus-sayings" && language==$lang]
     | order(order asc) { order, source, text }`,
    { lang },
  );

  const entries: IndexEntry[] = [];

  for (const p of meditations) {
    entries.push({
      type: 'm',
      url: `${langPrefix}/passage/${p.book}/${p.section}`,
      ref: `${bookLabel} ${romanize(p.book)} · ${p.section}`,
      text: strip(p.text),
    });
  }

  for (const l of fronto) {
    const meta = l.addressee
      ? `${l.sender} → ${l.addressee}`
      : l.sender;
    entries.push({
      type: 'l',
      url: `${langPrefix}/fronto/${l.letter}`,
      ref: `${letterLabel} ${romanize(l.letter)} · § ${l.section}`,
      text: strip(l.text),
      meta,
    });
  }

  for (const s of sayings) {
    entries.push({
      type: 's',
      url: `${langPrefix}/sayings#s${s.order}`,
      ref: `${sayingLabel} ${s.order}`,
      text: strip(s.text),
      meta: s.source,
    });
  }

  return entries;
}

import type { Lang } from './ui';

export const SITE_ORIGIN =
  (import.meta.env.PUBLIC_SITE_URL as string | undefined)?.replace(/\/$/, '') ||
  'https://readaurelius.org';

export const SITE_NAME = 'Read Aurelius';

export function abs(path: string): string {
  return SITE_ORIGIN + (path.startsWith('/') ? path : '/' + path);
}

export function pageUrl(lang: Lang, basePath: string): string {
  const stripped = basePath.replace(/^\/ru(?=\/|$)/, '') || '/';
  if (lang === 'ru') return abs(stripped === '/' ? '/ru' : '/ru' + stripped);
  return abs(stripped);
}

const MARCUS_ID = abs('/#person-marcus-aurelius');

export function marcusAureliusPerson() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': MARCUS_ID,
    name: 'Marcus Aurelius',
    alternateName: ['Marcus Aurelius Antoninus', 'Марк Аврелий', 'Marcus Annius Verus'],
    birthDate: '0121-04-26',
    deathDate: '0180-03-17',
    jobTitle: 'Roman Emperor, Stoic philosopher',
    nationality: 'Roman',
    sameAs: [
      'https://en.wikipedia.org/wiki/Marcus_Aurelius',
      'https://ru.wikipedia.org/wiki/%D0%9C%D0%B0%D1%80%D0%BA_%D0%90%D0%B2%D1%80%D0%B5%D0%BB%D0%B8%D0%B9',
      'https://www.wikidata.org/wiki/Q1430',
      'https://viaf.org/viaf/102895066',
    ],
  };
}

export function frontoPerson() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': abs('/#person-fronto'),
    name: 'Marcus Cornelius Fronto',
    alternateName: ['Fronto', 'Марк Корнелий Фронтон'],
    birthDate: '0100',
    deathDate: '0166',
    jobTitle: 'Roman rhetorician, advocate',
    sameAs: [
      'https://en.wikipedia.org/wiki/Marcus_Cornelius_Fronto',
      'https://www.wikidata.org/wiki/Q316329',
    ],
  };
}

export function websiteJsonLd(lang: Lang) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': abs('/#website'),
    name: SITE_NAME,
    alternateName: lang === 'ru' ? 'Размышления — Марк Аврелий онлайн' : 'Meditations — Marcus Aurelius online',
    url: SITE_ORIGIN + '/',
    inLanguage: ['en', 'ru'],
    publisher: { '@id': abs('/#publisher') },
  };
}

export function publisherJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': abs('/#publisher'),
    name: SITE_NAME,
    url: SITE_ORIGIN + '/',
    logo: {
      '@type': 'ImageObject',
      url: abs('/android-chrome-512x512.png'),
    },
  };
}

export function meditationsBookJsonLd(lang: Lang) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Book',
    '@id': abs('/#book-meditations'),
    name: lang === 'ru' ? 'Размышления' : 'Meditations',
    alternateName: ['Τὰ εἰς ἑαυτόν', 'Ta eis heauton', 'To Himself', 'Размышления', 'Meditations'],
    author: { '@id': MARCUS_ID },
    inLanguage: lang === 'ru' ? 'ru' : 'en',
    bookFormat: 'https://schema.org/EBook',
    numberOfPages: 487,
    isAccessibleForFree: true,
    license: 'https://creativecommons.org/publicdomain/mark/1.0/',
    datePublished: '0180',
    translator: {
      '@type': 'Person',
      name: lang === 'ru' ? 'Семён Роговин' : 'George Long',
    },
    workExample: {
      '@type': 'Book',
      name: lang === 'ru'
        ? 'Размышления (перевод Семёна Роговина, 1914)'
        : 'Meditations (George Long translation, 1862)',
      datePublished: lang === 'ru' ? '1914' : '1862',
      inLanguage: lang === 'ru' ? 'ru' : 'en',
    },
    description: lang === 'ru'
      ? 'Частная записная книжка римского императора Марка Аврелия (ок. 170–180 гг.). Двенадцать книг, 487 пассажей.'
      : 'The private notebook of the Roman emperor Marcus Aurelius, written c. 170–180 CE. Twelve books, 487 passages.',
    sameAs: [
      'https://en.wikipedia.org/wiki/Meditations',
      'https://ru.wikipedia.org/wiki/%D0%A0%D0%B0%D0%B7%D0%BC%D1%8B%D1%88%D0%BB%D0%B5%D0%BD%D0%B8%D1%8F_(%D0%9C%D0%B0%D1%80%D0%BA_%D0%90%D0%B2%D1%80%D0%B5%D0%BB%D0%B8%D0%B9)',
      'https://www.wikidata.org/wiki/Q830513',
    ],
  };
}

export interface Crumb {
  name: string;
  url: string;
}

export function breadcrumbsJsonLd(crumbs: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  };
}

export interface PassageJsonLdInput {
  lang: Lang;
  bookNum: number;
  romanBook: string;
  section: string;
  text: string;
  translator: string;
  translationYear: string;
  url: string;
}

export function passageJsonLd(input: PassageJsonLdInput) {
  const { lang, bookNum, romanBook, section, text, translator, translationYear, url } = input;
  return {
    '@context': 'https://schema.org',
    '@type': 'Quotation',
    '@id': url + '#quotation',
    text,
    spokenByCharacter: undefined,
    creator: { '@id': MARCUS_ID },
    inLanguage: lang === 'ru' ? 'ru' : 'en',
    isPartOf: {
      '@type': 'Book',
      name: lang === 'ru' ? `Размышления, книга ${romanBook}` : `Meditations, Book ${romanBook}`,
      bookEdition: `${translator} (${translationYear})`,
      position: bookNum,
      isPartOf: { '@id': abs('/#book-meditations') },
    },
    citation: lang === 'ru'
      ? `Марк Аврелий, Размышления ${romanBook}.${section}`
      : `Marcus Aurelius, Meditations ${romanBook}.${section}`,
    url,
    mainEntityOfPage: url,
  };
}

export interface SayingJsonLdInput {
  text: string;
  source: string;
  url: string;
  order: number;
}

export function sayingJsonLd(input: SayingJsonLdInput) {
  const { text, source, url, order } = input;
  return {
    '@context': 'https://schema.org',
    '@type': 'Quotation',
    '@id': url + `#saying-${order}`,
    text,
    creator: { '@id': MARCUS_ID },
    inLanguage: 'en',
    citation: source,
    url,
  };
}

export interface LetterJsonLdInput {
  lang: Lang;
  letterNum: number;
  romanLetter: string;
  sender: string;
  addressee: string | null;
  text: string;
  url: string;
}

export function letterJsonLd(input: LetterJsonLdInput) {
  const { lang, letterNum, romanLetter, sender, addressee, text, url } = input;
  return {
    '@context': 'https://schema.org',
    '@type': 'Message',
    '@id': url + '#letter',
    name: lang === 'ru'
      ? `Письмо ${romanLetter} — ${sender}${addressee ? ' → ' + addressee : ''}`
      : `Letter ${romanLetter} — ${sender}${addressee ? ' to ' + addressee : ''}`,
    text,
    sender: sender.includes('Fronto')
      ? { '@id': abs('/#person-fronto') }
      : { '@id': MARCUS_ID },
    recipient: addressee
      ? (addressee.includes('Fronto')
          ? { '@id': abs('/#person-fronto') }
          : { '@id': MARCUS_ID })
      : undefined,
    inLanguage: 'en',
    translator: { '@type': 'Person', name: 'C. R. Haines' },
    datePublished: '1919',
    position: letterNum,
    url,
    mainEntityOfPage: url,
  };
}

export function articleJsonLd(opts: {
  url: string;
  headline: string;
  description: string;
  lang: Lang;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': opts.url + '#webpage',
    url: opts.url,
    name: opts.headline,
    description: opts.description,
    inLanguage: opts.lang === 'ru' ? 'ru' : 'en',
    isPartOf: { '@id': abs('/#website') },
    about: { '@id': MARCUS_ID },
  };
}

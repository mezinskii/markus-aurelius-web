/**
 * UI strings + label tables for Book II academic pages (passageCard +
 * 6 entity types). Kept separate from `src/lib/ui.ts` so the legacy
 * vocabulary stays focused and we don't pollute it with terms only
 * Book II ever needs.
 */
import type { Lang } from '../ui';
import type { EntityType } from '../sanity';

/** Compact uppercase type chips inside <a class="xref"> and at the top
 *  of an entity card. Kept SHORT so the chip stays unobtrusive. */
export const ENTITY_TYPE_LABEL: Record<EntityType, Record<Lang, string>> = {
  term:     { en: 'TERM',     ru: 'ТЕРМИН' },
  dogma:    { en: 'DOGMA',    ru: 'ДОГМА' },
  exercise: { en: 'EXERCISE', ru: 'УПРАЖНЕНИЕ' },
  motif:    { en: 'MOTIF',    ru: 'ОБРАЗ' },
  person:   { en: 'PERSON',   ru: 'ЛИЦО' },
  place:    { en: 'PLACE',    ru: 'МЕСТО' },
};

/** Friendly nouns for sentence use ("on this term, …"). */
export const ENTITY_TYPE_NOUN: Record<EntityType, Record<Lang, string>> = {
  term:     { en: 'term',     ru: 'термин' },
  dogma:    { en: 'doctrine', ru: 'догма' },
  exercise: { en: 'exercise', ru: 'упражнение' },
  motif:    { en: 'motif',    ru: 'образ' },
  person:   { en: 'person',   ru: 'лицо' },
  place:    { en: 'place',    ru: 'место' },
};

/** Per-type slug for the URL prefix. Stays in sync with src/pages/* layout. */
export const ENTITY_TYPE_PATH: Record<EntityType, string> = {
  term:     'term',
  dogma:    'dogma',
  exercise: 'exercise',
  motif:    'motif',
  person:   'person',
  place:    'place',
};

/** Hadot's three disciplines — discipline of assent / desire / action. */
export const DISCIPLINE_LABEL: Record<'assent' | 'desire' | 'action', Record<Lang, string>> = {
  assent: { en: 'Discipline of assent', ru: 'Дисциплина согласия' },
  desire: { en: 'Discipline of desire', ru: 'Дисциплина желания' },
  action: { en: 'Discipline of action', ru: 'Дисциплина действия' },
};

/** Per-type section ids → localised section titles. Keys match the values in
 *  SECTION_ORDER from sanity.ts. The EntityCardPage looks each one up. */
export const ENTITY_SECTION_TITLE: Record<EntityType, Record<string, Record<Lang, string>>> = {
  term: {
    definition: { en: 'Definition',           ru: 'Определение' },
    source:     { en: 'Source',               ru: 'Источник' },
    notes:      { en: 'Notes',                ru: 'Примечания' },
  },
  dogma: {
    formulation:        { en: 'Formulation',           ru: 'Формулировка' },
    sourcesInTradition: { en: 'Sources in tradition',  ru: 'Источники в традиции' },
    notes:              { en: 'Notes',                 ru: 'Примечания' },
  },
  exercise: {
    description: { en: 'Description', ru: 'Описание' },
    technique:   { en: 'Technique',   ru: 'Техника' },
    examples:    { en: 'Examples in Marcus', ru: 'Примеры у Марка' },
  },
  motif: {
    description: { en: 'Image',  ru: 'Образ' },
    source:      { en: 'Source', ru: 'Источник' },
    usage:       { en: 'Usage',  ru: 'Использование' },
  },
  person: {
    biography:                { en: 'Biography',                ru: 'Биография' },
    philosophicalSignificance:{ en: 'Philosophical significance', ru: 'Философское значение' },
    mentionsInMarcus:         { en: 'Mentions in Marcus',       ru: 'Цитируется у Марка' },
    literature:               { en: 'Literature',                ru: 'Литература' },
  },
  place: {
    historicalContext:  { en: 'Historical context',  ru: 'Историческая справка' },
    connectionToMarcus: { en: 'Connection to Marcus', ru: 'Связь с Марком' },
    literature:         { en: 'Literature',           ru: 'Литература' },
  },
};

/** Strings used by the academic page chrome (sidebars, footers, button labels). */
export const ACAD_UI = {
  en: {
    read: 'Read',
    book: 'Book',
    passage: 'Passage',
    related: 'Related',
    marginalia: 'Marginalia',
    commentary: 'Commentary',
    compare: 'Compare',
    copy: 'Copy',
    cite: 'Cite',
    originalGreek: 'Original · ancient Greek',
    diacriticKey: 'Diacritic key',
    appearsIn: 'Appears in',
    inBrief: 'In brief',
    openCard: 'Open card →',
    composedAt: 'Composed at',
    discipline: 'Discipline',
    recordAdded: 'Record added',
    status: 'Status',
    editor: 'Editor',
    translator_trans: 'Translator',
    translator_comm:  'Commentary',
    passageCount_one: 'passage',
    passageCount_other: 'passages',
    longLabel: 'George Long · 1862',
    modernLabel: 'Modern English',
    rogovinLabel: 'Семён Роговин · 1914',
    longFlag: 'EN · Long',
    modernFlag: 'EN · Modern',
    rogovinFlag: 'RU · Роговин',
    greekFlag: 'GRC',
    chooseCompare: 'Compare — pick any two',
    of: 'of',
    annotations: 'Annotations',
    annotationsHint: 'Show or hide the underlines on linked terms',
    greekEdition: 'Leopold · Teubner 1908',
  },
  ru: {
    read: 'Читать',
    book: 'Книга',
    passage: 'Пассаж',
    related: 'Связанное',
    marginalia: 'На полях',
    commentary: 'Комментарий',
    compare: 'Сравнить',
    copy: 'Копировать',
    cite: 'Цитата',
    originalGreek: 'Оригинал · древнегреческий',
    diacriticKey: 'Диакритика',
    appearsIn: 'Встречается в',
    inBrief: 'Кратко',
    openCard: 'Открыть карточку →',
    composedAt: 'Место',
    discipline: 'Дисциплина',
    recordAdded: 'Запись добавлена',
    status: 'Статус',
    editor: 'Редактор',
    translator_trans: 'Переводчик',
    translator_comm:  'Комментарий',
    passageCount_one: 'пассаж',
    passageCount_other: 'пассажей',
    longLabel: 'Джордж Лонг · 1862',
    modernLabel: 'Современный английский',
    rogovinLabel: 'Семён Роговин · 1914',
    longFlag: 'EN · Long',
    modernFlag: 'EN · Modern',
    rogovinFlag: 'RU · Роговин',
    greekFlag: 'GRC',
    chooseCompare: 'Сравнение — выберите два',
    of: 'из',
    annotations: 'Аннотации',
    annotationsHint: 'Показать или скрыть подчёркивание связанных терминов',
    greekEdition: 'Leopold · Teubner 1908',
  },
} as const;

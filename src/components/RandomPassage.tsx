import { useState, useEffect } from 'react';
import { UI, BOOK_META, romanize, type Lang } from '../lib/ui';

interface Passage {
  book: number;
  section: string;
  text: string;
  translator: string;
}

interface Props {
  passages: Passage[];
  lang: Lang;
}

export default function RandomPassage({ passages, lang }: Props) {
  const t = UI[lang];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(Math.floor(Math.random() * passages.length));
  }, []);

  const p = passages[idx] ?? passages[0];
  if (!p) return null;

  const shuffle = () => setIdx(i => {
    let next = Math.floor(Math.random() * passages.length);
    while (next === i && passages.length > 1) next = Math.floor(Math.random() * passages.length);
    return next;
  });

  const dropcap = p.text[0];
  const rest = stripFn(p.text.slice(1));

  return (
    <div className="today-card">
      <div className="today-tag">
        <span className="mono">{t.today}</span>
        <button className="today-shuffle" onClick={shuffle}>
          <ShuffleIcon /> {t.shuffle}
        </button>
      </div>
      <div className="today-ref">
        Book {romanize(p.book)} · {p.section} · {p.translator}
      </div>
      <p className="today-text">
        <span className="dropcap">{dropcap}</span>
        {rest}
      </p>
      <a className="today-cta" href={`/passage/${p.book}/${p.section}`}>
        {t.today_cta} <ArrowIcon />
      </a>
    </div>
  );
}

function stripFn(text: string) {
  return text.replace(/\{\{fn:\d+\}\}/g, '').replace(/\[\d+\]/g, '');
}

function ShuffleIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ width: 13, height: 13 }}>
    <path d="M16 3h5v5" /><path d="M4 20 21 3" /><path d="M21 16v5h-5" /><path d="m15 15 6 6" /><path d="M4 4l5 5" />
  </svg>;
}
function ArrowIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ width: 14, height: 14 }}>
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>;
}

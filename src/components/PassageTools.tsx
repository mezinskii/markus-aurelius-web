import { useState, useEffect } from 'react';
import { UI, type Lang } from '../lib/ui';

interface Props {
  book: number;
  section: string;
  text: string;
  passageId: string;
  lang: Lang;
}

export default function PassageTools({ book, section, text, passageId, lang }: Props) {
  const t = UI[lang];
  const [readSize, setReadSize] = useState(1.185);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    const s = parseFloat(localStorage.getItem('readSize') || '1.185');
    setReadSize(s);
  }, []);

  useEffect(() => {
    localStorage.setItem('readSize', String(readSize));
    document.documentElement.style.setProperty('--read-size', `${readSize}rem`);
  }, [readSize]);

  // Arrow key navigation
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') {
        const prev = document.querySelector<HTMLAnchorElement>('.passage-nav a:first-child:not(.disabled)');
        if (prev) { e.preventDefault(); window.location.href = prev.href; }
      }
      if (e.key === 'ArrowRight') {
        const next = document.querySelector<HTMLAnchorElement>('.passage-nav a.next:not(.disabled)');
        if (next) { e.preventDefault(); window.location.href = next.href; }
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const flashMsg = (msg: string) => { setFlash(msg); setTimeout(() => setFlash(null), 1400); };

  const copyText = async () => {
    const body = `Meditations — Book ${book}.${section}\n\n${text.replace(/\{\{fn:\d+\}\}/g, '').replace(/\[\d+\]/g, '')}`;
    try { await navigator.clipboard.writeText(body); } catch {}
    flashMsg(t.tools_copied);
  };

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href); } catch {}
    flashMsg(t.tools_link_copied);
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Meditations ${book}.${section}`, text: text.replace(/\{\{fn:\d+\}\}/g, '').replace(/\[\d+\]/g, ''), url: window.location.href });
        return;
      } catch {}
    }
    copyLink();
  };

  return (
    <>
      <div className="passage-tools">
        <span className={`tool-btn${flash === t.tools_copied ? ' flash' : ''}`} onClick={copyText} style={{ cursor: 'pointer' }}>
          <CopyIcon /> {flash === t.tools_copied ? flash : t.tools_copy}
        </span>
        <span className={`tool-btn${flash === t.tools_link_copied ? ' flash' : ''}`} onClick={copyLink} style={{ cursor: 'pointer' }}>
          <LinkIcon /> {flash === t.tools_link_copied ? flash : t.tools_link}
        </span>
        <span className="tool-btn" onClick={share} style={{ cursor: 'pointer' }}>
          <ShareIcon /> {t.tools_share}
        </span>
        <span className="tool-btn" onClick={() => window.print()} style={{ cursor: 'pointer' }}>
          <PrintIcon /> {lang === 'en' ? 'Print' : 'Печать'}
        </span>
        <div className="tool-sep" />
        <div className="tool-btn size-group">
          <button onClick={() => setReadSize(s => Math.max(0.9, +(s - 0.08).toFixed(3)))}>{t.tools_a_minus}</button>
          <button onClick={() => setReadSize(1.185)} style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase' }}>A</button>
          <button onClick={() => setReadSize(s => Math.min(1.6, +(s + 0.08).toFixed(3)))}>{t.tools_a_plus}</button>
        </div>
      </div>
      {flash && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--ink)', color: 'var(--paper)', padding: '10px 18px', borderRadius: 999,
          fontFamily: 'var(--sans)', fontSize: 13, zIndex: 200,
        }}>{flash}</div>
      )}
    </>
  );
}

function CopyIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} style={{ width: 14, height: 14 }}>
    <rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </svg>;
}
function LinkIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} style={{ width: 14, height: 14 }}>
    <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
  </svg>;
}
function ShareIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} style={{ width: 14, height: 14 }}>
    <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" /><path d="M16 6l-4-4-4 4" /><path d="M12 2v14" />
  </svg>;
}
function PrintIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} style={{ width: 14, height: 14 }}>
    <path d="M6 9V3h12v6" /><rect x="3" y="9" width="18" height="9" rx="2" /><path d="M6 14h12v7H6z" />
  </svg>;
}

import { useState, useEffect, type ReactNode } from 'react';
import { UI, type Lang } from '../lib/ui';

interface Props {
  route: 'home' | 'contents' | 'about' | 'fronto' | 'book' | 'passage' | 'letter';
  children: ReactNode;
}

export default function Shell({ route, children }: Props) {
  const [lang, setLang] = useState<Lang>('en');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [searchOpen, setSearchOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const l = (localStorage.getItem('lang') as Lang) || 'en';
    const t = (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    setLang(l);
    setTheme(t);
    document.documentElement.setAttribute('data-theme', t);
  }, []);

  const toggleLang = () => {
    const next = lang === 'en' ? 'ru' : 'en';
    setLang(next);
    localStorage.setItem('lang', next);
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const t = UI[lang];

  // Keyboard: / or cmd+K for search
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); setSearchOpen(true);
      }
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault(); setSearchOpen(true);
      }
      if (e.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  return (
    <>
      <header className="top">
        <div className="top-inner">
          <a className="brand" href="/">
            <span className="brand-mark">M</span>
            <span className="brand-text">
              Meditations <em>— {t.brand_sub}</em>
            </span>
          </a>

          <nav className="nav">
            <a className={route === 'home' || route === 'book' || route === 'passage' ? 'active' : ''} href="/">{t.read}</a>
            <a className={route === 'contents' ? 'active' : ''} href="/contents">{t.contents}</a>
            <a className={route === 'fronto' || route === 'letter' ? 'active' : ''} href="/fronto">{t.fronto}</a>
            <a className={route === 'about' ? 'active' : ''} href="/about">{t.about}</a>
          </nav>

          <div className="top-tools">
            <button className="icon-btn" onClick={() => setSearchOpen(true)} title={t.search} aria-label={t.search}>
              <SearchIcon />
            </button>
            <button className="lang-toggle" onClick={toggleLang} title="Language">
              <span className={lang === 'en' ? 'on' : ''}>EN</span>
              <span style={{ margin: '0 4px' }}>/</span>
              <span className={lang === 'ru' ? 'on' : ''}>RU</span>
            </button>
            <button className="icon-btn" onClick={toggleTheme} title="Theme" aria-label="Toggle theme">
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </div>
      </header>

      {children}

      <footer className="foot">
        <div className="foot-inner">
          <div>{t.footer_copy}</div>
          <div className="spacer" />
          <div>{t.footer_made}</div>
          <a href="/about" style={{ borderBottom: '1px solid currentColor' }}>{t.footer_feedback}</a>
        </div>
      </footer>

      {searchOpen && (
        <SearchOverlay
          lang={lang}
          onClose={() => setSearchOpen(false)}
          setToast={setToast}
        />
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  );
}

// ─── Search overlay ────────────────────────────────────────────────────────────

function SearchOverlay({ lang, onClose, setToast }: { lang: Lang; onClose: () => void; setToast: (s: string) => void }) {
  const t = UI[lang];
  const [q, setQ] = useState('');

  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="search-panel" onClick={e => e.stopPropagation()}>
        <div className="search-head">
          <SearchIcon style={{ width: 18, height: 18, color: 'var(--text-mute)', flexShrink: 0 }} />
          <input
            autoFocus
            className="search-input"
            placeholder={t.search_placeholder}
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          <span className="search-esc">ESC</span>
        </div>
        <div className="search-results">
          {q.trim()
            ? <SearchResults q={q.trim()} lang={lang} onClose={onClose} />
            : <div className="search-empty">{t.search_hint}</div>}
        </div>
      </div>
    </div>
  );
}

function SearchResults({ q, lang, onClose }: { q: string; lang: Lang; onClose: () => void }) {
  const [results, setResults] = useState<Array<{ url: string; ref: string; preview: string }>>([]);
  const [loading, setLoading] = useState(true);
  const t = UI[lang];

  useEffect(() => {
    setLoading(true);
    // Client-side search via Sanity CDN (no token needed for public dataset reads via CDN)
    const needle = q.toLowerCase();
    fetch(
      `https://13u931c6.apicdn.sanity.io/v2026-04-20/data/query/production?query=${encodeURIComponent(
        `*[_type=="passage" && work._ref=="work.meditations" && translator=="${lang === 'ru' ? 'Семён Роговин' : 'George Long'}" && text match $q][0..29]{passageId, book, section, text}`
      )}&%24q=%22${encodeURIComponent(q)}*%22`
    )
      .then(r => r.json())
      .then(data => {
        const rows = (data.result ?? []) as Array<{ passageId: string; book: number; section: string; text: string }>;
        setResults(rows.map(p => ({
          url: `/passage/${p.book}/${p.section}`,
          ref: `Book ${p.book} · ${p.section}`,
          preview: (() => {
            const idx = p.text.toLowerCase().indexOf(needle);
            if (idx < 0) return p.text.slice(0, 160);
            const start = Math.max(0, idx - 40);
            return (start > 0 ? '… ' : '') + p.text.slice(start, idx + needle.length + 120);
          })(),
        })));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [q, lang]);

  if (loading) return <div className="search-empty" style={{ padding: '32px 22px' }}>…</div>;
  if (!results.length) return <div className="search-empty">{t.search_empty}</div>;

  return (
    <>
      <div className="search-meta">{results.length} {t.search_results}</div>
      {results.map(r => (
        <a key={r.url} className="search-result" href={r.url} onClick={onClose}>
          <div className="search-result-ref">{r.ref}</div>
          <p className="search-result-text">{r.preview}</p>
        </a>
      ))}
    </>
  );
}

// ─── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const id = setTimeout(onDone, 1500);
    return () => clearTimeout(id);
  }, [message]);
  return (
    <div style={{
      position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
      background: 'var(--ink)', color: 'var(--paper)', padding: '10px 18px', borderRadius: 999,
      fontFamily: 'var(--sans)', fontSize: 13, zIndex: 200, boxShadow: '0 10px 30px -12px rgba(0,0,0,.4)',
    }}>
      {message}
    </div>
  );
}

// ─── Icons ─────────────────────────────────────────────────────────────────────

function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...props} style={{ width: 18, height: 18, ...props.style }}>
      <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
    </svg>
  );
}
function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ width: 18, height: 18 }}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ width: 18, height: 18 }}>
      <path d="M20 15.5A8 8 0 1 1 8.5 4a6.5 6.5 0 0 0 11.5 11.5Z" />
    </svg>
  );
}

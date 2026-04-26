import { useState, useEffect, useRef, type ReactNode } from 'react';
import { UI, type Lang } from '../lib/ui';

interface Props {
  route: 'home' | 'contents' | 'about' | 'fronto' | 'book' | 'passage' | 'letter' | 'sayings';
  /** Language is determined by URL: /ru/* is RU, everything else is EN. */
  lang: Lang;
  /** Current page path passed in from the server, e.g. "/book/3" or "/ru/book/3". */
  pathname: string;
  children: ReactNode;
}

/** Build the equivalent URL in the other language. */
function otherLangHref(lang: Lang, pathname: string): string {
  // Strip /ru prefix if present
  const stripped = pathname.replace(/^\/ru(?=\/|$)/, '') || '/';
  if (lang === 'en') {
    // Going to RU: prepend /ru (root '/' becomes '/ru')
    return stripped === '/' ? '/ru' : '/ru' + stripped;
  }
  // Going to EN: stripped is already correct
  return stripped;
}

export default function Shell({ route, lang, pathname, children }: Props) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [searchOpen, setSearchOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [footnote, setFootnote] = useState<{ key: string; text: string; rect: DOMRect } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const t = (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    setTheme(t);
    document.documentElement.setAttribute('data-theme', t);
    // Persist language choice so we can suggest it on root in the future
    localStorage.setItem('lang', lang);
  }, [lang]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const otherLang: Lang = lang === 'en' ? 'ru' : 'en';
  const langHref = otherLangHref(lang, pathname);

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
      if (e.key === 'Escape') { setSearchOpen(false); setFootnote(null); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // Global footnote popover: any <sup class="fn-sup" data-fn-text="..."> opens a popover
  useEffect(() => {
    const openFromElement = (el: HTMLElement) => {
      const text = el.getAttribute('data-fn-text') || '';
      const key = el.getAttribute('data-fn-key') || '';
      if (!text) return;
      setFootnote({ key, text, rect: el.getBoundingClientRect() });
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const sup = target?.closest?.('.fn-sup[data-fn-text]') as HTMLElement | null;
      if (sup) { e.preventDefault(); openFromElement(sup); return; }
      if (target && !target.closest('.fn-pop')) setFootnote(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const el = document.activeElement as HTMLElement | null;
      if (el && el.classList.contains('fn-sup') && el.hasAttribute('data-fn-text')) {
        e.preventDefault();
        openFromElement(el);
      }
    };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <>
      <header className="top">
        <div className="top-inner">
          <a className="brand" href={lang === 'ru' ? '/ru' : '/'}>
            <span className="brand-mark">M</span>
            <span className="brand-text">
              Meditations <em>— {t.brand_sub}</em>
            </span>
          </a>

          <nav className={`nav${menuOpen ? ' nav--open' : ''}`} onClick={() => setMenuOpen(false)}>
            <a className={route === 'home' || route === 'book' || route === 'passage' ? 'active' : ''} href={lang === 'ru' ? '/ru' : '/'}>{t.read}</a>
            <a className={route === 'contents' ? 'active' : ''} href={lang === 'ru' ? '/ru/contents' : '/contents'}>{t.contents}</a>
            <a className={route === 'fronto' || route === 'letter' ? 'active' : ''} href={lang === 'ru' ? '/ru/fronto' : '/fronto'}>{t.fronto}</a>
            <a className={route === 'sayings' ? 'active' : ''} href={lang === 'ru' ? '/ru/sayings' : '/sayings'}>{t.sayings}</a>
            <a className={route === 'about' ? 'active' : ''} href={lang === 'ru' ? '/ru/about' : '/about'}>{t.about}</a>
          </nav>

          <div className="top-tools">
            <button className="icon-btn" onClick={() => setSearchOpen(true)} title={t.search} aria-label={t.search}>
              <SearchIcon />
            </button>
            <a className="lang-toggle" href={langHref} title="Language" hrefLang={otherLang}>
              <span className={lang === 'en' ? 'on' : ''}>EN</span>
              <span style={{ margin: '0 4px' }}>/</span>
              <span className={lang === 'ru' ? 'on' : ''}>RU</span>
            </a>
            <button className="icon-btn" onClick={toggleTheme} title="Theme" aria-label="Toggle theme">
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              className="icon-btn menu-btn"
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Menu"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <CloseIcon /> : <MenuIcon />}
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
          <a href={lang === 'ru' ? '/ru/about' : '/about'} style={{ borderBottom: '1px solid currentColor' }}>{t.footer_feedback}</a>
        </div>
      </footer>

      {searchOpen && (
        <SearchOverlay
          lang={lang}
          onClose={() => setSearchOpen(false)}
          setToast={setToast}
        />
      )}

      {footnote && (
        <FootnotePopover
          fnKey={footnote.key}
          text={footnote.text}
          anchorRect={footnote.rect}
          onClose={() => setFootnote(null)}
        />
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  );
}

// ─── Footnote popover ──────────────────────────────────────────────────────────

function FootnotePopover({ fnKey, text, anchorRect, onClose }: {
  fnKey: string; text: string; anchorRect: DOMRect; onClose: () => void;
}) {
  const [pos, setPos] = useState<{ top: number; left: number; placement: 'below' | 'above' }>({
    top: -9999, left: -9999, placement: 'below',
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const padding = 12;
    const width = Math.min(340, window.innerWidth - padding * 2);
    el.style.width = `${width}px`;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - anchorRect.bottom;
    const placement = spaceBelow > rect.height + 16 ? 'below' : 'above';
    const top = placement === 'below'
      ? anchorRect.bottom + 8
      : Math.max(padding, anchorRect.top - rect.height - 8);
    const idealLeft = anchorRect.left - 12;
    const left = Math.min(
      Math.max(padding, idealLeft),
      window.innerWidth - width - padding,
    );
    setPos({ top, left, placement });
  }, [anchorRect, text]);

  useEffect(() => {
    const onScroll = () => onClose();
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, { capture: true } as any);
      window.removeEventListener('resize', onScroll);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fn-pop"
      role="dialog"
      aria-label={`Footnote ${fnKey}`}
      style={{ top: pos.top, left: pos.left }}
      data-placement={pos.placement}
      onClick={e => e.stopPropagation()}
    >
      <div className="fn-pop-head">
        <span className="fn-pop-key">{fnKey}</span>
        <button className="fn-pop-close" onClick={onClose} aria-label="Close">×</button>
      </div>
      <div className="fn-pop-body">{text}</div>
    </div>
  );
}

// ─── Search overlay ────────────────────────────────────────────────────────────

function SearchOverlay({ lang, onClose }: { lang: Lang; onClose: () => void; setToast: (s: string) => void }) {
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
        `*[_type=="passage" && work._ref=="work.meditations" && translator=="${lang === 'ru' ? 'Роговин' : 'George Long'}" && text match $q][0..29]{passageId, book, section, text}`
      )}&%24q=%22${encodeURIComponent(q)}*%22`
    )
      .then(r => r.json())
      .then(data => {
        const rows = (data.result ?? []) as Array<{ passageId: string; book: number; section: string; text: string }>;
        const prefix = lang === 'ru' ? '/ru' : '';
        const refLabel = lang === 'ru' ? 'Книга' : 'Book';
        setResults(rows.map(p => ({
          url: `${prefix}/passage/${p.book}/${p.section}`,
          ref: `${refLabel} ${p.book} · ${p.section}`,
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
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  );
}
function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ width: 18, height: 18 }}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ width: 18, height: 18 }}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

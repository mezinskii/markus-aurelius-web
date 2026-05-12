import { useState, useEffect, useRef, useMemo, type ReactNode } from 'react';
import { UI, type Lang } from '../lib/ui';
import { search, buildHighlightedUrl, type IndexEntry, type SearchHit } from '../lib/search';

interface Props {
  route: 'home' | 'contents' | 'about' | 'fronto' | 'book' | 'passage' | 'letter' | 'sayings';
  /** Language is determined by URL: /ru/* is RU, everything else is EN. */
  lang: Lang;
  /** Current page path passed in from the server, e.g. "/book/3" or "/ru/book/3". */
  pathname: string;
  children: ReactNode;
}

/** Build the equivalent URL in the other language. */
function localizedHref(pathname: string, target: Lang): string {
  const stripped = pathname.replace(/^\/ru(?=\/|$)/, '') || '/';
  if (target === 'ru') return stripped === '/' ? '/ru' : '/ru' + stripped;
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

  const setThemeMode = (next: 'light' | 'dark') => {
    if (next === theme) return;
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const enHref = localizedHref(pathname, 'en');
  const ruHref = localizedHref(pathname, 'ru');

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

  // Highlight ?q=… on the destination page (search-result deep link).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (!q) return;
    // Only highlight inside text-content areas.
    const targets = document.querySelectorAll<HTMLElement>('.passage-body, .saying-card-text, .letter-section');
    if (!targets.length) return;
    let firstMark: HTMLElement | null = null;
    for (const root of targets) {
      const m = highlightMatchesIn(root, q);
      if (!firstMark && m) firstMark = m;
    }
    if (firstMark) {
      // Defer to allow layout to settle before scrolling.
      requestAnimationFrame(() => {
        firstMark!.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
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

            <div className="seg-toggle" role="group" aria-label="Theme">
              <button
                type="button"
                className={theme === 'light' ? 'active' : ''}
                onClick={() => setThemeMode('light')}
                aria-label="Light theme"
                aria-pressed={theme === 'light'}
                title="Light"
              >
                <SunIcon />
              </button>
              <button
                type="button"
                className={theme === 'dark' ? 'active' : ''}
                onClick={() => setThemeMode('dark')}
                aria-label="Dark theme"
                aria-pressed={theme === 'dark'}
                title="Dark"
              >
                <MoonIcon />
              </button>
            </div>

            <div className="seg-toggle lang" role="group" aria-label="Language">
              <a
                className={lang === 'en' ? 'active' : ''}
                href={enHref}
                hrefLang="en"
                aria-current={lang === 'en' ? 'page' : undefined}
              >
                EN
              </a>
              <a
                className={lang === 'ru' ? 'active' : ''}
                href={ruHref}
                hrefLang="ru"
                aria-current={lang === 'ru' ? 'page' : undefined}
              >
                RU
              </a>
            </div>

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
          <div>
            {t.footer_made_pre}
            <a
              href={`https://mezinskii.com/${lang}`}
              rel="author noopener"
              target="_blank"
              hrefLang={lang}
              style={{ borderBottom: '1px solid currentColor' }}
            >
              {t.footer_author}
            </a>
            .
          </div>
          <a
            href={`https://mezinskii.com/${lang}`}
            rel="author noopener"
            target="_blank"
            hrefLang={lang}
            style={{ borderBottom: '1px solid currentColor' }}
          >
            {t.footer_feedback}
          </a>
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

/** Module-level cache: index per language is fetched once per session. */
const indexCache: Partial<Record<Lang, Promise<IndexEntry[]>>> = {};

function loadIndex(lang: Lang): Promise<IndexEntry[]> {
  if (!indexCache[lang]) {
    indexCache[lang] = fetch(`/search-index-${lang}.json`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error('index fetch failed')))
      .catch(err => {
        // Reset on error so the next attempt can retry.
        indexCache[lang] = undefined;
        throw err;
      });
  }
  return indexCache[lang]!;
}

function SearchOverlay({ lang, onClose }: { lang: Lang; onClose: () => void; setToast: (s: string) => void }) {
  const t = UI[lang];
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [index, setIndex] = useState<IndexEntry[] | null>(null);
  const [error, setError] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Lazy-load the prebuilt JSON index on open.
  useEffect(() => {
    let cancelled = false;
    loadIndex(lang)
      .then(data => { if (!cancelled) setIndex(data); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [lang]);

  // Debounce query → search runs after 80ms of stillness.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q), 80);
    return () => clearTimeout(id);
  }, [q]);

  const hits: SearchHit[] = useMemo(() => {
    if (!index || !debouncedQ.trim()) return [];
    return search(index, debouncedQ, 40);
  }, [index, debouncedQ]);

  // Keep keyboard focus index in range when results change.
  useEffect(() => { setActiveIdx(0); }, [debouncedQ, hits.length]);

  // Arrow-key navigation through results.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!hits.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx(i => (i + 1) % hits.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx(i => (i - 1 + hits.length) % hits.length);
      } else if (e.key === 'Enter') {
        const hit = hits[activeIdx];
        if (hit) {
          e.preventDefault();
          window.location.href = buildHighlightedUrl(hit.entry.url, debouncedQ);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hits, activeIdx, debouncedQ]);

  // Group results by type for a portal-style sectioned view.
  const grouped = useMemo(() => {
    const g: Record<'m' | 'l' | 's', SearchHit[]> = { m: [], l: [], s: [] };
    for (const h of hits) g[h.entry.type].push(h);
    return g;
  }, [hits]);

  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="search-panel" onClick={e => e.stopPropagation()}>
        <div className="search-head">
          <SearchIcon style={{ width: 18, height: 18, color: 'var(--text-mute)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            autoFocus
            className="search-input"
            placeholder={t.search_placeholder}
            value={q}
            onChange={e => setQ(e.target.value)}
            spellCheck={false}
            autoComplete="off"
          />
          <span className="search-esc">ESC</span>
        </div>
        <div className="search-results">
          {!debouncedQ.trim() ? (
            <div className="search-empty">{t.search_hint}</div>
          ) : error ? (
            <div className="search-empty">{lang === 'ru' ? 'Не удалось загрузить индекс.' : 'Could not load index.'}</div>
          ) : !index ? (
            <div className="search-empty" style={{ padding: '32px 22px' }}>…</div>
          ) : !hits.length ? (
            <div className="search-empty">{t.search_empty}</div>
          ) : (
            <SearchHitList
              grouped={grouped}
              total={hits.length}
              query={debouncedQ}
              lang={lang}
              activeIdx={activeIdx}
              flatHits={hits}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function SearchHitList({
  grouped, total, query, lang, activeIdx, flatHits, onClose,
}: {
  grouped: Record<'m' | 'l' | 's', SearchHit[]>;
  total: number;
  query: string;
  lang: Lang;
  activeIdx: number;
  flatHits: SearchHit[];
  onClose: () => void;
}) {
  const t = UI[lang];
  const sectionLabels: Record<'m' | 'l' | 's', string> = {
    m: lang === 'ru' ? 'Размышления' : 'Meditations',
    l: lang === 'ru' ? 'Письма' : 'Letters',
    s: lang === 'ru' ? 'Изречения' : 'Sayings',
  };
  const order: Array<'m' | 'l' | 's'> = ['m', 'l', 's'];

  // Map flat-list index -> hit for the active highlight.
  const activeHit = flatHits[activeIdx];

  // Auto-scroll active result into view.
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!activeHit || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-hit-url="${activeHit.entry.url}"]`) as HTMLElement | null;
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [activeHit]);

  return (
    <div ref={listRef}>
      <div className="search-meta">{total} {t.search_results}</div>
      {order.map(typeKey => {
        const list = grouped[typeKey];
        if (!list.length) return null;
        return (
          <div key={typeKey} className="search-group">
            <div className="search-group-head">{sectionLabels[typeKey]} <span>· {list.length}</span></div>
            {list.map(h => {
              const url = buildHighlightedUrl(h.entry.url, query);
              const isActive = activeHit === h;
              return (
                <a
                  key={h.entry.url + ':' + h.entry.ref}
                  data-hit-url={h.entry.url}
                  className={`search-result${isActive ? ' search-result--active' : ''}`}
                  href={url}
                  onClick={onClose}
                >
                  <div className="search-result-ref">
                    <span className={`search-badge search-badge--${typeKey}`}>{badgeChar(typeKey)}</span>
                    {h.entry.ref}
                    {h.entry.meta && <span className="search-result-meta"> · {h.entry.meta}</span>}
                  </div>
                  <p
                    className="search-result-text"
                    dangerouslySetInnerHTML={{ __html: h.snippetHtml }}
                  />
                </a>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function badgeChar(type: 'm' | 'l' | 's'): string {
  return type === 'm' ? 'M' : type === 'l' ? 'L' : 'S';
}

// ─── In-page match highlighting ────────────────────────────────────────────────

/**
 * Walks all text nodes in `root` (skipping <sup>/<script>/<style>/existing <mark>)
 * and wraps each query-word occurrence in a <mark class="hl-match">.
 * Returns the first <mark> created, or null if nothing matched.
 */
function highlightMatchesIn(root: HTMLElement, query: string): HTMLElement | null {
  const words = Array.from(new Set(
    query.toLowerCase().replace(/ё/g, 'е')
      .split(/[^\p{L}\p{N}]+/u)
      .filter(w => w.length > 1),
  )).sort((a, b) => b.length - a.length); // longer first to avoid partial overshadowing
  if (!words.length) return null;

  const SKIP_TAGS = new Set(['SUP', 'SCRIPT', 'STYLE', 'MARK', 'INPUT', 'TEXTAREA', 'BUTTON']);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      let p = node.parentElement;
      while (p && p !== root) {
        if (SKIP_TAGS.has(p.tagName)) return NodeFilter.FILTER_REJECT;
        p = p.parentElement;
      }
      return node.nodeValue && node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });

  const textNodes: Text[] = [];
  let cur: Node | null;
  while ((cur = walker.nextNode())) textNodes.push(cur as Text);

  let firstMark: HTMLElement | null = null;

  for (const node of textNodes) {
    const original = node.nodeValue || '';
    const lower = original.toLowerCase().replace(/ё/g, 'е');
    const ranges: Array<{ start: number; end: number }> = [];
    for (const w of words) {
      let from = 0;
      while (true) {
        const i = lower.indexOf(w, from);
        if (i < 0) break;
        ranges.push({ start: i, end: i + w.length });
        from = i + w.length;
      }
    }
    if (!ranges.length) continue;

    ranges.sort((a, b) => a.start - b.start);
    const merged: Array<{ start: number; end: number }> = [ranges[0]];
    for (let i = 1; i < ranges.length; i++) {
      const last = merged[merged.length - 1];
      const r = ranges[i];
      if (r.start <= last.end) last.end = Math.max(last.end, r.end);
      else merged.push(r);
    }

    const frag = document.createDocumentFragment();
    let cursor = 0;
    for (const r of merged) {
      if (r.start > cursor) frag.appendChild(document.createTextNode(original.slice(cursor, r.start)));
      const mark = document.createElement('mark');
      mark.className = 'hl-match';
      mark.textContent = original.slice(r.start, r.end);
      frag.appendChild(mark);
      if (!firstMark) firstMark = mark;
      cursor = r.end;
    }
    if (cursor < original.length) frag.appendChild(document.createTextNode(original.slice(cursor)));

    node.parentNode?.replaceChild(frag, node);
  }

  return firstMark;
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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
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

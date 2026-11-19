import 'katex/dist/katex.min.css';
import './styles/tokens.css';
import './styles/prose.css';
import './styles/app.css';

import { dictionaries, type Messages } from './core/i18n';
import { renderMarkdown, type Frontmatter, type TocItem } from './core/markdown';
import { renderMermaidBlocks } from './core/mermaid';
import {
  buildBundleFromFiles,
  ensureHandleReadable,
  extractFilesFromDataTransfer,
  isMarkdownFileName,
  pickLocalFileWithHandle,
  pickLocalFolderWithHandles,
  watchLocalDoc,
  type DocumentBundle,
  type FileWatcher,
  type FileWithHandle,
  type LocalDoc,
} from './core/files';
import {
  clearActiveSession,
  clearRecentDocs,
  listRecentDocs,
  loadActiveSession,
  loadPrefs,
  loadSessionScroll,
  saveActiveSession,
  savePrefs,
  saveRecentDoc,
  saveSessionScroll,
  updateRecentScroll,
  type FontId,
  type LineHeightId,
  type MeasureId,
  type ReaderPrefs,
  type RecentDoc,
  type ThemeId,
} from './core/storage';
import { getSampleDoc } from './core/sample';

const MEASURE_ORDER: MeasureId[] = ['compact', 'narrow', 'standard', 'wide', 'full'];
const MEASURE_MAP: Record<MeasureId, string> = {
  compact: '56ch',
  narrow: '64ch',
  standard: '74ch',
  wide: '92ch',
  full: 'min(1200px, 100%)',
};

const LINE_HEIGHT_ORDER: LineHeightId[] = ['tight', 'normal', 'relaxed'];
const LINE_HEIGHT_MAP: Record<LineHeightId, number> = {
  tight: 1.62,
  normal: 1.82,
  relaxed: 2.05,
};

const FONT_ORDER: FontId[] = ['serif', 'sans', 'mono'];
const THEME_ORDER: ThemeId[] = ['paper', 'sepia', 'mist', 'ink'];

const ICONS = {
  logo: `<svg class="brand-mark" viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <rect x="3" y="3" width="58" height="58" rx="15" fill="var(--bg)" stroke="var(--accent)" stroke-width="2.6"/>
    <path d="M16 42V22.5L32 34.5L48 22.5V42" stroke="var(--accent)" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M22 46.5C25.5 44.6 28.8 44.6 32 46.5C35.2 48.4 38.5 48.4 42 46.5" stroke="var(--accent)" stroke-opacity="0.55" stroke-width="2.4" stroke-linecap="round"/>
  </svg>`,
  drop: `<svg class="dropzone-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M14 8h13l9 9v23a3 3 0 0 1-3 3H14a3 3 0 0 1-3-3V11a3 3 0 0 1 3-3z"/>
    <path d="M27 8v9h9"/>
    <path d="M18 27l6-6 6 6"/>
    <path d="M24 21v13"/>
  </svg>`,
  file: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>`,
  folder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`,
  paste: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>`,
  book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`,
  moon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>`,
  globe: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>`,
  back: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>`,
  toc: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h16M4 12h11M4 18h7"/></svg>`,
  open: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M12 18v-6M9 15l3-3 3 3"/></svg>`,
  type: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7V5h16v2M12 5v14M9 19h6"/></svg>`,
  focus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/></svg>`,
  fullscreen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`,
  exitFullscreen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>`,
  keyboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8"/></svg>`,
  copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2.2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>`,
  widthCompact: `<svg viewBox="0 0 20 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M7 4h6M7 8h6M7 12h4.5"/></svg>`,
  widthNarrow: `<svg viewBox="0 0 20 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M5.5 4h9M5.5 8h9M5.5 12h6.5"/></svg>`,
  widthStandard: `<svg viewBox="0 0 20 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M4 4h12M4 8h12M4 12h9"/></svg>`,
  widthWide: `<svg viewBox="0 0 20 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M2.5 4h15M2.5 8h15M2.5 12h11.5"/></svg>`,
  widthFull: `<svg viewBox="0 0 20 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M1 4h18M1 8h18M1 12h14"/></svg>`,
  lhTight: `<svg viewBox="0 0 18 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M3 5h12M3 8h12M3 11h12"/></svg>`,
  lhNormal: `<svg viewBox="0 0 18 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M3 3.8h12M3 8h12M3 12.2h12"/></svg>`,
  lhRelaxed: `<svg viewBox="0 0 18 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M3 2.5h12M3 8h12M3 13.5h12"/></svg>`,
};

interface AppState {
  prefs: ReaderPrefs;
  view: 'landing' | 'reader';
  bundle: DocumentBundle | null;
  activeDoc: LocalDoc | null;
  recentDocs: RecentDoc[];
  toc: TocItem[];
  drawerOpen: boolean;
  drawerTab: 'toc' | 'files';
  settingsOpen: boolean;
  pasteOpen: boolean;
  shortcutsOpen: boolean;
  chromeHidden: boolean;
  isFullscreen: boolean;
  lastScrollY: number;
  wordCount: number;
  readingMinutes: number;
  hasMermaid: boolean;
  lastLightTheme: ThemeId;
  lastDarkTheme: ThemeId;
}

const initialPrefs = loadPrefs();
const state: AppState = {
  prefs: initialPrefs,
  view: 'landing',
  bundle: null,
  activeDoc: null,
  recentDocs: [],
  toc: [],
  drawerOpen: false,
  drawerTab: 'toc',
  settingsOpen: false,
  pasteOpen: false,
  shortcutsOpen: false,
  chromeHidden: false,
  isFullscreen: false,
  lastScrollY: 0,
  wordCount: 0,
  readingMinutes: 0,
  hasMermaid: false,
  lastLightTheme:
    initialPrefs.theme === 'paper' || initialPrefs.theme === 'sepia' ? initialPrefs.theme : 'paper',
  lastDarkTheme:
    initialPrefs.theme === 'mist' || initialPrefs.theme === 'ink' ? initialPrefs.theme : 'mist',
};

let hideTimer: number | null = null;
let toastTimer: number | null = null;
let scrollSaveTimer: number | null = null;
let headingObserver: IntersectionObserver | null = null;
let focusObserver: IntersectionObserver | null = null;
let activeWatcher: FileWatcher | null = null;
let dragDepth = 0;

function t(): Messages {
  return dictionaries[state.prefs.lang];
}

function isDarkTheme(theme: ThemeId): boolean {
  return theme === 'mist' || theme === 'ink';
}

function getThemeLabel(theme: ThemeId): string {
  const m = t();
  if (theme === 'paper') return m.themePaper;
  if (theme === 'sepia') return m.themeSepia;
  if (theme === 'mist') return m.themeMist;
  return m.themeInk;
}

function getMeasureLabel(measure: MeasureId): string {
  const m = t();
  if (measure === 'compact') return m.measureCompact;
  if (measure === 'narrow') return m.measureNarrow;
  if (measure === 'standard') return m.measureStandard;
  if (measure === 'wide') return m.measureWide;
  return m.measureFull;
}

function getLineHeightLabel(lh: LineHeightId): string {
  const m = t();
  if (lh === 'tight') return m.lhTight;
  if (lh === 'relaxed') return m.lhRelaxed;
  return m.lhNormal;
}

function getFontLabel(font: FontId): string {
  const m = t();
  if (font === 'serif') return m.fontSerif;
  if (font === 'sans') return m.fontSans;
  return m.fontMono;
}

function applyPrefsToDocument(): void {
  const root = document.documentElement;
  root.lang = state.prefs.lang === 'zh' ? 'zh-CN' : 'en';
  root.dataset.theme = state.prefs.theme;
  root.dataset.font = state.prefs.font;
  root.style.removeProperty('background-color');
  root.style.colorScheme = isDarkTheme(state.prefs.theme) ? 'dark' : 'light';
  root.style.setProperty('--reader-size', `${state.prefs.fontSize}px`);
  root.style.setProperty('--reader-line-height', String(LINE_HEIGHT_MAP[state.prefs.lineHeight]));
  root.style.setProperty('--reader-measure', MEASURE_MAP[state.prefs.measure]);
  document.body.classList.toggle('focus-mode', state.prefs.focusMode);
  if (isDarkTheme(state.prefs.theme)) {
    state.lastDarkTheme = state.prefs.theme;
  } else {
    state.lastLightTheme = state.prefs.theme;
  }
  savePrefs(state.prefs);
}

function showToast(msg: string, duration = 2000): void {
  const el = document.getElementById('calmd-toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('is-visible');
  if (toastTimer !== null) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    el.classList.remove('is-visible');
  }, duration);
}

function setChromeVisible(visible: boolean): void {
  state.chromeHidden = !visible;
  const bar = document.getElementById('reader-bar');
  if (bar) {
    bar.classList.toggle('is-hidden', state.chromeHidden);
  }
}

function scheduleChromeHide(): void {
  if (hideTimer !== null) window.clearTimeout(hideTimer);
  if (state.view !== 'reader' || state.settingsOpen || state.drawerOpen || state.shortcutsOpen) {
    return;
  }
  hideTimer = window.setTimeout(() => {
    if (
      state.view === 'reader' &&
      !state.settingsOpen &&
      !state.drawerOpen &&
      !state.shortcutsOpen &&
      (window.scrollY > 60 || state.isFullscreen)
    ) {
      setChromeVisible(false);
    }
  }, 2000);
}

function syncEdgeFocusBlocks(ratio: number): void {
  const article = document.getElementById('reader-article');
  if (!article || article.children.length === 0) return;
  if (window.scrollY <= 48) {
    article.firstElementChild?.classList.add('is-focused');
  }
  if (ratio >= 0.98) {
    article.lastElementChild?.classList.add('is-focused');
  }
}

function updateProgressAndScrollSave(): void {
  if (state.view !== 'reader') return;
  const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = scrollHeight > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollHeight)) : 0;

  const fill = document.getElementById('progress-fill');
  if (fill) {
    fill.style.width = `${(ratio * 100).toFixed(2)}%`;
  }

  syncEdgeFocusBlocks(ratio);

  const dy = window.scrollY - state.lastScrollY;
  state.lastScrollY = window.scrollY;

  if (dy > 14 && window.scrollY > 80 && !state.settingsOpen && !state.drawerOpen) {
    setChromeVisible(false);
  } else if (dy < -24 || window.scrollY <= 36) {
    setChromeVisible(true);
    scheduleChromeHide();
  }

  if (state.activeDoc) {
    saveSessionScroll(state.activeDoc.id, ratio);
    if (!state.bundle) {
      if (scrollSaveTimer !== null) window.clearTimeout(scrollSaveTimer);
      const docId = state.activeDoc.id;
      scrollSaveTimer = window.setTimeout(() => {
        void updateRecentScroll(docId, ratio);
      }, 500);
    }
  }
}

function toggleFullscreen(): void {
  if (!document.fullscreenElement) {
    const req = document.documentElement.requestFullscreen?.();
    if (req) {
      req
        .then(() => {
          state.isFullscreen = true;
          document.body.classList.add('is-fullscreen');
          syncFullscreenButton();
          setChromeVisible(false);
          showToast(t().fullscreenToast, 2600);
        })
        .catch(() => {
          state.isFullscreen = !state.isFullscreen;
          document.body.classList.toggle('is-fullscreen', state.isFullscreen);
          syncFullscreenButton();
          if (state.isFullscreen) {
            setChromeVisible(false);
            showToast(t().fullscreenToast, 2600);
          }
        });
    } else {
      state.isFullscreen = !state.isFullscreen;
      document.body.classList.toggle('is-fullscreen', state.isFullscreen);
      syncFullscreenButton();
      if (state.isFullscreen) {
        setChromeVisible(false);
        showToast(t().fullscreenToast, 2600);
      }
    }
  } else {
    void document.exitFullscreen();
  }
}

function syncFullscreenButton(): void {
  const btn = document.getElementById('btn-fullscreen');
  if (!btn) return;
  const m = t();
  btn.classList.toggle('is-active', state.isFullscreen);
  btn.title = `${state.isFullscreen ? m.exitFullscreen : m.fullscreen} (F)`;
  btn.setAttribute('aria-label', state.isFullscreen ? m.exitFullscreen : m.fullscreen);
  btn.innerHTML = state.isFullscreen ? ICONS.exitFullscreen : ICONS.fullscreen;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderFrontmatterHtml(fm: Frontmatter | null): string {
  if (!fm) return '';
  const pieces: string[] = [];
  if (fm.subtitle) {
    pieces.push(`<p class="article-meta-subtitle">${escapeHtml(fm.subtitle)}</p>`);
  }
  const metaParts: string[] = [];
  if (fm.author) metaParts.push(`<span>${escapeHtml(fm.author)}</span>`);
  if (fm.date) metaParts.push(`<span>${escapeHtml(fm.date)}</span>`);
  if (metaParts.length > 0) {
    pieces.push(`<div class="article-meta-row">${metaParts.join('<span>·</span>')}</div>`);
  }
  if (fm.tags.length > 0) {
    pieces.push(
      `<div class="article-meta-tags">${fm.tags
        .map((tag) => `<span class="article-meta-tag">${escapeHtml(tag)}</span>`)
        .join('')}</div>`,
    );
  }
  return pieces.length > 0 ? `<header class="article-meta">${pieces.join('')}</header>` : '';
}

function setupHeadingAndFocusObservers(): void {
  headingObserver?.disconnect();
  focusObserver?.disconnect();

  const article = document.getElementById('reader-article');
  if (!article) return;

  const headings = Array.from(article.querySelectorAll<HTMLElement>('h1[id], h2[id], h3[id], h4[id]'));
  if (headings.length > 0) {
    headingObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        if (!visible) return;
        const id = visible.target.id;
        document.querySelectorAll<HTMLAnchorElement>('.toc-link').forEach((link) => {
          link.classList.toggle('is-active', link.getAttribute('href') === `#${id}`);
        });
      },
      { rootMargin: '-12% 0px -72% 0px', threshold: 0 },
    );
    headings.forEach((h) => headingObserver?.observe(h));
  }

  const blocks = Array.from(article.children) as HTMLElement[];
  if (blocks.length > 0) {
    focusObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          entry.target.classList.toggle('is-focused', entry.isIntersecting);
        }
      },
      { rootMargin: '-28% 0px -28% 0px', threshold: 0.05 },
    );
    blocks.forEach((b) => focusObserver?.observe(b));
  }
}

async function hotReloadActiveDocument(newContent: string, lastModified: number): Promise<void> {
  if (state.view !== 'reader' || !state.activeDoc) return;
  const doc = state.activeDoc;
  doc.content = newContent;
  doc.lastModified = lastModified;

  const savedScrollY = window.scrollY;
  const m = t();
  const rendered = renderMarkdown(doc.content, {
    calloutLabels: m.calloutLabels,
    copyLabel: m.copy,
    resolveAsset: state.bundle
      ? (src) => state.bundle?.resolveAsset(doc.path, src)
      : undefined,
  });

  state.toc = rendered.toc;
  state.wordCount = rendered.wordCount;
  state.readingMinutes = rendered.readingMinutes;
  state.hasMermaid = rendered.hasMermaid;

  document.title = `${rendered.frontmatter?.title || doc.name.replace(/\.[^.]+$/, '')} — CalMD`;

  const mainEl = document.querySelector<HTMLElement>('.reader-main');
  if (mainEl) {
    const existingMeta = mainEl.querySelector('.article-meta');
    const nextMetaHtml = renderFrontmatterHtml(rendered.frontmatter);
    if (existingMeta && !nextMetaHtml) {
      existingMeta.remove();
    } else if (existingMeta && nextMetaHtml) {
      existingMeta.outerHTML = nextMetaHtml;
    } else if (!existingMeta && nextMetaHtml) {
      mainEl.insertAdjacentHTML('afterbegin', nextMetaHtml);
    }
  }

  const article = document.getElementById('reader-article');
  if (article) {
    article.innerHTML = rendered.html;
    if (rendered.hasMermaid) {
      await renderMermaidBlocks(article, isDarkTheme(state.prefs.theme));
    }
  }

  const statsEl = document.querySelector<HTMLElement>('.doc-stats');
  if (statsEl) {
    statsEl.textContent = `${m.wordsCount(state.wordCount)} · ${m.readTime(state.readingMinutes)}`;
  }

  if (state.drawerTab === 'toc') {
    const body = document.getElementById('drawer-body');
    if (body) {
      body.innerHTML = renderDrawerBodyHtml();
      bindDrawerBodyEvents();
    }
  }

  setupHeadingAndFocusObservers();
  window.scrollTo({ top: savedScrollY, behavior: 'instant' as ScrollBehavior });
  updateProgressAndScrollSave();

  const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = scrollHeight > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollHeight)) : 0;
  void saveActiveSession({
    id: doc.id,
    name: doc.name,
    path: doc.path,
    content: doc.content,
    lastModified: doc.lastModified,
    scrollRatio: ratio,
    fileHandle: doc.fileHandle,
  });

  if (!state.bundle) {
    await saveRecentDoc({
      id: doc.id,
      name: doc.name,
      content: doc.content,
      updatedAt: Date.now(),
      scrollRatio: ratio,
      wordCount: rendered.wordCount,
      fileHandle: doc.fileHandle,
    });
    state.recentDocs = await listRecentDocs();
  }

  showToast(m.reloadedToast, 1400);
}

async function triggerManualReloadOrResume(): Promise<void> {
  if (activeWatcher) {
    const changed = await activeWatcher.checkNow(true);
    if (!changed) showToast(t().upToDateToast, 1200);
    return;
  }
  const doc = state.activeDoc;
  const handle = doc?.fileHandle;
  if (doc && handle) {
    const ok = await ensureHandleReadable(handle, true);
    if (!ok || state.activeDoc !== doc) return;
    activeWatcher = watchLocalDoc(doc, (newContent, lastModified) => {
      void hotReloadActiveDocument(newContent, lastModified);
    });
    syncLiveDot();
    const changed = await activeWatcher?.checkNow(true);
    if (!changed) showToast(t().liveReloadResumedToast, 1600);
    return;
  }
  showToast(t().noFileHandleToast, 2800);
}

function syncLiveDot(): void {
  const wrap = document.querySelector<HTMLElement>('.doc-title-wrap');
  if (!wrap) return;
  const existing = document.getElementById('btn-live-status');
  const hasHandle = Boolean(state.activeDoc?.fileHandle);
  const isLive = activeWatcher !== null;

  if (!hasHandle && !isLive) {
    existing?.remove();
    return;
  }

  const tip = isLive ? t().liveReloadTip : t().liveReloadPausedTip;
  if (existing) {
    existing.title = tip;
    existing.setAttribute('aria-label', tip);
    existing.querySelector('.live-dot')?.classList.toggle('is-paused', !isLive);
    return;
  }

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'btn-live-status';
  btn.className = 'live-dot-btn';
  btn.title = tip;
  btn.setAttribute('aria-label', tip);
  btn.innerHTML = `<span class="live-dot ${isLive ? '' : 'is-paused'}" aria-hidden="true"></span>`;
  btn.addEventListener('click', () => {
    void triggerManualReloadOrResume();
  });
  wrap.insertBefore(btn, wrap.firstChild);
}

async function openDocument(
  doc: LocalDoc,
  options: {
    bundle?: DocumentBundle | null;
    restoreScrollRatio?: number;
    persistRecent?: boolean;
    targetHash?: string;
  } = {},
): Promise<void> {
  activeWatcher?.stop();
  activeWatcher = null;

  if (options.bundle !== undefined && options.bundle !== state.bundle) {
    state.bundle?.dispose();
    state.bundle = options.bundle;
  }

  state.activeDoc = doc;
  state.view = 'reader';
  state.drawerOpen = false;
  state.settingsOpen = false;
  state.pasteOpen = false;
  state.shortcutsOpen = false;
  state.chromeHidden = false;
  state.lastScrollY = 0;

  const m = t();
  const rendered = renderMarkdown(doc.content, {
    calloutLabels: m.calloutLabels,
    copyLabel: m.copy,
    resolveAsset: state.bundle
      ? (src) => state.bundle?.resolveAsset(doc.path, src)
      : undefined,
  });

  state.toc = rendered.toc;
  state.wordCount = rendered.wordCount;
  state.readingMinutes = rendered.readingMinutes;
  state.hasMermaid = rendered.hasMermaid;

  document.title = `${rendered.frontmatter?.title || doc.name.replace(/\.[^.]+$/, '')} — CalMD`;

  renderApp(rendered.html, rendered.frontmatter);

  const article = document.getElementById('reader-article');
  if (article && rendered.hasMermaid) {
    await renderMermaidBlocks(article, isDarkTheme(state.prefs.theme));
  }

  setupHeadingAndFocusObservers();

  if (doc.fileHandle && (await ensureHandleReadable(doc.fileHandle, false))) {
    activeWatcher = watchLocalDoc(doc, (newContent, lastModified) => {
      void hotReloadActiveDocument(newContent, lastModified);
    });
  }
  syncLiveDot();

  void saveActiveSession({
    id: doc.id,
    name: doc.name,
    path: doc.path,
    content: doc.content,
    lastModified: doc.lastModified,
    scrollRatio: options.restoreScrollRatio ?? 0,
    fileHandle: doc.fileHandle,
  });

  if (options.persistRecent !== false && !state.bundle) {
    await saveRecentDoc({
      id: doc.id,
      name: doc.name,
      content: doc.content,
      updatedAt: Date.now(),
      scrollRatio: options.restoreScrollRatio ?? 0,
      wordCount: rendered.wordCount,
      fileHandle: doc.fileHandle,
    });
    state.recentDocs = await listRecentDocs();
  }

  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  if (options.targetHash) {
    requestAnimationFrame(() => {
      const target = document.getElementById(options.targetHash!);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      updateProgressAndScrollSave();
    });
  } else if (options.restoreScrollRatio && options.restoreScrollRatio > 0.01) {
    requestAnimationFrame(() => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      if (h > 0) window.scrollTo({ top: Math.round(h * options.restoreScrollRatio!) });
      updateProgressAndScrollSave();
    });
  } else {
    updateProgressAndScrollSave();
  }

  scheduleChromeHide();
}

function rerenderActiveDocument(): void {
  if (state.view !== 'reader' || !state.activeDoc) {
    renderApp();
    return;
  }
  const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = scrollHeight > 0 ? window.scrollY / scrollHeight : 0;
  void openDocument(state.activeDoc, {
    bundle: state.bundle,
    restoreScrollRatio: ratio,
    persistRecent: false,
  });
}

function goHome(): void {
  activeWatcher?.stop();
  activeWatcher = null;
  void clearActiveSession();
  if (document.fullscreenElement) {
    void document.exitFullscreen();
  }
  state.isFullscreen = false;
  document.body.classList.remove('is-fullscreen');
  state.bundle?.dispose();
  state.bundle = null;
  state.activeDoc = null;
  state.view = 'landing';
  state.drawerOpen = false;
  state.settingsOpen = false;
  document.title = 'CalMD — Quiet Markdown Reader';
  renderApp();
}

async function triggerOpenFilePicker(): Promise<void> {
  const picked = await pickLocalFileWithHandle();
  if (picked === 'cancelled') return;
  if (picked === 'unsupported') {
    (document.getElementById('input-file') as HTMLInputElement | null)?.click();
    return;
  }
  await handleFileInput([picked.file]);
}

async function triggerOpenFolderPicker(): Promise<void> {
  const picked = await pickLocalFolderWithHandles();
  if (picked === 'cancelled') return;
  if (picked === 'unsupported') {
    (document.getElementById('input-folder') as HTMLInputElement | null)?.click();
    return;
  }
  await handleFileInput(picked.files, picked.rootName);
}

async function handleFileInput(files: FileList | File[], rootLabel?: string): Promise<void> {
  const arr = Array.from(files) as FileWithHandle[];
  if (arr.length === 0) return;

  const isMultiOrFolder =
    arr.length > 1 ||
    arr.some((f) => Boolean(f.webkitRelativePath?.includes('/')));

  if (!isMultiOrFolder) {
    const file = arr[0];
    if (!isMarkdownFileName(file.name)) {
      showToast(t().unsupportedFile, 3000);
      return;
    }
    const content = await file.text();
    await openDocument(
      {
        id: `file:${file.name}:${file.size}`,
        name: file.name,
        path: file.name,
        content,
        lastModified: file.lastModified || Date.now(),
        fileHandle: file.__calmdHandle,
      },
      { bundle: null, persistRecent: true },
    );
    return;
  }

  const bundle = await buildBundleFromFiles(arr, rootLabel);
  if (!bundle) {
    showToast(t().emptyFolder, 3000);
    return;
  }
  await openDocument(bundle.docs[0], { bundle, persistRecent: false });
}

function refreshSettingsPopover(): void {
  const pop = document.getElementById('settings-popover');
  if (!pop) return;
  pop.innerHTML = renderSettingsHtml();
  bindSettingsEvents();
}

function applyTheme(next: ThemeId, notify = false): void {
  const prevDark = isDarkTheme(state.prefs.theme);
  state.prefs.theme = next;
  applyPrefsToDocument();
  if (state.view === 'landing') {
    renderApp();
  } else {
    refreshSettingsPopover();
    if (state.hasMermaid && prevDark !== isDarkTheme(state.prefs.theme)) {
      rerenderActiveDocument();
    }
  }
  if (notify) {
    showToast(`${t().theme} · ${getThemeLabel(next)}`, 1400);
  }
}

function toggleDayDarkTheme(): void {
  const next = isDarkTheme(state.prefs.theme) ? state.lastLightTheme : state.lastDarkTheme;
  applyTheme(next, true);
}

function cycleMeasure(step: 1 | -1 = 1): void {
  const idx = MEASURE_ORDER.indexOf(state.prefs.measure);
  const next = MEASURE_ORDER[(idx + step + MEASURE_ORDER.length) % MEASURE_ORDER.length];
  state.prefs.measure = next;
  applyPrefsToDocument();
  refreshSettingsPopover();
  showToast(`${t().measure} · ${getMeasureLabel(next)}`, 1400);
}

function cycleLineHeight(): void {
  const idx = LINE_HEIGHT_ORDER.indexOf(state.prefs.lineHeight);
  const next = LINE_HEIGHT_ORDER[(idx + 1) % LINE_HEIGHT_ORDER.length];
  state.prefs.lineHeight = next;
  applyPrefsToDocument();
  refreshSettingsPopover();
  showToast(`${t().lineHeight} · ${getLineHeightLabel(next)}`, 1400);
}

function cycleFont(): void {
  const idx = FONT_ORDER.indexOf(state.prefs.font);
  const next = FONT_ORDER[(idx + 1) % FONT_ORDER.length];
  state.prefs.font = next;
  applyPrefsToDocument();
  refreshSettingsPopover();
  showToast(`${t().font} · ${getFontLabel(next)}`, 1400);
}

function jumpHeading(direction: 1 | -1): void {
  const article = document.getElementById('reader-article');
  if (!article) return;
  const headings = Array.from(
    article.querySelectorAll<HTMLElement>('h1[id], h2[id], h3[id], h4[id]'),
  );
  if (headings.length === 0) return;

  const currentY = window.scrollY + 84;
  let target: HTMLElement | undefined;
  if (direction === 1) {
    target = headings.find((h) => h.getBoundingClientRect().top + window.scrollY > currentY + 8);
  } else {
    for (let i = headings.length - 1; i >= 0; i--) {
      const top = headings[i].getBoundingClientRect().top + window.scrollY;
      if (top < currentY - 24) {
        target = headings[i];
        break;
      }
    }
  }
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function stepBundleDocument(delta: 1 | -1): void {
  if (!state.bundle || state.bundle.docs.length <= 1 || !state.activeDoc) return;
  const idx = state.bundle.docs.findIndex((d) => d.id === state.activeDoc?.id);
  if (idx === -1) return;
  const nextIdx = (idx + delta + state.bundle.docs.length) % state.bundle.docs.length;
  const nextDoc = state.bundle.docs[nextIdx];
  void openDocument(nextDoc, { bundle: state.bundle, persistRecent: false });
}

function renderSettingsHtml(): string {
  const m = t();
  const p = state.prefs;
  const themes: Array<{ id: ThemeId; label: string; bg: string; dot: string }> = [
    { id: 'paper', label: m.themePaper, bg: '#FAF8F4', dot: '#476A5B' },
    { id: 'sepia', label: m.themeSepia, bg: '#F3ECD8', dot: '#526A4D' },
    { id: 'mist', label: m.themeMist, bg: '#1B1C1F', dot: '#84B09C' },
    { id: 'ink', label: m.themeInk, bg: '#0F1012', dot: '#82AE9A' },
  ];

  const fonts: Array<{ id: FontId; label: string }> = [
    { id: 'serif', label: m.fontSerif },
    { id: 'sans', label: m.fontSans },
    { id: 'mono', label: m.fontMono },
  ];

  const measures: Array<{ id: MeasureId; label: string; icon: string }> = [
    { id: 'compact', label: m.measureCompact, icon: ICONS.widthCompact },
    { id: 'narrow', label: m.measureNarrow, icon: ICONS.widthNarrow },
    { id: 'standard', label: m.measureStandard, icon: ICONS.widthStandard },
    { id: 'wide', label: m.measureWide, icon: ICONS.widthWide },
    { id: 'full', label: m.measureFull, icon: ICONS.widthFull },
  ];

  const lineHeights: Array<{ id: LineHeightId; label: string; icon: string }> = [
    { id: 'tight', label: m.lhTight, icon: ICONS.lhTight },
    { id: 'normal', label: m.lhNormal, icon: ICONS.lhNormal },
    { id: 'relaxed', label: m.lhRelaxed, icon: ICONS.lhRelaxed },
  ];

  return `
    <div class="setting-group">
      <div class="setting-label"><span>${m.theme}</span></div>
      <div class="theme-grid">
        ${themes
          .map(
            (th) => `
          <button type="button" class="theme-swatch ${p.theme === th.id ? 'is-active' : ''}" data-set-theme="${th.id}">
            <span class="theme-dot" style="background:${th.bg}; box-shadow: inset 0 0 0 4px ${th.bg}, inset 0 0 0 11px ${th.dot}22;"></span>
            <span>${th.label}</span>
          </button>`,
          )
          .join('')}
      </div>
    </div>

    <div class="setting-group">
      <div class="setting-label"><span>${m.font}</span></div>
      <div class="seg-group">
        ${fonts
          .map(
            (f) => `<button type="button" class="seg-btn ${p.font === f.id ? 'is-active' : ''}" data-set-font="${f.id}">${f.label}</button>`,
          )
          .join('')}
      </div>
    </div>

    <div class="setting-group">
      <div class="setting-label"><span>${m.fontSize}</span></div>
      <div class="stepper">
        <button type="button" class="stepper-btn" id="font-dec" aria-label="Decrease font size">A−</button>
        <span class="stepper-val" id="font-size-val">${p.fontSize}px</span>
        <button type="button" class="stepper-btn" id="font-inc" aria-label="Increase font size">A+</button>
      </div>
    </div>

    <div class="setting-group">
      <div class="setting-label">
        <span>${m.measure}</span>
        <span class="setting-label-value">${getMeasureLabel(p.measure)}</span>
      </div>
      <div class="seg-group">
        ${measures
          .map(
            (ms) => `<button type="button" class="seg-btn seg-btn-icon-only ${p.measure === ms.id ? 'is-active' : ''}" data-set-measure="${ms.id}" title="${ms.label}" aria-label="${ms.label}">${ms.icon}</button>`,
          )
          .join('')}
      </div>
    </div>

    <div class="setting-group">
      <div class="setting-label"><span>${m.lineHeight}</span></div>
      <div class="seg-group">
        ${lineHeights
          .map(
            (lh) => `<button type="button" class="seg-btn ${p.lineHeight === lh.id ? 'is-active' : ''}" data-set-lh="${lh.id}" title="${lh.label}">${lh.icon}<span>${lh.label}</span></button>`,
          )
          .join('')}
      </div>
    </div>

    <div class="setting-group">
      <button type="button" class="toggle-row ${p.focusMode ? 'is-active' : ''}" id="toggle-focus-setting">
        <div>
          <div class="toggle-row-title">${m.focusMode}</div>
          <div class="toggle-row-hint">${m.focusHint}</div>
        </div>
        <span class="toggle-pill" aria-hidden="true"></span>
      </button>
    </div>

    <div class="setting-group">
      <div class="setting-label"><span>${m.language}</span></div>
      <div class="seg-group">
        <button type="button" class="seg-btn ${p.lang === 'zh' ? 'is-active' : ''}" data-set-lang="zh">简体中文</button>
        <button type="button" class="seg-btn ${p.lang === 'en' ? 'is-active' : ''}" data-set-lang="en">English</button>
      </div>
    </div>
  `;
}

function renderDrawerBodyHtml(): string {
  const m = t();
  if (state.drawerTab === 'files' && state.bundle) {
    return `
      <div>
        ${state.bundle.docs
          .map(
            (d, idx) => `
          <button type="button" class="file-item ${state.activeDoc?.id === d.id ? 'is-active' : ''}" data-open-bundle-idx="${idx}" title="${escapeHtml(d.path)}">
            ${ICONS.file}
            <span class="file-item-text">${escapeHtml(d.path)}</span>
          </button>`,
          )
          .join('')}
      </div>`;
  }

  if (state.toc.length === 0) {
    return `<div class="drawer-empty">${m.noHeadings}</div>`;
  }

  return `
    <ul class="toc-list">
      ${state.toc
        .map(
          (item) => `
        <li>
          <a class="toc-link toc-level-${item.level}" href="#${escapeHtml(item.id)}">${escapeHtml(item.text)}</a>
        </li>`,
        )
        .join('')}
    </ul>`;
}

function renderShortcutsModalBody(): string {
  const m = t();
  return `
    <div class="shortcut-group">
      <h3 class="shortcut-group-title">${m.scGroupNav}</h3>
      <div class="shortcuts-grid">
        <div class="shortcut-row"><span>${m.scScroll}</span><span class="shortcut-keys"><kbd>J</kbd><kbd>K</kbd></span></div>
        <div class="shortcut-row"><span>${m.scHeadings}</span><span class="shortcut-keys"><kbd>N</kbd><kbd>P</kbd></span></div>
        <div class="shortcut-row"><span>${m.scTopBottom}</span><span class="shortcut-keys"><kbd>G</kbd><kbd>Shift+G</kbd></span></div>
        <div class="shortcut-row"><span>${m.scPrevNextDoc}</span><span class="shortcut-keys"><kbd>,</kbd><kbd>.</kbd></span></div>
        <div class="shortcut-row"><span>${m.scHome}</span><span class="shortcut-keys"><kbd>H</kbd></span></div>
      </div>
    </div>
    <div class="shortcut-group">
      <h3 class="shortcut-group-title">${m.scGroupView}</h3>
      <div class="shortcuts-grid">
        <div class="shortcut-row"><span>${m.scFullscreen}</span><span class="shortcut-keys"><kbd>F</kbd></span></div>
        <div class="shortcut-row"><span>${m.scFocus}</span><span class="shortcut-keys"><kbd>S</kbd></span></div>
        <div class="shortcut-row"><span>${m.scToc}</span><span class="shortcut-keys"><kbd>T</kbd></span></div>
        <div class="shortcut-row"><span>${m.scFiles}</span><span class="shortcut-keys"><kbd>B</kbd></span></div>
        <div class="shortcut-row"><span>${m.scAppearance}</span><span class="shortcut-keys"><kbd>A</kbd></span></div>
        <div class="shortcut-row"><span>${m.scChrome}</span><span class="shortcut-keys"><kbd>M</kbd></span></div>
        <div class="shortcut-row"><span>${m.scClose}</span><span class="shortcut-keys"><kbd>Esc</kbd></span></div>
      </div>
    </div>
    <div class="shortcut-group">
      <h3 class="shortcut-group-title">${m.scGroupType}</h3>
      <div class="shortcuts-grid">
        <div class="shortcut-row"><span>${m.scThemes}</span><span class="shortcut-keys"><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd><kbd>4</kbd></span></div>
        <div class="shortcut-row"><span>${m.scDarkToggle}</span><span class="shortcut-keys"><kbd>D</kbd></span></div>
        <div class="shortcut-row"><span>${m.scFontSize}</span><span class="shortcut-keys"><kbd>[</kbd><kbd>]</kbd></span></div>
        <div class="shortcut-row"><span>${m.scMeasure}</span><span class="shortcut-keys"><kbd>W</kbd></span></div>
        <div class="shortcut-row"><span>${m.scLineHeight}</span><span class="shortcut-keys"><kbd>L</kbd></span></div>
        <div class="shortcut-row"><span>${m.scFont}</span><span class="shortcut-keys"><kbd>Y</kbd></span></div>
        <div class="shortcut-row"><span>${m.scOpen}</span><span class="shortcut-keys"><kbd>O</kbd></span></div>
        <div class="shortcut-row"><span>${m.scOpenFolder}</span><span class="shortcut-keys"><kbd>Shift+O</kbd></span></div>
        <div class="shortcut-row"><span>${m.scPaste}</span><span class="shortcut-keys"><kbd>V</kbd></span></div>
        <div class="shortcut-row"><span>${m.scReload}</span><span class="shortcut-keys"><kbd>R</kbd></span></div>
      </div>
    </div>
  `;
}

function renderApp(articleHtml = '', frontmatter: Frontmatter | null = null): void {
  const root = document.getElementById('app');
  if (!root) return;
  const m = t();

  const sharedOverlays = `
    <input id="input-file" type="file" accept=".md,.markdown,.mdown,.mkd,.mdx,.txt,text/markdown,text/plain" class="sr-only" />
    <input id="input-folder" type="file" webkitdirectory directory multiple class="sr-only" />

    <div id="drop-overlay" class="drop-overlay" aria-hidden="true">
      <div class="drop-overlay-box">${m.dropOverlay}</div>
    </div>

    <div id="paste-modal" class="modal-backdrop ${state.pasteOpen ? 'is-open' : ''}">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="paste-modal-title">
        <div class="modal-header">
          <h2 class="modal-title" id="paste-modal-title">${m.pasteModalTitle}</h2>
          <button type="button" class="icon-btn" id="close-paste-modal" aria-label="${m.cancel}">${ICONS.close}</button>
        </div>
        <div class="modal-body">
          <textarea id="paste-textarea" class="paste-area" placeholder="${escapeHtml(m.pastePlaceholder)}"></textarea>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-ghost" id="cancel-paste-btn">${m.cancel}</button>
          <button type="button" class="btn btn-primary" id="confirm-paste-btn">${m.pasteConfirm}</button>
        </div>
      </div>
    </div>

    <div id="shortcuts-modal" class="modal-backdrop ${state.shortcutsOpen ? 'is-open' : ''}">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="shortcuts-modal-title">
        <div class="modal-header">
          <h2 class="modal-title" id="shortcuts-modal-title">${m.shortcutsTitle}</h2>
          <button type="button" class="icon-btn" id="close-shortcuts-modal" aria-label="${m.cancel}">${ICONS.close}</button>
        </div>
        <div class="modal-body">
          ${renderShortcutsModalBody()}
        </div>
      </div>
    </div>

    <div id="calmd-lightbox" class="lightbox" aria-hidden="true">
      <img id="calmd-lightbox-img" alt="" />
    </div>

    <div id="calmd-toast" class="toast" role="status" aria-live="polite"></div>
  `;

  if (state.view === 'landing') {
    const recentHtml =
      state.recentDocs.length > 0
        ? `
      <section class="recent-section">
        <div class="recent-header">
          <h2 class="recent-title">${m.recentTitle}</h2>
          <button type="button" class="text-link-btn" id="btn-clear-recent">${m.clearRecent}</button>
        </div>
        <ul class="recent-list">
          ${state.recentDocs
            .map(
              (doc, i) => `
            <li>
              <button type="button" class="recent-item" data-open-recent="${i}">
                <span class="recent-item-main">
                  ${ICONS.file}
                  <span class="recent-item-name">${escapeHtml(doc.name)}</span>
                </span>
                <span class="recent-item-meta">${m.wordsCount(doc.wordCount)}${
                  doc.scrollRatio > 0.03 ? ` · ${Math.round(doc.scrollRatio * 100)}%` : ''
                }</span>
              </button>
            </li>`,
            )
            .join('')}
        </ul>
      </section>`
        : '';

    root.innerHTML = `
      <main class="landing">
        <div class="landing-inner">
          <div class="landing-top">
            <div class="brand">
              ${ICONS.logo}
              <span class="brand-wordmark">Cal<span class="md-accent">MD</span></span>
            </div>
            <div class="landing-lang-row">
              <button type="button" class="pill-btn" id="btn-cycle-theme" title="${m.theme} (1–4 / D)">
                ${isDarkTheme(state.prefs.theme) ? ICONS.moon : ICONS.sun}
                <span>${getThemeLabel(state.prefs.theme)}</span>
              </button>
              <button type="button" class="pill-btn" id="btn-toggle-lang" title="${m.language}">
                ${ICONS.globe}
                <span>${state.prefs.lang === 'zh' ? 'EN' : '中文'}</span>
              </button>
            </div>
          </div>

          <p class="landing-tagline">${m.tagline}</p>

          <div class="dropzone" id="landing-dropzone">
            ${ICONS.drop}
            <h1 class="dropzone-title">${m.dropTitle}</h1>
            <p class="dropzone-hint">${m.dropHint}</p>
            <div class="dropzone-actions">
              <button type="button" class="btn btn-primary" id="btn-open-file">${ICONS.file}<span>${m.openFile}</span></button>
              <button type="button" class="btn" id="btn-open-folder">${ICONS.folder}<span>${m.openFolder}</span></button>
              <button type="button" class="btn" id="btn-open-paste">${ICONS.paste}<span>${m.pasteMd}</span></button>
            </div>
          </div>

          <div class="sample-row">
            <button type="button" class="text-link-btn" id="btn-try-sample">${ICONS.book}<span>${m.trySample}</span></button>
          </div>

          ${recentHtml}

          <footer class="landing-footer">${m.privacyNote}</footer>
        </div>
      </main>
      ${sharedOverlays}
    `;
    bindLandingEvents();
    bindSharedEvents();
    return;
  }

  const displayName = state.activeDoc?.name || 'Untitled.md';
  const hasMultipleFiles = Boolean(state.bundle && state.bundle.docs.length > 1);

  root.innerHTML = `
    <div class="progress-bar" aria-hidden="true"><div id="progress-fill" class="progress-bar-fill"></div></div>
    <div id="chrome-reveal-zone" class="chrome-reveal-zone" aria-hidden="true"></div>

    <header id="reader-bar" class="reader-bar ${state.chromeHidden ? 'is-hidden' : ''}">
      <div class="bar-left">
        <button type="button" class="icon-btn" id="btn-back-home" title="${m.backHome} (H)" aria-label="${m.backHome}">
          ${ICONS.back}
        </button>
        <button type="button" class="icon-btn ${state.drawerOpen ? 'is-active' : ''}" id="btn-toggle-drawer" title="${hasMultipleFiles ? `${m.toc} / ${m.files}` : m.toc} (T)" aria-label="${m.toc}">
          ${ICONS.toc}
        </button>
        <div class="doc-title-wrap">
          <span class="doc-title" title="${escapeHtml(displayName)}">${escapeHtml(displayName)}</span>
          <span class="doc-stats">${m.wordsCount(state.wordCount)} · ${m.readTime(state.readingMinutes)}</span>
        </div>
      </div>

      <div class="bar-right">
        <button type="button" class="icon-btn" id="btn-open-file-reader" title="${m.openFile} (O)" aria-label="${m.openFile}">
          ${ICONS.open}
        </button>
        <button type="button" class="icon-btn ${state.prefs.focusMode ? 'is-active' : ''}" id="btn-toggle-focus" title="${m.focusMode} (S)" aria-label="${m.focusMode}">
          ${ICONS.focus}
        </button>
        <button type="button" class="icon-btn ${state.settingsOpen ? 'is-active' : ''}" id="btn-toggle-settings" title="${m.appearance} (A)" aria-label="${m.appearance}">
          ${ICONS.type}
        </button>
        <button type="button" class="icon-btn ${state.isFullscreen ? 'is-active' : ''}" id="btn-fullscreen" title="${state.isFullscreen ? m.exitFullscreen : m.fullscreen} (F)" aria-label="${m.fullscreen}">
          ${state.isFullscreen ? ICONS.exitFullscreen : ICONS.fullscreen}
        </button>
        <button type="button" class="icon-btn" id="btn-shortcuts" title="${m.shortcuts} (?)" aria-label="${m.shortcuts}">
          ${ICONS.keyboard}
        </button>
      </div>
    </header>

    <div id="drawer-backdrop" class="drawer-backdrop ${state.drawerOpen ? 'is-open' : ''}"></div>
    <aside id="reader-drawer" class="drawer ${state.drawerOpen ? 'is-open' : ''}" aria-label="${m.toc}">
      <div class="drawer-header">
        <div class="drawer-tabs">
          <button type="button" class="drawer-tab ${state.drawerTab === 'toc' ? 'is-active' : ''}" data-drawer-tab="toc">${ICONS.toc}<span>${m.toc}</span></button>
          ${
            hasMultipleFiles
              ? `<button type="button" class="drawer-tab ${state.drawerTab === 'files' ? 'is-active' : ''}" data-drawer-tab="files">${ICONS.folder}<span>${m.files} (${state.bundle!.docs.length})</span></button>`
              : ''
          }
        </div>
        <button type="button" class="icon-btn" id="btn-close-drawer" aria-label="${m.cancel}">${ICONS.close}</button>
      </div>
      <div id="drawer-body" class="drawer-body">
        ${renderDrawerBodyHtml()}
      </div>
    </aside>

    <div id="settings-popover" class="popover ${state.settingsOpen ? 'is-open' : ''}" role="dialog" aria-label="${m.appearance}">
      ${renderSettingsHtml()}
    </div>

    <div class="reader-shell">
      <div class="reader-main">
        ${renderFrontmatterHtml(frontmatter)}
        <article id="reader-article" class="prose">${articleHtml}</article>
      </div>
    </div>

    ${sharedOverlays}
  `;

  bindReaderEvents();
  bindSharedEvents();
}

function bindLandingEvents(): void {
  document.getElementById('btn-open-file')?.addEventListener('click', () => {
    void triggerOpenFilePicker();
  });

  document.getElementById('btn-open-folder')?.addEventListener('click', () => {
    void triggerOpenFolderPicker();
  });

  document.getElementById('btn-open-paste')?.addEventListener('click', () => {
    openPasteModal();
  });

  document.getElementById('btn-try-sample')?.addEventListener('click', () => {
    const sample = getSampleDoc(state.prefs.lang);
    void openDocument(
      {
        id: `sample:${state.prefs.lang}`,
        name: sample.name,
        path: sample.name,
        content: sample.content,
        lastModified: Date.now(),
      },
      { bundle: null, persistRecent: false },
    );
  });

  document.getElementById('btn-toggle-lang')?.addEventListener('click', () => {
    state.prefs.lang = state.prefs.lang === 'zh' ? 'en' : 'zh';
    applyPrefsToDocument();
    renderApp();
  });

  document.getElementById('btn-cycle-theme')?.addEventListener('click', () => {
    const next = THEME_ORDER[(THEME_ORDER.indexOf(state.prefs.theme) + 1) % THEME_ORDER.length];
    applyTheme(next, false);
  });

  document.getElementById('btn-clear-recent')?.addEventListener('click', async () => {
    await clearRecentDocs();
    state.recentDocs = [];
    renderApp();
  });

  document.querySelectorAll<HTMLButtonElement>('[data-open-recent]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const idx = Number(btn.dataset.openRecent);
      const item = state.recentDocs[idx];
      if (!item) return;
      let content = item.content;
      let lastModified = item.updatedAt;
      if (item.fileHandle && (await ensureHandleReadable(item.fileHandle, true))) {
        try {
          const file = await item.fileHandle.getFile();
          content = await file.text();
          lastModified = file.lastModified || lastModified;
        } catch {
          // 磁盘文件不可达时回退到缓存
        }
      }
      await openDocument(
        {
          id: item.id,
          name: item.name,
          path: item.name,
          content,
          lastModified,
          fileHandle: item.fileHandle,
        },
        { bundle: null, restoreScrollRatio: item.scrollRatio, persistRecent: true },
      );
    });
  });
}

function setDrawerTab(tab: 'toc' | 'files'): void {
  state.drawerTab = tab;
  document.querySelectorAll<HTMLButtonElement>('[data-drawer-tab]').forEach((el) => {
    el.classList.toggle('is-active', el.dataset.drawerTab === state.drawerTab);
  });
  const body = document.getElementById('drawer-body');
  if (body) {
    body.innerHTML = renderDrawerBodyHtml();
    bindDrawerBodyEvents();
  }
}

function setDrawerOpen(open: boolean, tab?: 'toc' | 'files'): void {
  if (tab) {
    setDrawerTab(tab);
  }
  state.drawerOpen = open;
  if (open) {
    state.settingsOpen = false;
    setChromeVisible(true);
  }
  document.getElementById('reader-drawer')?.classList.toggle('is-open', open);
  document.getElementById('drawer-backdrop')?.classList.toggle('is-open', open);
  document.getElementById('btn-toggle-drawer')?.classList.toggle('is-active', open);
  document.getElementById('settings-popover')?.classList.remove('is-open');
  document.getElementById('btn-toggle-settings')?.classList.remove('is-active');
}

function setSettingsOpen(open: boolean): void {
  state.settingsOpen = open;
  if (open) {
    state.drawerOpen = false;
    setChromeVisible(true);
  }
  document.getElementById('settings-popover')?.classList.toggle('is-open', open);
  document.getElementById('btn-toggle-settings')?.classList.toggle('is-active', open);
  document.getElementById('reader-drawer')?.classList.remove('is-open');
  document.getElementById('drawer-backdrop')?.classList.remove('is-open');
  document.getElementById('btn-toggle-drawer')?.classList.remove('is-active');
}

function bindSettingsEvents(): void {
  const pop = document.getElementById('settings-popover');
  if (!pop) return;

  pop.querySelectorAll<HTMLButtonElement>('[data-set-theme]').forEach((btn) => {
    btn.addEventListener('click', () => {
      applyTheme(btn.dataset.setTheme as ThemeId, false);
    });
  });

  pop.querySelectorAll<HTMLButtonElement>('[data-set-font]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.prefs.font = btn.dataset.setFont as FontId;
      applyPrefsToDocument();
      refreshSettingsPopover();
    });
  });

  pop.querySelectorAll<HTMLButtonElement>('[data-set-measure]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.prefs.measure = btn.dataset.setMeasure as MeasureId;
      applyPrefsToDocument();
      refreshSettingsPopover();
    });
  });

  pop.querySelectorAll<HTMLButtonElement>('[data-set-lh]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.prefs.lineHeight = btn.dataset.setLh as LineHeightId;
      applyPrefsToDocument();
      refreshSettingsPopover();
    });
  });

  pop.querySelector('#font-dec')?.addEventListener('click', () => adjustFontSize(-1, false));
  pop.querySelector('#font-inc')?.addEventListener('click', () => adjustFontSize(1, false));

  pop.querySelector('#toggle-focus-setting')?.addEventListener('click', () => {
    toggleFocusMode(false);
  });

  pop.querySelectorAll<HTMLButtonElement>('[data-set-lang]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.prefs.lang = btn.dataset.setLang as 'zh' | 'en';
      applyPrefsToDocument();
      rerenderActiveDocument();
    });
  });
}

function adjustFontSize(delta: number, notify = true): void {
  const next = Math.min(24, Math.max(15, state.prefs.fontSize + delta));
  state.prefs.fontSize = next;
  applyPrefsToDocument();
  const val = document.getElementById('font-size-val');
  if (val) val.textContent = `${state.prefs.fontSize}px`;
  if (notify) {
    showToast(`${t().fontSize} · ${next}px`, 1200);
  }
}

function toggleFocusMode(notify = true): void {
  state.prefs.focusMode = !state.prefs.focusMode;
  applyPrefsToDocument();
  document.getElementById('btn-toggle-focus')?.classList.toggle('is-active', state.prefs.focusMode);
  refreshSettingsPopover();
  if (notify) {
    showToast(`${t().focusMode} · ${state.prefs.focusMode ? 'ON' : 'OFF'}`, 1400);
  }
}

function bindDrawerBodyEvents(): void {
  const body = document.getElementById('drawer-body');
  if (!body) return;

  body.querySelectorAll<HTMLAnchorElement>('.toc-link').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href')?.slice(1);
      if (targetId) {
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      setDrawerOpen(false);
    });
  });

  body.querySelectorAll<HTMLButtonElement>('[data-open-bundle-idx]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.openBundleIdx);
      const doc = state.bundle?.docs[idx];
      if (!doc) return;
      void openDocument(doc, { bundle: state.bundle, persistRecent: false });
    });
  });
}

function handleArticleLinkClick(link: HTMLAnchorElement, e: MouseEvent): void {
  const href = link.getAttribute('href') || '';
  if (!href || /^(?:https?:|mailto:|tel:)/i.test(href)) return;

  if (href.startsWith('#')) {
    e.preventDefault();
    let targetId = href.slice(1);
    try {
      targetId = decodeURIComponent(targetId);
    } catch {
      // keep raw
    }
    document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  const [pathPart, hashPart] = href.split('#');
  const cleanPath = pathPart.split('?')[0];
  let decodedName = cleanPath;
  try {
    decodedName = decodeURIComponent(cleanPath);
  } catch {
    // keep raw
  }

  if (isMarkdownFileName(decodedName)) {
    e.preventDefault();
    if (state.bundle && state.activeDoc) {
      const linked = state.bundle.resolveDoc(state.activeDoc.path, cleanPath);
      if (linked) {
        let targetHash = hashPart;
        if (targetHash) {
          try {
            targetHash = decodeURIComponent(targetHash);
          } catch {
            // keep raw
          }
        }
        void openDocument(linked, {
          bundle: state.bundle,
          persistRecent: false,
          targetHash,
        });
        return;
      }
    }
    showToast(t().missingLinkedDoc(decodedName), 3200);
  }
}

function bindReaderEvents(): void {
  document.getElementById('btn-back-home')?.addEventListener('click', goHome);
  document.getElementById('btn-toggle-drawer')?.addEventListener('click', () => {
    setDrawerOpen(!state.drawerOpen);
  });
  document.getElementById('btn-close-drawer')?.addEventListener('click', () => setDrawerOpen(false));
  document.getElementById('drawer-backdrop')?.addEventListener('click', () => setDrawerOpen(false));

  document.querySelectorAll<HTMLButtonElement>('[data-drawer-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      setDrawerTab(tab.dataset.drawerTab as 'toc' | 'files');
    });
  });

  document.getElementById('btn-open-file-reader')?.addEventListener('click', () => {
    void triggerOpenFilePicker();
  });

  document.getElementById('btn-toggle-settings')?.addEventListener('click', (e) => {
    e.stopPropagation();
    setSettingsOpen(!state.settingsOpen);
  });

  document.getElementById('btn-toggle-focus')?.addEventListener('click', () => {
    toggleFocusMode(false);
  });

  document.getElementById('btn-fullscreen')?.addEventListener('click', toggleFullscreen);
  document.getElementById('btn-shortcuts')?.addEventListener('click', () => setShortcutsOpen(true));

  const revealZone = document.getElementById('chrome-reveal-zone');
  const bar = document.getElementById('reader-bar');
  revealZone?.addEventListener('mouseenter', () => {
    setChromeVisible(true);
    scheduleChromeHide();
  });
  bar?.addEventListener('mouseenter', () => {
    if (hideTimer !== null) window.clearTimeout(hideTimer);
  });
  bar?.addEventListener('mouseleave', () => scheduleChromeHide());

  // 代码图标复制、相对文档链接跳转与图片 Lightbox
  const article = document.getElementById('reader-article');
  article?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    const copyBtn = target.closest<HTMLButtonElement>('[data-copy-code]');
    if (copyBtn) {
      const code = copyBtn.closest('.code-block')?.querySelector('pre code')?.textContent || '';
      void navigator.clipboard?.writeText(code).then(() => {
        copyBtn.innerHTML = ICONS.check;
        copyBtn.classList.add('is-copied');
        copyBtn.setAttribute('aria-label', t().copied);
        copyBtn.setAttribute('title', t().copied);
        window.setTimeout(() => {
          copyBtn.innerHTML = ICONS.copy;
          copyBtn.classList.remove('is-copied');
          copyBtn.setAttribute('aria-label', t().copy);
          copyBtn.setAttribute('title', t().copy);
        }, 1400);
      });
      return;
    }

    const link = target.closest<HTMLAnchorElement>('a[href]');
    if (link) {
      handleArticleLinkClick(link, e);
      return;
    }

    const img = target.closest<HTMLImageElement>('img.readable-img');
    if (img && img.src) {
      openLightbox(img.src, img.alt);
    }
  });

  bindDrawerBodyEvents();
  bindSettingsEvents();
}

function openPasteModal(): void {
  state.pasteOpen = true;
  const modal = document.getElementById('paste-modal');
  modal?.classList.add('is-open');
  window.setTimeout(() => {
    (document.getElementById('paste-textarea') as HTMLTextAreaElement | null)?.focus();
  }, 40);
}

function closePasteModal(): void {
  state.pasteOpen = false;
  document.getElementById('paste-modal')?.classList.remove('is-open');
}

function submitPasteModal(): void {
  const area = document.getElementById('paste-textarea') as HTMLTextAreaElement | null;
  const text = area?.value.trim() || '';
  if (!text) return;
  closePasteModal();
  const firstHeading = text.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const name = firstHeading ? `${firstHeading.slice(0, 40)}.md` : 'Pasted.md';
  void openDocument(
    {
      id: `paste:${Date.now()}`,
      name,
      path: name,
      content: text,
      lastModified: Date.now(),
    },
    { bundle: null, persistRecent: true },
  );
}

function setShortcutsOpen(open: boolean): void {
  state.shortcutsOpen = open;
  document.getElementById('shortcuts-modal')?.classList.toggle('is-open', open);
}

function openLightbox(src: string, alt: string): void {
  const lb = document.getElementById('calmd-lightbox');
  const img = document.getElementById('calmd-lightbox-img') as HTMLImageElement | null;
  if (!lb || !img) return;
  img.src = src;
  img.alt = alt;
  lb.classList.add('is-open');
  lb.setAttribute('aria-hidden', 'false');
}

function closeLightbox(): void {
  const lb = document.getElementById('calmd-lightbox');
  if (!lb) return;
  lb.classList.remove('is-open');
  lb.setAttribute('aria-hidden', 'true');
}

function bindSharedEvents(): void {
  const fileInput = document.getElementById('input-file') as HTMLInputElement | null;
  fileInput?.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length > 0) {
      void handleFileInput(fileInput.files);
      fileInput.value = '';
    }
  });

  const folderInput = document.getElementById('input-folder') as HTMLInputElement | null;
  folderInput?.addEventListener('change', () => {
    if (folderInput.files && folderInput.files.length > 0) {
      void handleFileInput(folderInput.files);
      folderInput.value = '';
    }
  });

  document.getElementById('close-paste-modal')?.addEventListener('click', closePasteModal);
  document.getElementById('cancel-paste-btn')?.addEventListener('click', closePasteModal);
  document.getElementById('paste-modal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closePasteModal();
  });
  document.getElementById('confirm-paste-btn')?.addEventListener('click', submitPasteModal);

  document.getElementById('close-shortcuts-modal')?.addEventListener('click', () => {
    setShortcutsOpen(false);
  });
  document.getElementById('shortcuts-modal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) setShortcutsOpen(false);
  });

  document.getElementById('calmd-lightbox')?.addEventListener('click', closeLightbox);
}

function bindGlobalEvents(): void {
  window.addEventListener('scroll', updateProgressAndScrollSave, { passive: true });

  document.addEventListener('fullscreenchange', () => {
    state.isFullscreen = Boolean(document.fullscreenElement);
    document.body.classList.toggle('is-fullscreen', state.isFullscreen);
    syncFullscreenButton();
    if (!state.isFullscreen) {
      setChromeVisible(true);
    }
  });

  // 点击空白处关闭排版浮层
  document.addEventListener('click', (e) => {
    if (!state.settingsOpen) return;
    const target = e.target as Node;
    const pop = document.getElementById('settings-popover');
    const btn = document.getElementById('btn-toggle-settings');
    if (pop && !pop.contains(target) && btn && !btn.contains(target)) {
      setSettingsOpen(false);
    }
  });

  // 全局拖拽导入（首页和阅读态均支持直接拖新文档切换）
  window.addEventListener('dragenter', (e) => {
    if (!e.dataTransfer?.types.includes('Files')) return;
    e.preventDefault();
    dragDepth++;
    document.getElementById('drop-overlay')?.classList.add('is-visible');
    document.getElementById('landing-dropzone')?.classList.add('is-dragover');
  });

  window.addEventListener('dragover', (e) => {
    if (!e.dataTransfer?.types.includes('Files')) return;
    e.preventDefault();
  });

  window.addEventListener('dragleave', (e) => {
    if (!e.dataTransfer?.types.includes('Files')) return;
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) {
      document.getElementById('drop-overlay')?.classList.remove('is-visible');
      document.getElementById('landing-dropzone')?.classList.remove('is-dragover');
    }
  });

  window.addEventListener('drop', async (e) => {
    e.preventDefault();
    dragDepth = 0;
    document.getElementById('drop-overlay')?.classList.remove('is-visible');
    document.getElementById('landing-dropzone')?.classList.remove('is-dragover');
    if (!e.dataTransfer) return;
    const files = await extractFilesFromDataTransfer(e.dataTransfer);
    await handleFileInput(files);
  });

  // 首页直接 Cmd/Ctrl + V 粘贴 Markdown 开始阅读
  window.addEventListener('paste', (e) => {
    if (state.view !== 'landing' || state.pasteOpen) return;
    const activeTag = (document.activeElement?.tagName || '').toLowerCase();
    if (activeTag === 'textarea' || activeTag === 'input') return;
    const text = e.clipboardData?.getData('text/plain')?.trim();
    if (!text) return;
    e.preventDefault();
    const firstHeading = text.match(/^#\s+(.+)$/m)?.[1]?.trim();
    const name = firstHeading ? `${firstHeading.slice(0, 40)}.md` : 'Pasted.md';
    void openDocument(
      {
        id: `paste:${Date.now()}`,
        name,
        path: name,
        content: text,
        lastModified: Date.now(),
      },
      { bundle: null, persistRecent: true },
    );
  });

  // 全键盘单键控制（输入态与系统修饰键自动静默，零冲突）
  window.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement as HTMLElement | null;
    const tag = (activeEl?.tagName || '').toLowerCase();
    if (tag === 'textarea' || tag === 'input' || tag === 'select' || activeEl?.isContentEditable) {
      if (e.key === 'Escape') {
        closePasteModal();
      } else if (state.pasteOpen && (e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        submitPasteModal();
      }
      return;
    }

    if (e.key === 'Escape') {
      const lb = document.getElementById('calmd-lightbox');
      if (lb?.classList.contains('is-open')) {
        closeLightbox();
      } else if (state.shortcutsOpen) {
        setShortcutsOpen(false);
      } else if (state.pasteOpen) {
        closePasteModal();
      } else if (state.settingsOpen) {
        setSettingsOpen(false);
      } else if (state.drawerOpen) {
        setDrawerOpen(false);
      } else if (state.isFullscreen && !document.fullscreenElement) {
        state.isFullscreen = false;
        document.body.classList.remove('is-fullscreen');
        syncFullscreenButton();
        setChromeVisible(true);
      }
      return;
    }

    if (e.metaKey || e.ctrlKey || e.altKey) return;

    // 弹窗打开时只允许 ? 关闭快捷键弹窗
    if (state.pasteOpen) return;
    if (state.shortcutsOpen) {
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShortcutsOpen(false);
      }
      return;
    }

    const k = e.key.toLowerCase();

    // 全局单键（首页与阅读态均可用）
    if (k === 'o') {
      e.preventDefault();
      if (e.shiftKey) {
        void triggerOpenFolderPicker();
      } else {
        void triggerOpenFilePicker();
      }
      return;
    }
    if (k === 'v') {
      e.preventDefault();
      openPasteModal();
      return;
    }
    if (e.key === '?' || (e.shiftKey && e.key === '/')) {
      e.preventDefault();
      setShortcutsOpen(!state.shortcutsOpen);
      return;
    }
    if (['1', '2', '3', '4'].includes(e.key)) {
      e.preventDefault();
      applyTheme(THEME_ORDER[Number(e.key) - 1], state.view === 'reader');
      return;
    }
    if (k === 'd') {
      e.preventDefault();
      toggleDayDarkTheme();
      return;
    }

    if (state.view !== 'reader') return;

    // 阅读态全单键控制
    if (k === 'f') {
      e.preventDefault();
      toggleFullscreen();
    } else if (k === 't') {
      e.preventDefault();
      if (state.drawerOpen && state.drawerTab === 'toc') {
        setDrawerOpen(false);
      } else {
        setDrawerOpen(true, 'toc');
      }
    } else if (k === 'b') {
      e.preventDefault();
      if (state.bundle && state.bundle.docs.length > 1) {
        if (state.drawerOpen && state.drawerTab === 'files') {
          setDrawerOpen(false);
        } else {
          setDrawerOpen(true, 'files');
        }
      } else {
        setDrawerOpen(!state.drawerOpen, 'toc');
      }
    } else if (k === 'a') {
      e.preventDefault();
      setSettingsOpen(!state.settingsOpen);
    } else if (k === 's') {
      e.preventDefault();
      toggleFocusMode(true);
    } else if (k === 'm') {
      e.preventDefault();
      const show = state.chromeHidden;
      setChromeVisible(show);
      if (show && hideTimer !== null) window.clearTimeout(hideTimer);
    } else if (k === 'h') {
      e.preventDefault();
      goHome();
    } else if (k === 'r') {
      e.preventDefault();
      void triggerManualReloadOrResume();
    } else if (e.key === '[' || e.key === '-') {
      e.preventDefault();
      adjustFontSize(-1, true);
    } else if (e.key === ']' || e.key === '=') {
      e.preventDefault();
      adjustFontSize(1, true);
    } else if (k === 'w') {
      e.preventDefault();
      cycleMeasure(e.shiftKey ? -1 : 1);
    } else if (k === 'l') {
      e.preventDefault();
      cycleLineHeight();
    } else if (k === 'y') {
      e.preventDefault();
      cycleFont();
    } else if (k === 'j') {
      e.preventDefault();
      window.scrollBy({ top: 240, behavior: 'smooth' });
    } else if (k === 'k') {
      e.preventDefault();
      window.scrollBy({ top: -240, behavior: 'smooth' });
    } else if (k === 'n') {
      e.preventDefault();
      jumpHeading(1);
    } else if (k === 'p') {
      e.preventDefault();
      jumpHeading(-1);
    } else if (k === 'g') {
      e.preventDefault();
      if (e.shiftKey) {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else if (e.key === ',') {
      e.preventDefault();
      stepBundleDocument(-1);
    } else if (e.key === '.') {
      e.preventDefault();
      stepBundleDocument(1);
    }
  });
}

async function init(): Promise<void> {
  applyPrefsToDocument();
  state.recentDocs = await listRecentDocs();
  bindGlobalEvents();

  const session = await loadActiveSession();
  if (session) {
    let content = session.content;
    let lastModified = session.lastModified;
    if (session.fileHandle && (await ensureHandleReadable(session.fileHandle, false))) {
      try {
        const file = await session.fileHandle.getFile();
        content = await file.text();
        lastModified = file.lastModified || lastModified;
      } catch {
        // 磁盘文件不可达时回退到会话缓存正文
      }
    }
    const restoreScrollRatio = loadSessionScroll(session.id) ?? session.scrollRatio;
    await openDocument(
      {
        id: session.id,
        name: session.name,
        path: session.path,
        content,
        lastModified,
        fileHandle: session.fileHandle,
      },
      { bundle: null, restoreScrollRatio, persistRecent: false },
    );
    return;
  }

  renderApp();
}

void init();

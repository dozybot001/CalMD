import 'katex/dist/katex.min.css';
import './styles/tokens.css';
import './styles/prose.css';
import './styles/app.css';

import { dictionaries, type Messages } from './core/i18n';
import { renderMarkdown, type Frontmatter, type TocItem } from './core/markdown';
import { renderMermaidBlocks } from './core/mermaid';
import {
  buildBundleFromFiles,
  extractFilesFromDataTransfer,
  type DocumentBundle,
  type LocalDoc,
} from './core/files';
import {
  clearRecentDocs,
  listRecentDocs,
  loadPrefs,
  savePrefs,
  saveRecentDoc,
  updateRecentScroll,
  type FontId,
  type MeasureId,
  type ReaderPrefs,
  type RecentDoc,
  type ThemeId,
} from './core/storage';
import { getSampleDoc } from './core/sample';

const MEASURE_MAP: Record<MeasureId, string> = {
  narrow: '58ch',
  standard: '70ch',
  wide: '86ch',
};

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
  back: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>`,
  toc: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h16M4 12h11M4 18h7"/></svg>`,
  type: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7V5h16v2M12 5v14M9 19h6"/></svg>`,
  focus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/></svg>`,
  fullscreen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`,
  exitFullscreen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>`,
  help: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.2a2.6 2.6 0 0 1 5 1c0 1.8-2.5 2.2-2.5 3.6"/><circle cx="12" cy="17.2" r="0.6" fill="currentColor"/></svg>`,
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
}

const state: AppState = {
  prefs: loadPrefs(),
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
};

let hideTimer: number | null = null;
let toastTimer: number | null = null;
let scrollSaveTimer: number | null = null;
let headingObserver: IntersectionObserver | null = null;
let focusObserver: IntersectionObserver | null = null;
let dragDepth = 0;

function t(): Messages {
  return dictionaries[state.prefs.lang];
}

function isDarkTheme(theme: ThemeId): boolean {
  return theme === 'mist' || theme === 'ink';
}

function applyPrefsToDocument(): void {
  const root = document.documentElement;
  root.lang = state.prefs.lang === 'zh' ? 'zh-CN' : 'en';
  root.dataset.theme = state.prefs.theme;
  root.dataset.font = state.prefs.font;
  root.style.setProperty('--reader-size', `${state.prefs.fontSize}px`);
  root.style.setProperty('--reader-line-height', String(state.prefs.lineHeight));
  root.style.setProperty('--reader-measure', MEASURE_MAP[state.prefs.measure]);
  document.body.classList.toggle('focus-mode', state.prefs.focusMode);
  savePrefs(state.prefs);
}

function showToast(msg: string, duration = 2200): void {
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

function updateProgressAndScrollSave(): void {
  if (state.view !== 'reader') return;
  const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = scrollHeight > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollHeight)) : 0;

  const fill = document.getElementById('progress-fill');
  if (fill) {
    fill.style.width = `${(ratio * 100).toFixed(2)}%`;
  }

  const dy = window.scrollY - state.lastScrollY;
  state.lastScrollY = window.scrollY;

  if (dy > 14 && window.scrollY > 80 && !state.settingsOpen && !state.drawerOpen) {
    setChromeVisible(false);
  } else if (dy < -24 || window.scrollY <= 36) {
    setChromeVisible(true);
    scheduleChromeHide();
  }

  if (state.activeDoc && !state.bundle) {
    if (scrollSaveTimer !== null) window.clearTimeout(scrollSaveTimer);
    const docId = state.activeDoc.id;
    scrollSaveTimer = window.setTimeout(() => {
      void updateRecentScroll(docId, ratio);
    }, 500);
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
          // 降级为 Zen 全视口沉浸模式
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
  btn.title = state.isFullscreen ? m.exitFullscreen : m.fullscreen;
  btn.innerHTML =
    (state.isFullscreen ? ICONS.exitFullscreen : ICONS.fullscreen) +
    `<span class="icon-btn-label">${state.isFullscreen ? m.exitFullscreen : m.fullscreen}</span>`;
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
      { rootMargin: '-32% 0px -32% 0px', threshold: 0.05 },
    );
    blocks.forEach((b) => focusObserver?.observe(b));
  }
}

async function openDocument(
  doc: LocalDoc,
  options: { bundle?: DocumentBundle | null; restoreScrollRatio?: number; persistRecent?: boolean } = {},
): Promise<void> {
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

  if (options.persistRecent !== false && !state.bundle) {
    await saveRecentDoc({
      id: doc.id,
      name: doc.name,
      content: doc.content,
      updatedAt: Date.now(),
      scrollRatio: options.restoreScrollRatio ?? 0,
      wordCount: rendered.wordCount,
    });
    state.recentDocs = await listRecentDocs();
  }

  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  if (options.restoreScrollRatio && options.restoreScrollRatio > 0.01) {
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

async function handleFileInput(files: FileList | File[], rootLabel?: string): Promise<void> {
  const arr = Array.from(files);
  if (arr.length === 0) return;

  const isMultiOrFolder =
    arr.length > 1 ||
    arr.some((f) => Boolean((f as File & { webkitRelativePath?: string }).webkitRelativePath?.includes('/')));

  if (!isMultiOrFolder) {
    const file = arr[0];
    if (!/\.(?:md|markdown|mdown|mkd|mdx|txt)$/i.test(file.name)) {
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

  const measures: Array<{ id: MeasureId; label: string }> = [
    { id: 'narrow', label: m.measureNarrow },
    { id: 'standard', label: m.measureStandard },
    { id: 'wide', label: m.measureWide },
  ];

  const heights = [1.65, 1.85, 2.05];

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
      <div class="setting-label"><span>${m.measure}</span></div>
      <div class="seg-group">
        ${measures
          .map(
            (ms) => `<button type="button" class="seg-btn ${p.measure === ms.id ? 'is-active' : ''}" data-set-measure="${ms.id}">${ms.label}</button>`,
          )
          .join('')}
      </div>
    </div>

    <div class="setting-group">
      <div class="setting-label"><span>${m.lineHeight}</span></div>
      <div class="seg-group">
        ${heights
          .map(
            (lh) => `<button type="button" class="seg-btn ${p.lineHeight === lh ? 'is-active' : ''}" data-set-lh="${lh}">${lh}</button>`,
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
            ${escapeHtml(d.path)}
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
          <div class="shortcuts-grid">
            <div class="shortcut-row"><span>${m.scFullscreen}</span><kbd>F</kbd></div>
            <div class="shortcut-row"><span>${m.scToc}</span><kbd>T</kbd></div>
            <div class="shortcut-row"><span>${m.scAppearance}</span><kbd>A</kbd></div>
            <div class="shortcut-row"><span>${m.scFocus}</span><kbd>S</kbd></div>
            <div class="shortcut-row"><span>${m.scOpen}</span><kbd>O</kbd></div>
            <div class="shortcut-row"><span>${m.scFontSize}</span><span><kbd>[</kbd> / <kbd>]</kbd></span></div>
            <div class="shortcut-row"><span>${m.scThemes}</span><span><kbd>1</kbd> – <kbd>4</kbd></span></div>
            <div class="shortcut-row"><span>${m.scClose}</span><kbd>Esc</kbd></div>
          </div>
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
                <span class="recent-item-name">${escapeHtml(doc.name)}</span>
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
              <button type="button" class="pill-btn" id="btn-cycle-theme">${
                state.prefs.theme === 'paper'
                  ? m.themePaper
                  : state.prefs.theme === 'sepia'
                    ? m.themeSepia
                    : state.prefs.theme === 'mist'
                      ? m.themeMist
                      : m.themeInk
              }</button>
              <button type="button" class="pill-btn" id="btn-toggle-lang">${state.prefs.lang === 'zh' ? 'EN' : '中文'}</button>
            </div>
          </div>

          <p class="landing-tagline">${m.tagline}</p>

          <div class="dropzone" id="landing-dropzone">
            ${ICONS.drop}
            <h1 class="dropzone-title">${m.dropTitle}</h1>
            <p class="dropzone-hint">${m.dropHint}</p>
            <div class="dropzone-actions">
              <button type="button" class="btn btn-primary" id="btn-open-file">${m.openFile}</button>
              <button type="button" class="btn" id="btn-open-folder">${m.openFolder}</button>
              <button type="button" class="btn" id="btn-open-paste">${m.pasteMd}</button>
            </div>
          </div>

          <div class="sample-row">
            <button type="button" class="text-link-btn" id="btn-try-sample">${m.trySample} →</button>
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
        <button type="button" class="icon-btn" id="btn-back-home" title="${m.backHome}" aria-label="${m.backHome}">
          ${ICONS.back}
        </button>
        <button type="button" class="icon-btn ${state.drawerOpen ? 'is-active' : ''}" id="btn-toggle-drawer" title="${m.toc} (T)" aria-label="${m.toc}">
          ${ICONS.toc}
          <span class="icon-btn-label">${hasMultipleFiles ? `${m.toc} / ${m.files}` : m.toc}</span>
        </button>
        <div class="doc-title-wrap">
          <span class="doc-title" title="${escapeHtml(displayName)}">${escapeHtml(displayName)}</span>
          <span class="doc-stats">${m.wordsCount(state.wordCount)} · ${m.readTime(state.readingMinutes)}</span>
        </div>
      </div>

      <div class="bar-right">
        <button type="button" class="icon-btn ${state.prefs.focusMode ? 'is-active' : ''}" id="btn-toggle-focus" title="${m.focusMode} (S)" aria-label="${m.focusMode}">
          ${ICONS.focus}
        </button>
        <button type="button" class="icon-btn ${state.settingsOpen ? 'is-active' : ''}" id="btn-toggle-settings" title="${m.appearance} (A)" aria-label="${m.appearance}">
          ${ICONS.type}
          <span class="icon-btn-label">${m.appearance}</span>
        </button>
        <button type="button" class="icon-btn ${state.isFullscreen ? 'is-active' : ''}" id="btn-fullscreen" title="${state.isFullscreen ? m.exitFullscreen : m.fullscreen} (F)" aria-label="${m.fullscreen}">
          ${state.isFullscreen ? ICONS.exitFullscreen : ICONS.fullscreen}
          <span class="icon-btn-label">${state.isFullscreen ? m.exitFullscreen : m.fullscreen}</span>
        </button>
        <button type="button" class="icon-btn" id="btn-shortcuts" title="${m.shortcuts} (?)" aria-label="${m.shortcuts}">
          ${ICONS.help}
        </button>
      </div>
    </header>

    <div id="drawer-backdrop" class="drawer-backdrop ${state.drawerOpen ? 'is-open' : ''}"></div>
    <aside id="reader-drawer" class="drawer ${state.drawerOpen ? 'is-open' : ''}" aria-label="${m.toc}">
      <div class="drawer-header">
        <div class="drawer-tabs">
          <button type="button" class="drawer-tab ${state.drawerTab === 'toc' ? 'is-active' : ''}" data-drawer-tab="toc">${m.toc}</button>
          ${
            hasMultipleFiles
              ? `<button type="button" class="drawer-tab ${state.drawerTab === 'files' ? 'is-active' : ''}" data-drawer-tab="files">${m.files} (${state.bundle!.docs.length})</button>`
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
    (document.getElementById('input-file') as HTMLInputElement | null)?.click();
  });

  document.getElementById('btn-open-folder')?.addEventListener('click', () => {
    (document.getElementById('input-folder') as HTMLInputElement | null)?.click();
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
    const order: ThemeId[] = ['paper', 'sepia', 'mist', 'ink'];
    const next = order[(order.indexOf(state.prefs.theme) + 1) % order.length];
    state.prefs.theme = next;
    applyPrefsToDocument();
    renderApp();
  });

  document.getElementById('btn-clear-recent')?.addEventListener('click', async () => {
    await clearRecentDocs();
    state.recentDocs = [];
    renderApp();
  });

  document.querySelectorAll<HTMLButtonElement>('[data-open-recent]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.openRecent);
      const item = state.recentDocs[idx];
      if (!item) return;
      void openDocument(
        {
          id: item.id,
          name: item.name,
          path: item.name,
          content: item.content,
          lastModified: item.updatedAt,
        },
        { bundle: null, restoreScrollRatio: item.scrollRatio, persistRecent: true },
      );
    });
  });
}

function setDrawerOpen(open: boolean): void {
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
      const prevDark = isDarkTheme(state.prefs.theme);
      state.prefs.theme = btn.dataset.setTheme as ThemeId;
      applyPrefsToDocument();
      pop.innerHTML = renderSettingsHtml();
      bindSettingsEvents();
      if (state.hasMermaid && prevDark !== isDarkTheme(state.prefs.theme)) {
        rerenderActiveDocument();
      }
    });
  });

  pop.querySelectorAll<HTMLButtonElement>('[data-set-font]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.prefs.font = btn.dataset.setFont as FontId;
      applyPrefsToDocument();
      pop.innerHTML = renderSettingsHtml();
      bindSettingsEvents();
    });
  });

  pop.querySelectorAll<HTMLButtonElement>('[data-set-measure]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.prefs.measure = btn.dataset.setMeasure as MeasureId;
      applyPrefsToDocument();
      pop.innerHTML = renderSettingsHtml();
      bindSettingsEvents();
    });
  });

  pop.querySelectorAll<HTMLButtonElement>('[data-set-lh]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.prefs.lineHeight = Number(btn.dataset.setLh);
      applyPrefsToDocument();
      pop.innerHTML = renderSettingsHtml();
      bindSettingsEvents();
    });
  });

  pop.querySelector('#font-dec')?.addEventListener('click', () => adjustFontSize(-1));
  pop.querySelector('#font-inc')?.addEventListener('click', () => adjustFontSize(1));

  pop.querySelector('#toggle-focus-setting')?.addEventListener('click', () => {
    toggleFocusMode();
    pop.innerHTML = renderSettingsHtml();
    bindSettingsEvents();
  });

  pop.querySelectorAll<HTMLButtonElement>('[data-set-lang]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.prefs.lang = btn.dataset.setLang as 'zh' | 'en';
      applyPrefsToDocument();
      rerenderActiveDocument();
    });
  });
}

function adjustFontSize(delta: number): void {
  state.prefs.fontSize = Math.min(24, Math.max(15, state.prefs.fontSize + delta));
  applyPrefsToDocument();
  const val = document.getElementById('font-size-val');
  if (val) val.textContent = `${state.prefs.fontSize}px`;
}

function toggleFocusMode(): void {
  state.prefs.focusMode = !state.prefs.focusMode;
  applyPrefsToDocument();
  document.getElementById('btn-toggle-focus')?.classList.toggle('is-active', state.prefs.focusMode);
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

function bindReaderEvents(): void {
  document.getElementById('btn-back-home')?.addEventListener('click', goHome);
  document.getElementById('btn-toggle-drawer')?.addEventListener('click', () => {
    setDrawerOpen(!state.drawerOpen);
  });
  document.getElementById('btn-close-drawer')?.addEventListener('click', () => setDrawerOpen(false));
  document.getElementById('drawer-backdrop')?.addEventListener('click', () => setDrawerOpen(false));

  document.querySelectorAll<HTMLButtonElement>('[data-drawer-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      state.drawerTab = tab.dataset.drawerTab as 'toc' | 'files';
      document.querySelectorAll<HTMLButtonElement>('[data-drawer-tab]').forEach((el) => {
        el.classList.toggle('is-active', el.dataset.drawerTab === state.drawerTab);
      });
      const body = document.getElementById('drawer-body');
      if (body) {
        body.innerHTML = renderDrawerBodyHtml();
        bindDrawerBodyEvents();
      }
    });
  });

  document.getElementById('btn-toggle-settings')?.addEventListener('click', (e) => {
    e.stopPropagation();
    setSettingsOpen(!state.settingsOpen);
  });

  document.getElementById('btn-toggle-focus')?.addEventListener('click', () => {
    toggleFocusMode();
    const pop = document.getElementById('settings-popover');
    if (pop) {
      pop.innerHTML = renderSettingsHtml();
      bindSettingsEvents();
    }
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

  // 代码复制 & 图片 Lightbox
  const article = document.getElementById('reader-article');
  article?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    const copyBtn = target.closest<HTMLButtonElement>('[data-copy-code]');
    if (copyBtn) {
      const code = copyBtn.closest('.code-block')?.querySelector('pre code')?.textContent || '';
      void navigator.clipboard?.writeText(code).then(() => {
        copyBtn.textContent = t().copied;
        window.setTimeout(() => {
          copyBtn.textContent = t().copy;
        }, 1400);
      });
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
  document.getElementById('confirm-paste-btn')?.addEventListener('click', () => {
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
  });

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

  // 键盘快捷键
  window.addEventListener('keydown', (e) => {
    const tag = (document.activeElement?.tagName || '').toLowerCase();
    if (tag === 'textarea' || tag === 'input') {
      if (e.key === 'Escape') closePasteModal();
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

    const k = e.key.toLowerCase();
    if (k === 'o') {
      e.preventDefault();
      (document.getElementById('input-file') as HTMLInputElement | null)?.click();
      return;
    }

    if (state.view !== 'reader') return;

    if (k === 'f') {
      e.preventDefault();
      toggleFullscreen();
    } else if (k === 't') {
      e.preventDefault();
      setDrawerOpen(!state.drawerOpen);
    } else if (k === 'a') {
      e.preventDefault();
      setSettingsOpen(!state.settingsOpen);
    } else if (k === 's') {
      e.preventDefault();
      toggleFocusMode();
    } else if (e.key === '[') {
      e.preventDefault();
      adjustFontSize(-1);
    } else if (e.key === ']') {
      e.preventDefault();
      adjustFontSize(1);
    } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
      e.preventDefault();
      setShortcutsOpen(!state.shortcutsOpen);
    } else if (['1', '2', '3', '4'].includes(e.key)) {
      const order: ThemeId[] = ['paper', 'sepia', 'mist', 'ink'];
      const prevDark = isDarkTheme(state.prefs.theme);
      state.prefs.theme = order[Number(e.key) - 1];
      applyPrefsToDocument();
      const pop = document.getElementById('settings-popover');
      if (pop) {
        pop.innerHTML = renderSettingsHtml();
        bindSettingsEvents();
      }
      if (state.hasMermaid && prevDark !== isDarkTheme(state.prefs.theme)) {
        rerenderActiveDocument();
      }
    }
  });
}

async function init(): Promise<void> {
  applyPrefsToDocument();
  state.recentDocs = await listRecentDocs();
  renderApp();
  bindGlobalEvents();
}

void init();

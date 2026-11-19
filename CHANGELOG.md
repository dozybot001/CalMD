# Changelog

## Unreleased

- **CommonMark / GFM fidelity**: Disabled `typographer` auto-replacements (preventing mutations like `Q3(c)` -> `Q3©` and altered quotes), fixed frontmatter parsing not to swallow prose between `---` horizontal rules, improved AST-based heading/TOC extraction (preserving underscores and stripping raw link syntax), unified indented and fenced code blocks without fabricated `text` labels, fixed loose/nested task lists, strict GFM alert parsing, natural table header wrapping, inline vs. standalone image display, relative `.md` link navigation inside folder bundles, and hardened `DOMPurify` against raw `<button>`/`<input>` controls.
- **Quieter icon-first UI**: Replaced text-heavy reader bar and code copy controls with crisp SVG icons (floating hover-reveal copy icon on code blocks, icon-only reader chrome, icon + label landing actions and drawer tabs).
- **Editorial typography without console stripes**: Replaced legacy left-bar card styles on GitHub callouts (now subtle soft surfaces with 1px hairline border + semantic icons), active TOC items (soft highlight pill), and body blockquotes (pure transparent book-style indentation with a whisper-thin neutral hairline).
- **Full single-key keyboard control**: Added complete single-key navigation and reading controls (`J`/`K` smooth scroll, `N`/`P` next/prev heading, `G`/`Shift+G` top/bottom, `,`/`.` prev/next folder doc, `W`/`L`/`Y` width/spacing/font, `D` day/dark toggle, `B` file list, `M` header toggle, `H` home, `V` paste, `Shift+O` folder) with input-focus and modifier-key guards.
- **More line-width steps & number-free line spacing**: Expanded line width to 5 visual levels (Compact, Narrow, Book, Wide, Full — up to `1200px` for dense tables) and replaced raw line-height decimals with icon + label presets (Tight / Normal / Relaxed).
- **Live local document hot-reload, session restore & zero-flash dark boot**: Uses the browser File System Access API (`showOpenFilePicker`, `showDirectoryPicker`, drag-and-drop `getAsFileSystemHandle`) with `FileSystemObserver` / lightweight foreground checks to hot-reload edited local `.md` files in place while preserving scroll position (`R` for manual reload or clicking the live status indicator to re-authorize after refresh), persists the active reading session and scroll position across page refreshes via IndexedDB + `sessionStorage`, and eliminated light-theme flash when refreshing in dark themes.
- **Refined reading details**: Unified table font inheritance with body typography, replaced disabled native task-list checkboxes with optically centered custom checkboxes matching the active theme, softened CJK punctuation opacity, and redesigned `「」`/`『』` corner brackets with low-noise geometric strokes while preserving original copyable text.

## 0.1.0 — 2026-11-19

- Initial MVP of CalMD, a pure browser-based Markdown reader focused on immersive reading.
- Drag-and-drop and picker import for local `.md` files and folders (with automatic relative local image resolution and multi-file switching), plus instant clipboard paste.
- Fullscreen immersive reading mode (`F`), auto-hiding floating header, reading progress hairline, and paragraph Focus Mode (`S`).
- Four reading themes (Paper, Sepia, Mist, Ink), three typeface families (Serif, Sans, Mono), adjustable font size, measure, and line height.
- GFM tables, task lists, GitHub-style alerts, YAML frontmatter, Highlight.js code blocks with copy button, KaTeX math, lazy-loaded Mermaid diagrams, click-to-zoom lightbox, and strict DOMPurify XSS sanitization.
- Local reading history with scroll position restore via IndexedDB, and bilingual Chinese / English UI.

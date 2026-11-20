# CalMD

A pure, quiet Markdown reader in your browser — built for distraction-free, fullscreen reading.

[简体中文](README.zh-CN.md)

## What It Is

CalMD opens local `.md` files or entire folders right in your browser and gets out of your way. No split-pane editor chrome, no backend, no uploads — just typography, paper themes, and fullscreen focus.

## Quick Start

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Build static files into `dist/`:

```bash
npm run build
```

Run tests:

```bash
npm test
```

## Features

- **Fullscreen immersion**: Press `F` to enter fullscreen mode; icon-first floating controls fade away automatically as you scroll.
- **Local file & folder import with live reload**: Drag and drop `.md` files, paste Markdown directly (`Cmd/Ctrl + V` or `V`), or open an entire folder to resolve relative images and `.md` links automatically. In Chromium browsers, opened local files hot-reload in place on save while preserving your scroll position (`R` to reload manually).
- **Four quiet paper themes & 5-step width**: Switch instantly between Paper, Sepia, Mist, and Ink (`1`–`4`, or `D` for day/dark), plus Serif / Sans / Mono typefaces (`Y`), 5 line widths from Compact to Full (`W`), and visual Tight / Normal / Relaxed line spacing (`L`).
- **Full single-key keyboard control**: Navigate smoothly (`J`/`K`, `N`/`P` headings, `G`/`Shift+G` top/bottom, `,`/`.` folder docs) and adjust reading settings without lifting your hands from the keyboard (`?` for the full sheet).
- **Paragraph focus mode**: Press `S` to gently dim surrounding paragraphs and keep your eyes anchored on what you are reading.
- **On-demand navigation**: Slide-out Table of Contents (`T`) and multi-file switcher (`B`) with active heading tracking and a whisper-thin top progress line.
- **CommonMark & GFM technical rendering**: Faithful CommonMark/GFM output (no smart-quote or `(c)` mutations), GFM tables, task lists, modern semantic GitHub alerts, syntax-highlighted code blocks with minimal floating copy icons, YAML frontmatter, KaTeX math, lazy-loaded Mermaid diagrams, and click-to-zoom images.
- **100% client-side & private**: All parsing, sanitization (DOMPurify), and recent reading memory (IndexedDB) stay strictly in your browser.

## License

MIT — Copyright (c) 2026 Tenon Artificial Intelligence Technology Co., Ltd. (长沙榫卯人工智能科技有限公司)

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

- **Fullscreen immersion**: Press `F` to enter fullscreen mode; floating controls fade away automatically as you scroll.
- **Local file & folder import**: Drag and drop `.md` files, paste Markdown directly (`Cmd/Ctrl + V`), or drop an entire folder to resolve local relative images automatically.
- **Four quiet paper themes**: Switch instantly between Paper, Sepia, Mist, and Ink (`1`–`4`), plus Serif / Sans / Mono typefaces, font size, line width, and line height.
- **Paragraph focus mode**: Press `S` to gently dim surrounding paragraphs and keep your eyes anchored on what you are reading.
- **On-demand navigation**: Slide-out Table of Contents and multi-file switcher (`T`) with active heading tracking and a whisper-thin top progress line.
- **Full technical Markdown**: GFM tables, task lists, GitHub alerts, syntax-highlighted code blocks with copy, YAML frontmatter, KaTeX math, lazy-loaded Mermaid diagrams, and click-to-zoom images.
- **100% client-side & private**: All parsing, sanitization (DOMPurify), and recent reading memory (IndexedDB) stay strictly in your browser.

## License

MIT — Copyright (c) 2026 Changsha Tenon Artificial Intelligence Technology Co., Ltd.

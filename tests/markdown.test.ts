import { describe, expect, it } from 'vitest';
import { computeReadingStats, parseFrontmatter, renderMarkdown } from '../src/core/markdown';
import { normalizePath, resolveRelativePath } from '../src/core/files';

describe('parseFrontmatter', () => {
  it('parses title, author, date and inline/list tags', () => {
    const raw = `---
title: Quiet Reading
author: Dorian
date: 2026-11-19
tags: [Markdown, Reading]
---

# Body`;
    const { frontmatter, body } = parseFrontmatter(raw);
    expect(frontmatter?.title).toBe('Quiet Reading');
    expect(frontmatter?.author).toBe('Dorian');
    expect(frontmatter?.date).toBe('2026-11-19');
    expect(frontmatter?.tags).toEqual(['Markdown', 'Reading']);
    expect(body.trim()).toBe('# Body');
  });

  it('returns null when no frontmatter exists', () => {
    const { frontmatter, body } = parseFrontmatter('# Hello');
    expect(frontmatter).toBeNull();
    expect(body).toBe('# Hello');
  });
});

describe('renderMarkdown', () => {
  it('extracts headings with deduplicated slugs for TOC', () => {
    const res = renderMarkdown('# 标题\n\n## 章节\n\n## 章节\n');
    expect(res.toc).toEqual([
      { id: '标题', level: 1, text: '标题' },
      { id: '章节', level: 2, text: '章节' },
      { id: '章节-1', level: 2, text: '章节' },
    ]);
  });

  it('renders GitHub alerts, task lists, KaTeX math and Mermaid placeholders', () => {
    const md = `> [!TIP]
> Keep reading quietly.

- [x] Done item
- [ ] Open item

Inline $E = mc^2$ and currency \$100 stay distinct.

$$
a^2 + b^2 = c^2
$$

\`\`\`mermaid
graph LR
  A --> B
\`\`\`
`;
    const res = renderMarkdown(md);
    expect(res.html).toContain('class="callout callout-tip"');
    expect(res.html).toContain('task-list-item');
    expect(res.html).toContain('katex');
    expect(res.html).toContain('$100');
    expect(res.hasMermaid).toBe(true);
    expect(res.html).toContain('class="calmd-mermaid"');
    expect(res.html).toContain('class="mermaid-fallback"');
    expect(res.html).toContain('A --&gt; B');
  });

  it('sanitizes XSS payloads strictly', () => {
    const md = `<script>alert(1)</script>
<img src="x" onerror="alert(2)">
<a href="javascript:alert(3)">evil</a>
[click](javascript:alert(4))`;
    const res = renderMarkdown(md);
    expect(res.html).not.toContain('<script');
    expect(res.html).not.toContain('onerror');
    expect(res.html).not.toMatch(/href\s*=\s*["']\s*javascript:/i);
  });

  it('resolves relative asset URLs and wraps tables', () => {
    const md = `![pic](./assets/demo.png)

| A | B |
| --- | --- |
| 1 | 2 |`;
    const res = renderMarkdown(md, {
      resolveAsset: (src) => (src === './assets/demo.png' ? 'blob:local-demo' : undefined),
    });
    expect(res.html).toContain('src="blob:local-demo"');
    expect(res.html).toContain('class="table-wrap"');
  });
});

describe('reading stats and relative paths', () => {
  it('counts bilingual words and estimates reading time', () => {
    const stats = computeReadingStats('安静阅读 Markdown 文档 with English words');
    expect(stats.wordCount).toBeGreaterThanOrEqual(10);
    expect(stats.readingMinutes).toBeGreaterThanOrEqual(1);
  });

  it('normalizes relative asset paths across parent folders', () => {
    expect(normalizePath('./docs/../assets/pic.png')).toBe('assets/pic.png');
    expect(resolveRelativePath('repo/docs/guide.md', '../assets/封面.png')).toBe('repo/assets/封面.png');
    expect(resolveRelativePath('repo/docs/guide.md', '../assets/%E5%9B%BE.png')).toBe('repo/assets/图.png');
  });
});

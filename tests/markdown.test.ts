import { describe, expect, it, beforeEach, vi } from 'vitest';
import { computeReadingStats, parseFrontmatter, renderMarkdown } from '../src/core/markdown';
import {
  buildBundleFromFiles,
  ensureHandleReadable,
  normalizePath,
  resolveRelativePath,
  watchLocalDoc,
  type FileSystemFileHandleLike,
} from '../src/core/files';
import {
  clearSessionScroll,
  loadPrefs,
  loadSessionScroll,
  savePrefs,
  saveSessionScroll,
} from '../src/core/storage';

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

  it('does not swallow prose between CommonMark horizontal rules', () => {
    const raw = `---
Just a paragraph between horizontal rules.
---

# Heading`;
    const { frontmatter, body } = parseFrontmatter(raw);
    expect(frontmatter).toBeNull();
    expect(body).toContain('Just a paragraph between horizontal rules.');
  });
});

describe('renderMarkdown', () => {
  it('follows CommonMark/GFM without typographer mutations such as (c) -> ©', () => {
    const md = `### 6.3 选根节点（25-26 S1 Q3(c)，7 分）

题目没说清的地方，先写一句假设（"Assume ..."）再算。`;
    const res = renderMarkdown(md);
    expect(res.html).toContain('Q3(c)');
    expect(res.html).not.toContain('©');
    expect(res.html).toContain('"Assume ..."');
    expect(res.toc[0]?.text).toBe('6.3 选根节点（25-26 S1 Q3(c)，7 分）');
  });

  it('styles CJK corner brackets and punctuation lightly in prose without touching code spans', () => {
    const res = renderMarkdown('### 四个词「远、紧、中点、可逆」\n\n代码里 `「保留」、` 不包裹。');
    expect(res.html).toContain('<span class="cjk-bracket cjk-bracket-open">「</span>');
    expect(res.html).toContain('<span class="cjk-bracket cjk-bracket-close">」</span>');
    expect(res.html).toContain('<span class="cjk-punct">、</span>');
    expect(res.html).toContain('<code>「保留」、</code>');
  });

  it('extracts headings with deduplicated slugs, preserving underscores and link text', () => {
    const res = renderMarkdown('# 标题\n\n## S_W 矩阵与 [参考](https://example.com)\n\n## 章节\n\n## 章节\n');
    expect(res.toc).toEqual([
      { id: '标题', level: 1, text: '标题' },
      { id: 's_w-矩阵与-参考', level: 2, text: 'S_W 矩阵与 参考' },
      { id: '章节', level: 2, text: '章节' },
      { id: '章节-1', level: 2, text: '章节' },
    ]);
  });

  it('renders GitHub alerts with icons, task lists, KaTeX math and Mermaid placeholders', () => {
    const md = `> [!TIP]
> Keep reading quietly.

- [x] Done item
- [ ] Open item

Inline $E = mc^2$ and currency \\$100 stay distinct.

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
    expect(res.html).toContain('<svg');
    expect(res.html).toContain('task-list-item');
    expect(res.html).toContain('task-checkbox');
    expect(res.html).toContain('katex');
    expect(res.html).toContain('$100');
    expect(res.hasMermaid).toBe(true);
    expect(res.html).toContain('class="calmd-mermaid"');
    expect(res.html).toContain('class="mermaid-fallback"');
    expect(res.html).toContain('A --&gt; B');
  });

  it('renders code blocks with icon copy button and no fabricated text label', () => {
    const md = `\`\`\`
plain block
\`\`\`

\`\`\`ts
const x = 1;
\`\`\`

    indented code
`;
    const res = renderMarkdown(md);
    expect(res.html).not.toContain('>text<');
    expect(res.html).toContain('class="code-lang">ts</span>');
    expect(res.html).toContain('data-copy-code="1"');
    // Three code blocks total (fenced without lang, fenced with ts, indented)
    expect((res.html.match(/class="code-block"/g) || []).length).toBe(3);
  });

  it('sanitizes XSS payloads and untrusted form controls strictly', () => {
    const md = `<script>alert(1)</script>
<img src="x" onerror="alert(2)">
<a href="javascript:alert(3)">evil</a>
[click](javascript:alert(4))
<button onclick="alert(5)">fake</button>
<input type="text" value="fake">`;
    const res = renderMarkdown(md);
    expect(res.html).not.toContain('<script');
    expect(res.html).not.toContain('onerror');
    expect(res.html).not.toMatch(/href\s*=\s*["']\s*javascript:/i);
    expect(res.html).not.toContain('>fake<');
    expect(res.html).not.toContain('value="fake"');
  });

  it('resolves relative asset URLs, marks standalone images, and wraps tables', () => {
    const md = `![pic](./assets/demo.png)

Inline ![badge](./assets/b.png) text.

| A | B |
| --- | --- |
| 1 | 2 |`;
    const res = renderMarkdown(md, {
      resolveAsset: (src) =>
        src === './assets/demo.png'
          ? 'blob:local-demo'
          : src === './assets/b.png'
            ? 'blob:local-badge'
            : undefined,
    });
    expect(res.html).toContain('src="blob:local-demo"');
    expect(res.html).toContain('readable-img-block');
    expect(res.html).toContain('src="blob:local-badge"');
    expect(res.html).toContain('class="table-wrap"');
  });
});

describe('reading stats, files and storage prefs', () => {
  beforeEach(() => {
    localStorage.clear();
  });

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

  it('resolves relative markdown links within a folder bundle', async () => {
    const f1 = new File(['# Main\n[Ref](00_map.md)'], 'index.md', { type: 'text/markdown' });
    Object.defineProperty(f1, 'webkitRelativePath', { value: 'notes/index.md' });
    Object.defineProperty(f1, 'text', { value: async () => '# Main\n[Ref](00_map.md)' });
    const f2 = new File(['# Map'], '00_map.md', { type: 'text/markdown' });
    Object.defineProperty(f2, 'webkitRelativePath', { value: 'notes/00_map.md' });
    Object.defineProperty(f2, 'text', { value: async () => '# Map' });

    const bundle = await buildBundleFromFiles([f1, f2]);
    expect(bundle).not.toBeNull();
    expect(bundle?.resolveDoc('notes/index.md', '00_map.md')?.name).toBe('00_map.md');
    bundle?.dispose();
  });

  it('migrates legacy numeric lineHeight and persists 5-step measure', () => {
    localStorage.setItem(
      'calmd.prefs.v1',
      JSON.stringify({ theme: 'sepia', measure: 'full', lineHeight: 2.05 }),
    );
    const loaded = loadPrefs();
    expect(loaded.theme).toBe('sepia');
    expect(loaded.measure).toBe('full');
    expect(loaded.lineHeight).toBe('relaxed');

    savePrefs({ ...loaded, measure: 'compact', lineHeight: 'tight' });
    const reloaded = loadPrefs();
    expect(reloaded.measure).toBe('compact');
    expect(reloaded.lineHeight).toBe('tight');
  });

  it('watches local file handles and triggers live hot-reload only when content changes', async () => {
    let diskText = '# v1';
    let diskMtime = 1000;
    const handle: FileSystemFileHandleLike = {
      kind: 'file',
      name: 'note.md',
      getFile: async () => {
        const f = new File([diskText], 'note.md', {
          type: 'text/markdown',
          lastModified: diskMtime,
        });
        Object.defineProperty(f, 'text', { value: async () => diskText });
        return f;
      },
    };

    const onUpdate = vi.fn();
    const watcher = watchLocalDoc(
      {
        id: 'file:note.md',
        name: 'note.md',
        path: 'note.md',
        content: '# v1',
        lastModified: 1000,
        fileHandle: handle,
      },
      onUpdate,
      60_000,
    );

    expect(watcher).not.toBeNull();
    expect(await watcher!.checkNow(true)).toBe(false);
    expect(onUpdate).not.toHaveBeenCalled();

    diskText = '# v2 updated';
    diskMtime = 2000;
    expect(await watcher!.checkNow(false)).toBe(true);
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith('# v2 updated', 2000);

    // Same content does not fire again
    expect(await watcher!.checkNow(false)).toBe(false);
    expect(onUpdate).toHaveBeenCalledTimes(1);

    watcher!.stop();
    diskText = '# v3 after stop';
    diskMtime = 3000;
    expect(await watcher!.checkNow(true)).toBe(false);
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it('persists session scroll ratio and checks handle readability without unwanted prompts', async () => {
    sessionStorage.clear();
    saveSessionScroll('doc-1', 0.42);
    expect(loadSessionScroll('doc-1')).toBe(0.42);
    expect(loadSessionScroll('doc-2')).toBeNull();
    clearSessionScroll();
    expect(loadSessionScroll('doc-1')).toBeNull();

    const promptHandle: FileSystemFileHandleLike = {
      kind: 'file',
      name: 'a.md',
      getFile: async () => new File([''], 'a.md'),
      queryPermission: async () => 'prompt',
      requestPermission: async () => 'granted',
    };
    expect(await ensureHandleReadable(promptHandle, false)).toBe(false);
    expect(await ensureHandleReadable(promptHandle, true)).toBe(true);
  });
});

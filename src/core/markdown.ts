import MarkdownIt from 'markdown-it';
import type StateBlock from 'markdown-it/lib/rules_block/state_block.mjs';
import type StateInline from 'markdown-it/lib/rules_inline/state_inline.mjs';
import hljs from 'highlight.js/lib/common';
import katex from 'katex';
import DOMPurify from 'dompurify';
import type { Messages } from './i18n';

export interface Frontmatter {
  title?: string;
  subtitle?: string;
  author?: string;
  date?: string;
  tags: string[];
  extra: Record<string, string>;
}

export interface TocItem {
  id: string;
  level: number;
  text: string;
}

export interface RenderResult {
  html: string;
  frontmatter: Frontmatter | null;
  toc: TocItem[];
  wordCount: number;
  readingMinutes: number;
  hasMermaid: boolean;
}

export interface RenderOptions {
  resolveAsset?: (src: string) => string | undefined;
  calloutLabels?: Messages['calloutLabels'];
  copyLabel?: string;
}

/** 解析文档开头的 YAML Frontmatter（容错、零依赖） */
export function parseFrontmatter(raw: string): {
  frontmatter: Frontmatter | null;
  body: string;
} {
  const normalized = raw.replace(/\r\n/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  if (!match) {
    return { frontmatter: null, body: normalized };
  }

  const block = match[1];
  const body = normalized.slice(match[0].length);
  const fm: Frontmatter = { tags: [], extra: {} };
  const lines = block.split('\n');
  let activeListKey: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (activeListKey && /^-\s+/.test(trimmed)) {
      const val = stripQuotes(trimmed.replace(/^-\s+/, '').trim());
      if (activeListKey === 'tags' && val) fm.tags.push(val);
      continue;
    }

    const kv = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!kv) {
      activeListKey = null;
      continue;
    }

    const key = kv[1].toLowerCase();
    const rawVal = kv[2].trim();

    if (key === 'tags' || key === 'keywords') {
      if (!rawVal) {
        activeListKey = 'tags';
      } else if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
        activeListKey = null;
        const items = rawVal
          .slice(1, -1)
          .split(',')
          .map((s) => stripQuotes(s.trim()))
          .filter(Boolean);
        fm.tags.push(...items);
      } else {
        activeListKey = null;
        fm.tags.push(
          ...rawVal
            .split(/[,，]/)
            .map((s) => stripQuotes(s.trim()))
            .filter(Boolean),
        );
      }
      continue;
    }

    activeListKey = null;
    const val = stripQuotes(rawVal);
    if (!val) continue;

    if (key === 'title') fm.title = val;
    else if (key === 'subtitle' || key === 'description') fm.subtitle = val;
    else if (key === 'author') fm.author = val;
    else if (key === 'date' || key === 'updated') fm.date = val;
    else fm.extra[kv[1]] = val;
  }

  const hasContent =
    Boolean(fm.title || fm.subtitle || fm.author || fm.date || fm.tags.length > 0);
  return { frontmatter: hasContent ? fm : null, body };
}

function stripQuotes(s: string): string {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

/** 中英文混合字数统计与阅读时长估算 */
export function computeReadingStats(text: string): {
  wordCount: number;
  readingMinutes: number;
} {
  const cleaned = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~|\-]+/g, ' ');

  const cjkChars = (cleaned.match(/[\u4E00-\u9FFF\u3400-\u4DBF\u3040-\u30FF\uAC00-\uD7AF]/g) || [])
    .length;
  const latinWords = (
    cleaned
      .replace(/[\u4E00-\u9FFF\u3400-\u4DBF\u3040-\u30FF\uAC00-\uD7AF]/g, ' ')
      .match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) || []
  ).length;

  const wordCount = cjkChars + latinWords;
  const minutes = Math.max(1, Math.round(cjkChars / 320 + latinWords / 220));
  return { wordCount, readingMinutes: minutes };
}

/** 标题生成稳定 slug（兼容中文与重复标题） */
function createSlugger(): (text: string) => string {
  const counts = new Map<string, number>();
  return (text: string) => {
    const base =
      text
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'section';

    const seen = counts.get(base) ?? 0;
    counts.set(base, seen + 1);
    return seen === 0 ? base : `${base}-${seen}`;
  };
}

/** markdown-it 内联与块级 KaTeX 数学公式插件 */
function mathPlugin(md: MarkdownIt): void {
  const inlineMath = (state: StateInline, silent: boolean): boolean => {
    const src = state.src;
    const start = state.pos;
    if (src.charCodeAt(start) !== 0x24 /* $ */) return false;
    if (src.charCodeAt(start + 1) === 0x24) return false; // 块级 $$ 交给 block 规则

    // 跳过紧跟空格或纯货币如 $100
    const nextChar = src[start + 1];
    if (!nextChar || /\s/.test(nextChar)) return false;

    let match = start + 1;
    while ((match = src.indexOf('$', match)) !== -1) {
      let backslashes = 0;
      let i = match - 1;
      while (i > start && src.charCodeAt(i) === 0x5c) {
        backslashes++;
        i--;
      }
      if (backslashes % 2 === 0) break;
      match++;
    }

    if (match === -1) return false;
    const content = src.slice(start + 1, match);
    if (!content.trim() || content.includes('\n') || /\s$/.test(content)) return false;
    // 若紧接在闭合 $ 后仍是数字，通常是价格区间 $10 - $20
    if (/\d/.test(src[match + 1] || '')) return false;

    if (!silent) {
      const token = state.push('math_inline', 'math', 0);
      token.markup = '$';
      token.content = content;
    }
    state.pos = match + 1;
    return true;
  };

  const blockMath = (
    state: StateBlock,
    startLine: number,
    endLine: number,
    silent: boolean,
  ): boolean => {
    const startPos = state.bMarks[startLine] + state.tShift[startLine];
    const maxPos = state.eMarks[startLine];
    const firstLine = state.src.slice(startPos, maxPos).trim();

    if (!firstLine.startsWith('$$')) return false;

    // 单行 $$ ... $$
    if (firstLine.length > 4 && firstLine.endsWith('$$')) {
      if (silent) return true;
      const token = state.push('math_block', 'math', 0);
      token.block = true;
      token.markup = '$$';
      token.content = firstLine.slice(2, -2).trim();
      token.map = [startLine, startLine + 1];
      state.line = startLine + 1;
      return true;
    }

    if (firstLine !== '$$') return false;

    let nextLine = startLine + 1;
    let found = false;
    while (nextLine < endLine) {
      const pos = state.bMarks[nextLine] + state.tShift[nextLine];
      const max = state.eMarks[nextLine];
      if (state.src.slice(pos, max).trim() === '$$') {
        found = true;
        break;
      }
      nextLine++;
    }
    if (!found) return false;
    if (silent) return true;

    const content = state.getLines(startLine + 1, nextLine, state.tShift[startLine], false).trim();
    const token = state.push('math_block', 'math', 0);
    token.block = true;
    token.markup = '$$';
    token.content = content;
    token.map = [startLine, nextLine + 1];
    state.line = nextLine + 1;
    return true;
  };

  md.inline.ruler.after('escape', 'math_inline', inlineMath);
  md.block.ruler.after('fence', 'math_block', blockMath, {
    alt: ['paragraph', 'reference', 'blockquote', 'list'],
  });

  md.renderer.rules.math_inline = (tokens, idx) => {
    try {
      return katex.renderToString(tokens[idx].content, {
        displayMode: false,
        throwOnError: false,
        strict: false,
      });
    } catch {
      return `<code>${escapeHtml(tokens[idx].content)}</code>`;
    }
  };

  md.renderer.rules.math_block = (tokens, idx) => {
    try {
      return `<div class="math-block">${katex.renderToString(tokens[idx].content, {
        displayMode: true,
        throwOnError: false,
        strict: false,
      })}</div>`;
    } catch {
      return `<pre><code>${escapeHtml(tokens[idx].content)}</code></pre>`;
    }
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const ALERT_TYPES = ['note', 'tip', 'important', 'warning', 'caution'] as const;
type AlertType = (typeof ALERT_TYPES)[number];

/** 对生成的 DOM 做安全的后处理：任务列表、GitHub Alerts、外链属性、相对图片与表格容器 */
function enhanceDom(
  html: string,
  options: RenderOptions,
): { html: string; hasMermaid: boolean } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div id="root">${html}</div>`, 'text/html');
  const root = doc.getElementById('root');
  if (!root) return { html, hasMermaid: false };

  // 1. 表格外包横向滚动容器，保证窄屏不溢出
  root.querySelectorAll('table').forEach((table) => {
    const wrap = doc.createElement('div');
    wrap.className = 'table-wrap';
    table.parentNode?.insertBefore(wrap, table);
    wrap.appendChild(table);
  });

  // 2. GFM 任务列表 [ ] / [x]
  root.querySelectorAll('li').forEach((li) => {
    const firstNode = li.firstChild;
    const targetEl =
      firstNode && firstNode.nodeType === Node.ELEMENT_NODE && firstNode.nodeName === 'P'
        ? (firstNode as HTMLElement)
        : li;
    const textNode = targetEl.firstChild;
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;

    const text = textNode.textContent || '';
    const match = text.match(/^\[([ xX])\]\s+/);
    if (!match) return;

    li.classList.add('task-list-item');
    const ul = li.parentElement;
    if (ul) ul.classList.add('task-list');

    const checkbox = doc.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.disabled = true;
    if (match[1].toLowerCase() === 'x') {
      checkbox.setAttribute('checked', '');
    }
    textNode.textContent = text.slice(match[0].length);
    targetEl.insertBefore(checkbox, textNode);
  });

  // 3. GitHub Alerts: > [!NOTE] ...
  const labels = options.calloutLabels ?? {
    note: 'Note',
    tip: 'Tip',
    important: 'Important',
    warning: 'Warning',
    caution: 'Caution',
  };

  root.querySelectorAll('blockquote').forEach((bq) => {
    const firstP = bq.querySelector(':scope > p');
    if (!firstP) return;
    const rawHtml = firstP.innerHTML;
    const match = rawHtml.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:<br\s*\/?>|\s*\n|\s+)?/i);
    if (!match) return;

    const type = match[1].toLowerCase() as AlertType;
    if (!ALERT_TYPES.includes(type)) return;

    const rest = rawHtml.slice(match[0].length).trim();
    const callout = doc.createElement('aside');
    callout.className = `callout callout-${type}`;

    const title = doc.createElement('div');
    title.className = 'callout-title';
    title.textContent = labels[type];
    callout.appendChild(title);

    if (rest) {
      firstP.innerHTML = rest;
    } else {
      firstP.remove();
    }

    while (bq.firstChild) {
      callout.appendChild(bq.firstChild);
    }
    bq.replaceWith(callout);
  });

  // 4. 图片相对路径解析 + 懒加载 + 可放大标记
  root.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src') || '';
    if (src && options.resolveAsset && !/^(?:https?:|data:|blob:)/i.test(src)) {
      const resolved = options.resolveAsset(src);
      if (resolved) {
        img.setAttribute('src', resolved);
      }
    }
    img.setAttribute('loading', 'lazy');
    img.classList.add('readable-img');
  });

  // 5. 外链新标签打开
  root.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href') || '';
    if (/^https?:\/\//i.test(href)) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    }
  });

  const hasMermaid = root.querySelector('.calmd-mermaid') !== null;
  return { html: root.innerHTML, hasMermaid };
}

/** 渲染 Markdown 为安全、排版精美的 HTML + 目录 + 统计 */
export function renderMarkdown(raw: string, options: RenderOptions = {}): RenderResult {
  const { frontmatter, body } = parseFrontmatter(raw);
  const { wordCount, readingMinutes } = computeReadingStats(body);
  const toc: TocItem[] = [];
  const slugify = createSlugger();

  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    breaks: false,
  });

  md.use(mathPlugin);

  // 标题提取与锚点 ID 注入
  const defaultHeadingOpen =
    md.renderer.rules.heading_open ||
    ((tokens, idx, opts, _env, self) => self.renderToken(tokens, idx, opts));

  md.renderer.rules.heading_open = (tokens, idx, opts, env, self) => {
    const token = tokens[idx];
    const level = Number(token.tag.slice(1));
    const inlineToken = tokens[idx + 1];
    const text = inlineToken ? inlineToken.content.replace(/[`*_~]/g, '').trim() : '';
    const id = slugify(text);
    token.attrSet('id', id);
    if (level >= 1 && level <= 4 && text) {
      toc.push({ id, level, text });
    }
    return defaultHeadingOpen(tokens, idx, opts, env, self);
  };

  // 代码块：Mermaid 占位 + highlight.js 语法高亮 + 极简复制按钮
  md.renderer.rules.fence = (tokens, idx) => {
    const token = tokens[idx];
    const info = token.info.trim();
    const lang = info.split(/\s+/)[0].toLowerCase();
    const code = token.content;

    if (lang === 'mermaid') {
      return `<div class="calmd-mermaid"><pre class="mermaid-fallback">${escapeHtml(code)}</pre></div>`;
    }

    let highlighted: string;
    let displayLang = lang;
    if (lang && hljs.getLanguage(lang)) {
      highlighted = hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
    } else {
      highlighted = escapeHtml(code);
      displayLang = lang || 'text';
    }

    const copyText = escapeHtml(options.copyLabel ?? 'Copy');
    return (
      `<div class="code-block">` +
      `<div class="code-header">` +
      `<span class="code-lang">${escapeHtml(displayLang)}</span>` +
      `<button type="button" class="code-copy" data-copy-code="1">${copyText}</button>` +
      `</div>` +
      `<pre><code class="hljs language-${escapeHtml(displayLang)}">${highlighted}</code></pre>` +
      `</div>`
    );
  };

  const rawHtml = md.render(body);

  // DOMPurify 严格净化 XSS（允许本地 blob: 图片、KaTeX MathML/SVG、安全属性）
  const sanitized = DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: { html: true, svg: true, mathMl: true },
    ADD_ATTR: ['target', 'rel', 'data-mermaid', 'data-copy-code', 'aria-hidden', 'style'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|blob):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  });

  const enhanced = enhanceDom(sanitized, options);

  return {
    html: enhanced.html,
    frontmatter,
    toc,
    wordCount,
    readingMinutes,
    hasMermaid: enhanced.hasMermaid,
  };
}

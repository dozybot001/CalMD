import MarkdownIt from 'markdown-it';
import type StateBlock from 'markdown-it/lib/rules_block/state_block.mjs';
import type StateInline from 'markdown-it/lib/rules_inline/state_inline.mjs';
import type Token from 'markdown-it/lib/token.mjs';
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

const COPY_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<rect x="9" y="9" width="12" height="12" rx="2.2"/>' +
  '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>' +
  '</svg>';

const CALLOUT_ICONS: Record<'note' | 'tip' | 'important' | 'warning' | 'caution', string> = {
  note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 16v-4"/><circle cx="12" cy="8.2" r="0.6" fill="currentColor"/></svg>',
  tip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.5.4.9 1.1 1 1.7h5.2c.1-.6.5-1.3 1-1.7A6 6 0 0 0 12 3z"/></svg>',
  important:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M12 8.5v4.5"/><circle cx="12" cy="15.8" r="0.6" fill="currentColor"/></svg>',
  warning:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 3.9 2.3 18a2 2 0 0 0 1.7 3h16a2 2 0 0 0 1.7-3l-8-14.1a2 2 0 0 0-3.4 0z"/><path d="M12 9v4.5"/><circle cx="12" cy="16.8" r="0.6" fill="currentColor"/></svg>',
  caution:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><path d="M12 8v5"/><circle cx="12" cy="16.2" r="0.6" fill="currentColor"/></svg>',
};

/** 解析文档开头的 YAML Frontmatter（严格校验，避免误吞 CommonMark 水平分割线） */
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
  const lines = block.split('\n');
  const fm: Frontmatter = { tags: [], extra: {} };
  let activeListKey: string | null = null;
  let validEntryCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (activeListKey && /^-\s+/.test(trimmed)) {
      const val = stripQuotes(trimmed.replace(/^-\s+/, '').trim());
      if (activeListKey === 'tags' && val) fm.tags.push(val);
      validEntryCount++;
      continue;
    }

    const kv = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!kv) {
      // 块内存在非 YAML 语法的普通正文行，说明开头的 --- 是水平分割线而非 Frontmatter
      return { frontmatter: null, body: normalized };
    }

    validEntryCount++;
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

  if (validEntryCount === 0) {
    return { frontmatter: null, body: normalized };
  }

  const body = normalized.slice(match[0].length);
  const hasDisplayMeta =
    Boolean(fm.title || fm.subtitle || fm.author || fm.date || fm.tags.length > 0);
  return { frontmatter: hasDisplayMeta ? fm : null, body };
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

/** 从 markdown-it 行内 token 树提取真实纯文本（保留字面下划线/星号，剥离链接与格式标记） */
function extractInlinePlainText(token: Token | undefined): string {
  if (!token) return '';
  if (!token.children || token.children.length === 0) {
    return token.content.trim();
  }
  let out = '';
  for (const child of token.children) {
    if (child.type === 'text' || child.type === 'code_inline' || child.type === 'math_inline') {
      out += child.content;
    } else if (child.type === 'softbreak' || child.type === 'hardbreak') {
      out += ' ';
    } else if (child.type === 'image') {
      out += extractInlinePlainText(child);
    }
  }
  return out.replace(/\s+/g, ' ').trim();
}

/** 标题生成稳定 slug（兼容中文与重复标题） */
function createSlugger(): (text: string) => string {
  const counts = new Map<string, number>();
  return (text: string) => {
    const base =
      text
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s_-]/gu, '')
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

    // 跳过紧跟空格的情况
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

function renderCodeBlockContainer(code: string, lang: string): string {
  let highlighted: string;
  if (lang && hljs.getLanguage(lang)) {
    highlighted = hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
  } else {
    highlighted = escapeHtml(code);
  }
  const langAttr = lang ? ` data-lang="${escapeHtml(lang)}"` : '';
  const cls = lang ? `hljs language-${escapeHtml(lang)}` : 'hljs';
  return `<div class="code-block"${langAttr}><pre><code class="${cls}">${highlighted}</code></pre></div>`;
}

const ALERT_TYPES = ['note', 'tip', 'important', 'warning', 'caution'] as const;
type AlertType = (typeof ALERT_TYPES)[number];

/** 对已净化的 DOM 做安全后处理：代码块复制图标、表格容器、任务列表、GitHub Alerts、图片与外链 */
function enhanceDom(
  html: string,
  options: RenderOptions,
): { html: string; hasMermaid: boolean } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div id="root">${html}</div>`, 'text/html');
  const root = doc.getElementById('root');
  if (!root) return { html, hasMermaid: false };

  // 1. 代码块注入轻量浮层工具（仅在显式声明语言时展示微弱语言标签 + 图标复制按钮）
  const copyLabel = options.copyLabel ?? 'Copy code';
  root.querySelectorAll<HTMLElement>('.code-block').forEach((block) => {
    const tools = doc.createElement('div');
    tools.className = 'code-tools';

    const lang = block.getAttribute('data-lang')?.trim();
    if (lang) {
      const badge = doc.createElement('span');
      badge.className = 'code-lang';
      badge.textContent = lang;
      tools.appendChild(badge);
    }

    const btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'code-copy';
    btn.setAttribute('data-copy-code', '1');
    btn.setAttribute('aria-label', copyLabel);
    btn.setAttribute('title', copyLabel);
    btn.innerHTML = COPY_ICON_SVG;
    tools.appendChild(btn);

    block.insertBefore(tools, block.firstChild);
  });

  // 2. 表格外包横向滚动容器，保证窄屏不溢出
  root.querySelectorAll('table').forEach((table) => {
    const wrap = doc.createElement('div');
    wrap.className = 'table-wrap';
    table.parentNode?.insertBefore(wrap, table);
    wrap.appendChild(table);
  });

  // 3. GFM 任务列表 [ ] / [x]（同时兼容紧凑与宽松列表、嵌套子列表）
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
    checkbox.className = 'task-checkbox';
    checkbox.disabled = true;
    checkbox.setAttribute('aria-hidden', 'true');
    if (match[1].toLowerCase() === 'x') {
      checkbox.setAttribute('checked', '');
    }
    textNode.textContent = text.slice(match[0].length);
    targetEl.insertBefore(checkbox, textNode);
  });

  // 4. GitHub Alerts: > [!NOTE]\n> ...（严格按 GFM 规范要求标签独占首行）
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
    const match = rawHtml.match(
      /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:<br\s*\/?>|\r?\n|$)/i,
    );
    if (!match) return;

    const type = match[1].toLowerCase() as AlertType;
    if (!ALERT_TYPES.includes(type)) return;

    const rest = rawHtml.slice(match[0].length).trim();
    const callout = doc.createElement('aside');
    callout.className = `callout callout-${type}`;

    const title = doc.createElement('div');
    title.className = 'callout-title';
    title.innerHTML = `${CALLOUT_ICONS[type]}<span>${escapeHtml(labels[type])}</span>`;
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

  // 5. 图片相对路径解析 + 区分独立大图与行内小图/徽章 + 懒加载
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

    const parent = img.parentElement;
    const isStandaloneInP =
      parent?.tagName === 'P' &&
      Array.from(parent.childNodes).every(
        (n) => n === img || (n.nodeType === Node.TEXT_NODE && !(n.textContent || '').trim()),
      );
    const isStandaloneLinkImg =
      parent?.tagName === 'A' &&
      parent.parentElement?.tagName === 'P' &&
      Array.from(parent.childNodes).every(
        (n) => n === img || (n.nodeType === Node.TEXT_NODE && !(n.textContent || '').trim()),
      ) &&
      Array.from(parent.parentElement.childNodes).every(
        (n) => n === parent || (n.nodeType === Node.TEXT_NODE && !(n.textContent || '').trim()),
      );
    if (isStandaloneInP || isStandaloneLinkImg) {
      img.classList.add('readable-img-block');
    }
  });

  // 6. 外链新标签打开
  root.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href') || '';
    if (/^https?:\/\//i.test(href)) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    }
  });

  // 7. 中文标点轻量化 + 直角引号「」『』紧凑对角排版（保留原文字符，复制无损）
  const punctWalker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const punctNodes: Text[] = [];
  let textNode: Node | null;
  while ((textNode = punctWalker.nextNode())) {
    const parent = textNode.parentElement;
    if (!parent || parent.closest('code, pre, .katex, svg, .code-tools, .callout-title')) continue;
    if (/[「」『』，。、；：！？（）【】《》“”‘’]/.test(textNode.textContent || '')) {
      punctNodes.push(textNode as Text);
    }
  }
  for (const node of punctNodes) {
    const parts = (node.textContent || '').split(/([「」『』]|[，。、；：！？（）【】《》“”‘’]+)/);
    if (parts.length <= 1) continue;
    const frag = doc.createDocumentFragment();
    for (const part of parts) {
      if (!part) continue;
      if (part === '「' || part === '『' || part === '」' || part === '』') {
        const span = doc.createElement('span');
        const isOpen = part === '「' || part === '『';
        const isDouble = part === '『' || part === '』';
        span.className = `cjk-bracket ${isOpen ? 'cjk-bracket-open' : 'cjk-bracket-close'}${isDouble ? ' cjk-bracket-double' : ''}`;
        span.textContent = part;
        frag.appendChild(span);
      } else if (/^[，。、；：！？（）【】《》“”‘’]+$/.test(part)) {
        const span = doc.createElement('span');
        span.className = 'cjk-punct';
        span.textContent = part;
        frag.appendChild(span);
      } else {
        frag.appendChild(doc.createTextNode(part));
      }
    }
    node.parentNode?.replaceChild(frag, node);
  }

  const hasMermaid = root.querySelector('.calmd-mermaid') !== null;
  return { html: root.innerHTML, hasMermaid };
}

/** 渲染 Markdown 为符合 CommonMark/GFM 规范、安全净化的 HTML + 目录 + 统计 */
export function renderMarkdown(raw: string, options: RenderOptions = {}): RenderResult {
  const { frontmatter, body } = parseFrontmatter(raw);
  const { wordCount, readingMinutes } = computeReadingStats(body);
  const toc: TocItem[] = [];
  const slugify = createSlugger();

  // 严格遵循 CommonMark / GFM：关闭 typographer，避免把 (c) 篡改为 © 或改写原文引号/破折号
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: false,
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
    const text = extractInlinePlainText(inlineToken);
    const id = slugify(text);
    token.attrSet('id', id);
    if (level >= 1 && level <= 4 && text) {
      toc.push({ id, level, text });
    }
    return defaultHeadingOpen(tokens, idx, opts, env, self);
  };

  // 围栏代码块：Mermaid 占位 + highlight.js 语法高亮（无语言时不伪造 text 标签）
  md.renderer.rules.fence = (tokens, idx) => {
    const token = tokens[idx];
    const info = token.info.trim();
    const lang = info.split(/\s+/)[0].toLowerCase();
    const code = token.content;

    if (lang === 'mermaid') {
      return `<div class="calmd-mermaid"><pre class="mermaid-fallback">${escapeHtml(code)}</pre></div>`;
    }

    return renderCodeBlockContainer(code, lang);
  };

  // CommonMark 缩进代码块统一使用相同样式容器
  md.renderer.rules.code_block = (tokens, idx) => {
    return renderCodeBlockContainer(tokens[idx].content, '');
  };

  const rawHtml = md.render(body);

  // DOMPurify 严格净化 XSS（阻断脚本、表单/交互控件与危险 URI；允许本地 blob:、安全光栅 data:image、KaTeX）
  const sanitized = DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: { html: true, svg: true, mathMl: true },
    ADD_ATTR: ['target', 'rel', 'data-mermaid', 'data-lang', 'aria-hidden', 'style'],
    ALLOWED_URI_REGEXP:
      /^(?:(?:https?|mailto|blob):|data:image\/(?:png|jpe?g|gif|webp|avif);base64,|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'button'],
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

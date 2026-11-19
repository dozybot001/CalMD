import type { Lang } from './i18n';

export const SAMPLE_DOC_ZH = `---
title: 静下心来，只读文字
subtitle: 一份关于沉浸式阅读的简短示例
author: CalMD
date: 2026-11-19
tags: [沉浸阅读, Markdown, 排版]
---

# 静下心来，只读文字

好的阅读界面应该在打开文档三秒后消失。当你开始向下滚动，顶栏会自动淡出，只留下纸张、文字和呼吸感。

按下键盘上的 \`F\` 键，立刻进入**全屏沉浸模式**；按 \`T\` 唤出目录，按 \`A\` 调整纸张主题、字体与版心宽度，按 \`S\` 开启段落专注聚光。

> 阅读不是扫描信息，而是把注意力完整地交给一段思考。

## 为什么做 CalMD

市面上多数浏览器端 Markdown 工具本质都是双栏编辑器：工具栏常驻、分屏拥挤、按钮抢眼。而当你只是想安静地读完一份技术 RFC、一篇长文或项目 README 时，你需要的是书页，而不是 IDE。

> [!TIP]
> 你可以直接把**整个本地文件夹**拖进窗口。CalMD 会自动解析文档里的相对路径图片，并在左侧文件栏中安静切换多篇 \`.md\` 文档。一切都在浏览器本地完成，不上传任何字节。

## 排版与技术内容支持

安静不意味着简陋。技术文档里常见的结构在这里都经过克制、清晰的视觉打磨。

### 代码块与语法高亮

\`\`\`typescript
// CalMD 100% 在本地浏览器运行
export function enterQuietReading(doc: string): void {
  const rendered = renderMarkdown(doc);
  document.documentElement.requestFullscreen?.();
  mountArticle(rendered);
}
\`\`\`

### 表格与阅读清单

| 快捷键 | 动作 | 适用场景 |
| --- | --- | --- |
| \`F\` | 全屏沉浸阅读 | 长文精读、无干扰浏览 |
| \`T\` | 展开 / 收起目录 | 快速跳转技术文档章节 |
| \`A\` | 纸张、字体与版心 | 切换素纸 / 暖笺 / 微墨 / 静夜 |
| \`S\` | 段落专注聚光 | 柔化上下文，聚焦当前段 |
| \`1\` – \`4\` | 一键切换主题 | 白天纸感与夜间护眼 |

- [x] 纯浏览器本地渲染，零后端、零数据上传
- [x] 全屏沉浸模式与自动隐藏控件
- [x] 支持 GFM 表格、提示框、代码高亮、公式与 Mermaid 图表
- [x] 拖入本地文件夹自动解析相对路径图片

### 数学公式（KaTeX）

行内公式如质能方程 $E = mc^2$ 或注意力机制核心缩放因子 $\\frac{1}{\\sqrt{d_k}}$，以及独立展示公式：

$$
\\operatorname{Attention}(Q, K, V) = \\operatorname{softmax}\\left(\\frac{Q K^\\top}{\\sqrt{d_k}}\\right) V
$$

### 流程图（Mermaid）

\`\`\`mermaid
flowchart LR
    A["拖入 .md 或文件夹"] --> B["本地解析与安全净化"]
    B --> C["纸感排版渲染"]
    C --> D["按 F 进入全屏沉浸阅读"]
\`\`\`

> [!NOTE]
> 所有文档与最近阅读记录均只保存在你当前浏览器的本地存储中，随时可在首页一键清空。

---

把你手边正想读的那份 \`.md\` 拖进来吧。
`;

export const SAMPLE_DOC_EN = `---
title: Calm Down, Just Read
subtitle: A quiet sample document for immersive reading
author: CalMD
date: 2026-11-19
tags: [Immersive Reading, Markdown, Typography]
---

# Calm Down, Just Read

A good reading interface should disappear three seconds after you open a document. As soon as you scroll, the floating controls gently fade away, leaving nothing but paper, ink, and room to think.

Press \`F\` to enter **fullscreen immersion**. Press \`T\` for the table of contents, \`A\` for paper themes and typography, or \`S\` to softly dim surrounding paragraphs in Focus Mode.

> Deep reading is not scanning text; it is giving one train of thought your undivided attention.

## Why CalMD Exists

Most web-based Markdown tools are split-pane editors filled with toolbars, export badges, and chrome. When you simply want to read a technical RFC, an essay, or a long README, you want a quiet page—not an IDE.

> [!TIP]
> Drop an **entire local folder** onto the window. CalMD resolves relative local images automatically and lets you switch quietly between multiple \`.md\` documents—all 100% locally in your browser.

## Technical Clarity, Quietly Rendered

Restraint never means stripped down. Technical writing renders cleanly without visual noise.

### Code Blocks

\`\`\`typescript
// CalMD renders everything locally in your browser
export function enterQuietReading(markdown: string): void {
  const article = renderMarkdown(markdown);
  document.documentElement.requestFullscreen?.();
  mountArticle(article);
}
\`\`\`

### Shortcuts & Checklist

| Key | Action | When to use |
| --- | --- | --- |
| \`F\` | Toggle fullscreen | Distraction-free deep reading |
| \`T\` | Table of contents | Jump across long sections |
| \`A\` | Typography & themes | Paper, Sepia, Mist, or Ink |
| \`S\` | Focus dim mode | Keep eyes anchored on one paragraph |
| \`1\` – \`4\` | Quick theme switch | Match ambient lighting instantly |

- [x] Pure client-side rendering with zero uploads
- [x] Fullscreen reading with auto-hiding chrome
- [x] GFM tables, alerts, code highlighting, KaTeX, and Mermaid
- [x] Local folder drag-and-drop with relative image resolution

### Mathematics (KaTeX)

Inline expressions such as $E = mc^2$ and scaled dot-product attention:

$$
\\operatorname{Attention}(Q, K, V) = \\operatorname{softmax}\\left(\\frac{Q K^\\top}{\\sqrt{d_k}}\\right) V
$$

### Diagram (Mermaid)

\`\`\`mermaid
flowchart LR
    A["Drop .md or Folder"] --> B["Local Parse & Sanitize"]
    B --> C["Editorial Typography"]
    C --> D["Press F for Fullscreen"]
\`\`\`

> [!NOTE]
> Recent documents and reading positions stay strictly inside your browser's local storage and can be cleared in one click.

---

Drag any local \`.md\` file into this window whenever you are ready.
`;

export function getSampleDoc(lang: Lang): { name: string; content: string } {
  return lang === 'zh'
    ? { name: '静下心来，只读文字.md', content: SAMPLE_DOC_ZH }
    : { name: 'Calm-Down-Sample.md', content: SAMPLE_DOC_EN };
}

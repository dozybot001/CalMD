export type Lang = 'zh' | 'en';

export interface Messages {
  tagline: string;
  dropTitle: string;
  dropHint: string;
  openFile: string;
  openFolder: string;
  pasteMd: string;
  trySample: string;
  privacyNote: string;
  recentTitle: string;
  clearRecent: string;
  backHome: string;
  toc: string;
  files: string;
  appearance: string;
  focusMode: string;
  focusHint: string;
  fullscreen: string;
  exitFullscreen: string;
  fullscreenToast: string;
  shortcuts: string;
  theme: string;
  themePaper: string;
  themeSepia: string;
  themeMist: string;
  themeInk: string;
  font: string;
  fontSerif: string;
  fontSans: string;
  fontMono: string;
  fontSize: string;
  measure: string;
  measureNarrow: string;
  measureStandard: string;
  measureWide: string;
  lineHeight: string;
  language: string;
  copy: string;
  copied: string;
  noHeadings: string;
  wordsCount: (n: number) => string;
  readTime: (min: number) => string;
  pasteModalTitle: string;
  pastePlaceholder: string;
  pasteConfirm: string;
  cancel: string;
  dropOverlay: string;
  unsupportedFile: string;
  emptyFolder: string;
  shortcutsTitle: string;
  scFullscreen: string;
  scToc: string;
  scAppearance: string;
  scFocus: string;
  scOpen: string;
  scFontSize: string;
  scThemes: string;
  scClose: string;
  calloutLabels: Record<'note' | 'tip' | 'important' | 'warning' | 'caution', string>;
}

const zh: Messages = {
  tagline: '纯粹、安静的浏览器端 Markdown 阅读器',
  dropTitle: '拖入 Markdown 文件或文件夹开始阅读',
  dropHint: '支持 .md / .markdown，拖入整个文件夹可自动加载本地图片；也可直接 Cmd/Ctrl + V 粘贴',
  openFile: '选择文件',
  openFolder: '打开文件夹',
  pasteMd: '粘贴文本',
  trySample: '试读示例文档',
  privacyNote: '100% 本地浏览器渲染 · 不联网、不上传任何文档',
  recentTitle: '最近阅读',
  clearRecent: '清空',
  backHome: '返回首页',
  toc: '目录',
  files: '文件',
  appearance: '排版',
  focusMode: '专注聚光',
  focusHint: '柔化非当前段落，聚焦眼前文字',
  fullscreen: '全屏沉浸',
  exitFullscreen: '退出全屏',
  fullscreenToast: '已进入全屏沉浸阅读 · 按 Esc 或 F 退出',
  shortcuts: '快捷键',
  theme: '纸张主题',
  themePaper: '素纸',
  themeSepia: '暖笺',
  themeMist: '微墨',
  themeInk: '静夜',
  font: '字体风格',
  fontSerif: '书卷衬线',
  fontSans: '清爽无衬线',
  fontMono: '等宽手稿',
  fontSize: '字号',
  measure: '版心宽度',
  measureNarrow: '窄页',
  measureStandard: '标准',
  measureWide: '宽幅',
  lineHeight: '行距',
  language: '语言',
  copy: '复制',
  copied: '已复制',
  noHeadings: '这篇文档没有标题目录',
  wordsCount: (n) => `${n.toLocaleString('zh-CN')} 字`,
  readTime: (min) => `约 ${min} 分钟`,
  pasteModalTitle: '粘贴 Markdown 开始阅读',
  pastePlaceholder: '在这里粘贴 Markdown 内容…',
  pasteConfirm: '开始阅读',
  cancel: '取消',
  dropOverlay: '松开即可安静阅读',
  unsupportedFile: '未找到可读的 Markdown 文件（支持 .md / .markdown / .mdx / .txt）',
  emptyFolder: '这个文件夹里没有找到 .md 文档',
  shortcutsTitle: '键盘快捷键',
  scFullscreen: '切换全屏沉浸模式',
  scToc: '展开 / 收起目录与文件栏',
  scAppearance: '打开 / 关闭排版设置',
  scFocus: '切换段落专注聚光模式',
  scOpen: '打开本地 Markdown 文件',
  scFontSize: '缩小 / 放大字号',
  scThemes: '切换 4 种纸张主题',
  scClose: '关闭浮层或退出全屏',
  calloutLabels: {
    note: '说明',
    tip: '提示',
    important: '重要',
    warning: '注意',
    caution: '警示',
  },
};

const en: Messages = {
  tagline: 'A pure, quiet Markdown reader in your browser',
  dropTitle: 'Drop a Markdown file or folder to read',
  dropHint: 'Supports .md / .markdown with local relative images in folders, or press Cmd/Ctrl + V to paste',
  openFile: 'Open File',
  openFolder: 'Open Folder',
  pasteMd: 'Paste Text',
  trySample: 'Read Sample',
  privacyNote: '100% local in your browser · No uploads, no tracking',
  recentTitle: 'Recently Read',
  clearRecent: 'Clear',
  backHome: 'Home',
  toc: 'Contents',
  files: 'Files',
  appearance: 'Typography',
  focusMode: 'Focus Dim',
  focusHint: 'Softly dims surrounding paragraphs while reading',
  fullscreen: 'Fullscreen',
  exitFullscreen: 'Exit Fullscreen',
  fullscreenToast: 'Immersive fullscreen · Press Esc or F to exit',
  shortcuts: 'Shortcuts',
  theme: 'Paper Theme',
  themePaper: 'Paper',
  themeSepia: 'Sepia',
  themeMist: 'Mist',
  themeInk: 'Ink',
  font: 'Typeface',
  fontSerif: 'Serif',
  fontSans: 'Sans',
  fontMono: 'Mono',
  fontSize: 'Font Size',
  measure: 'Line Width',
  measureNarrow: 'Narrow',
  measureStandard: 'Book',
  measureWide: 'Wide',
  lineHeight: 'Line Height',
  language: 'Language',
  copy: 'Copy',
  copied: 'Copied',
  noHeadings: 'No headings in this document',
  wordsCount: (n) => `${n.toLocaleString('en-US')} words`,
  readTime: (min) => `${min} min read`,
  pasteModalTitle: 'Paste Markdown to Read',
  pastePlaceholder: 'Paste your Markdown text here…',
  pasteConfirm: 'Start Reading',
  cancel: 'Cancel',
  dropOverlay: 'Release to read quietly',
  unsupportedFile: 'No readable Markdown file found (.md, .markdown, .mdx, .txt)',
  emptyFolder: 'No .md documents found in this folder',
  shortcutsTitle: 'Keyboard Shortcuts',
  scFullscreen: 'Toggle fullscreen reading',
  scToc: 'Toggle table of contents & files',
  scAppearance: 'Toggle typography panel',
  scFocus: 'Toggle paragraph focus mode',
  scOpen: 'Open a local Markdown file',
  scFontSize: 'Decrease / increase font size',
  scThemes: 'Switch between 4 paper themes',
  scClose: 'Close panels or exit fullscreen',
  calloutLabels: {
    note: 'Note',
    tip: 'Tip',
    important: 'Important',
    warning: 'Warning',
    caution: 'Caution',
  },
};

export const dictionaries: Record<Lang, Messages> = { zh, en };

export function detectDefaultLang(): Lang {
  const nav = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : 'zh';
  return nav.startsWith('zh') ? 'zh' : 'en';
}

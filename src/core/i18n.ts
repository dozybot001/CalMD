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
  measureCompact: string;
  measureNarrow: string;
  measureStandard: string;
  measureWide: string;
  measureFull: string;
  lineHeight: string;
  lhTight: string;
  lhNormal: string;
  lhRelaxed: string;
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
  missingLinkedDoc: (name: string) => string;
  liveReloadTip: string;
  liveReloadPausedTip: string;
  liveReloadResumedToast: string;
  noFileHandleToast: string;
  reloadedToast: string;
  upToDateToast: string;
  shortcutsTitle: string;
  scGroupNav: string;
  scGroupView: string;
  scGroupType: string;
  scFullscreen: string;
  scToc: string;
  scFiles: string;
  scAppearance: string;
  scFocus: string;
  scChrome: string;
  scHome: string;
  scOpen: string;
  scOpenFolder: string;
  scPaste: string;
  scReload: string;
  scFontSize: string;
  scMeasure: string;
  scLineHeight: string;
  scFont: string;
  scThemes: string;
  scDarkToggle: string;
  scScroll: string;
  scHeadings: string;
  scTopBottom: string;
  scPrevNextDoc: string;
  scClose: string;
  calloutLabels: Record<'note' | 'tip' | 'important' | 'warning' | 'caution', string>;
}

const zh: Messages = {
  tagline: '纯粹、安静的浏览器端 Markdown 阅读器',
  dropTitle: '拖入 Markdown 文件或文件夹开始阅读',
  dropHint: '支持 .md / .markdown，拖入整个文件夹可自动加载本地图片与文档互链；也可直接 Cmd/Ctrl + V 粘贴',
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
  fontSans: '无衬线',
  fontMono: '等宽手稿',
  fontSize: '字号',
  measure: '版心宽度',
  measureCompact: '极窄',
  measureNarrow: '窄页',
  measureStandard: '标准',
  measureWide: '宽幅',
  measureFull: '满幅',
  lineHeight: '行距',
  lhTight: '紧凑',
  lhNormal: '适中',
  lhRelaxed: '舒展',
  language: '语言',
  copy: '复制代码',
  copied: '已复制',
  noHeadings: '这篇文档没有标题目录',
  wordsCount: (n) => `${n.toLocaleString('zh-CN')} 字`,
  readTime: (min) => `${min} 分钟`,
  pasteModalTitle: '粘贴 Markdown 开始阅读',
  pastePlaceholder: '在这里粘贴 Markdown 内容…',
  pasteConfirm: '开始阅读',
  cancel: '取消',
  dropOverlay: '松开即可安静阅读',
  unsupportedFile: '未找到可读的 Markdown 文件（支持 .md / .markdown / .mdx / .txt）',
  emptyFolder: '这个文件夹里没有找到 .md 文档',
  missingLinkedDoc: (name) => `未找到“${name}”，请拖入或打开其所在的整个文件夹以支持文档跳转`,
  liveReloadTip: '实时热更新已开启 · 保存本地文件自动刷新（点击或按 R 立即刷新）',
  liveReloadPausedTip: '页面刷新后需重新授权文件监听 · 点击此处或按 R 恢复实时热更新',
  liveReloadResumedToast: '实时热更新已恢复',
  noFileHandleToast: '当前文档未绑定本地文件句柄 · 请重新拖入或按 O 选择文件以开启热更新',
  reloadedToast: '文档已热更新',
  upToDateToast: '已是最新内容',
  shortcutsTitle: '键盘快捷键',
  scGroupNav: '阅读导航',
  scGroupView: '沉浸与面板',
  scGroupType: '排版与文件',
  scFullscreen: '切换全屏沉浸模式',
  scToc: '展开 / 收起目录大纲',
  scFiles: '展开 / 收起文件夹文档列表',
  scAppearance: '打开 / 关闭排版设置',
  scFocus: '切换段落专注聚光模式',
  scChrome: '显示 / 隐藏顶部栏',
  scHome: '返回首页',
  scOpen: '打开本地 Markdown 文件',
  scOpenFolder: '打开本地文件夹',
  scPaste: '打开粘贴文本弹窗',
  scReload: '手动刷新当前本地文档',
  scFontSize: '缩小 / 放大字号',
  scMeasure: '切换版心宽度（5 档）',
  scLineHeight: '切换行距（紧凑 / 适中 / 舒展）',
  scFont: '切换字体风格',
  scThemes: '切换 4 种纸张主题',
  scDarkToggle: '日间 / 夜间主题快速切换',
  scScroll: '向下 / 向上平滑滚动',
  scHeadings: '跳至下一 / 上一章节',
  scTopBottom: '回到顶部 / 跳至文末',
  scPrevNextDoc: '切换文件夹内上一 / 下一篇文档',
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
  dropHint: 'Supports .md / .markdown with local images & relative links in folders, or press Cmd/Ctrl + V to paste',
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
  measureCompact: 'Compact',
  measureNarrow: 'Narrow',
  measureStandard: 'Book',
  measureWide: 'Wide',
  measureFull: 'Full',
  lineHeight: 'Line Spacing',
  lhTight: 'Tight',
  lhNormal: 'Normal',
  lhRelaxed: 'Relaxed',
  language: 'Language',
  copy: 'Copy code',
  copied: 'Copied',
  noHeadings: 'No headings in this document',
  wordsCount: (n) => `${n.toLocaleString('en-US')} words`,
  readTime: (min) => `${min} min`,
  pasteModalTitle: 'Paste Markdown to Read',
  pastePlaceholder: 'Paste your Markdown text here…',
  pasteConfirm: 'Start Reading',
  cancel: 'Cancel',
  dropOverlay: 'Release to read quietly',
  unsupportedFile: 'No readable Markdown file found (.md, .markdown, .mdx, .txt)',
  emptyFolder: 'No .md documents found in this folder',
  missingLinkedDoc: (name) => `"${name}" isn't loaded — open its parent folder to follow relative links`,
  liveReloadTip: 'Live reload active · Auto-updates on save (click or press R to reload)',
  liveReloadPausedTip: 'Live reload paused after refresh · Click or press R to reconnect',
  liveReloadResumedToast: 'Live reload reconnected',
  noFileHandleToast: 'No local file handle attached · Drop the file again or press O to enable live reload',
  reloadedToast: 'Document reloaded',
  upToDateToast: 'Already up to date',
  shortcutsTitle: 'Keyboard Shortcuts',
  scGroupNav: 'Reading & Navigation',
  scGroupView: 'Immersion & Panels',
  scGroupType: 'Typography & Files',
  scFullscreen: 'Toggle fullscreen reading',
  scToc: 'Toggle table of contents',
  scFiles: 'Toggle folder file list',
  scAppearance: 'Toggle typography panel',
  scFocus: 'Toggle paragraph focus mode',
  scChrome: 'Show / hide floating header',
  scHome: 'Return to home',
  scOpen: 'Open local Markdown file',
  scOpenFolder: 'Open local folder',
  scPaste: 'Open paste Markdown dialog',
  scReload: 'Reload current local document',
  scFontSize: 'Decrease / increase font size',
  scMeasure: 'Cycle line width (5 steps)',
  scLineHeight: 'Cycle line spacing',
  scFont: 'Cycle typeface',
  scThemes: 'Switch between 4 paper themes',
  scDarkToggle: 'Toggle light / dark paper theme',
  scScroll: 'Smooth scroll down / up',
  scHeadings: 'Jump to next / previous heading',
  scTopBottom: 'Jump to top / bottom',
  scPrevNextDoc: 'Previous / next file in folder',
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

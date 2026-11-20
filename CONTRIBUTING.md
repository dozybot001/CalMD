# Contributing to CalMD

[English](#english) | [简体中文](#简体中文)

## English

### Before you start

- Report bugs and suggest ideas in [issues](https://github.com/dozybot001/CalMD/issues/new/choose), using the templates. Security problems go through [SECURITY.md](SECURITY.md) instead.
- For anything bigger than a small fix, open an issue first so we can agree on the approach.
- CalMD keeps a few boundaries on purpose. Pull requests that cross them will not be merged:
  - It is a reader, not an editor: no editing toolbar or knowledge-base features
  - Everything runs in the browser: no backend, no uploads, and no third-party scripts loaded at runtime; dependencies are bundled into the build
  - Rendered Markdown is always sanitized with DOMPurify

### Development

Requires Node.js 20 or later.

```bash
npm install
npm run dev        # start the local dev server
npm test           # run the tests
npm run build      # type-check and build static files into dist/
```

```text
src/core/          Rendering and sanitizing, Mermaid, files and folders, storage, and Chinese and English copy
src/styles/        Theme tokens, reading typography and the app layout
src/main.ts        State, interactions and keyboard shortcuts
tests/             Unit tests
public/            Static files, including the CalMD logo
```

### Pull requests

- Run `npm test` and `npm run build` and make sure both pass. Add tests for new behaviour.
- Follow [AGENTS.md](AGENTS.md) (in Chinese). Interface text goes in both languages in `src/core/i18n.ts`. Check layout changes at widths from 375 to 1600 px.
- Update `README.md` and `README.zh-CN.md` together.
- For a change users can see, add a line under `Unreleased` in [CHANGELOG.md](CHANGELOG.md). Maintainers set the version when they release.

Everyone taking part follows the [Code of Conduct](CODE_OF_CONDUCT.md).

## 简体中文

### 动手之前

- 缺陷和建议请用模板开 [issue](https://github.com/dozybot001/CalMD/issues/new/choose)。安全问题不开 issue，按 [SECURITY.md](SECURITY.md) 报告。
- 比小修小补大的改动，先开 issue 商量做法。
- CalMD 有意守着几条边界，越过的 PR 不会合并：
  - 它是阅读器，不是编辑器：不加编辑工具栏和知识库功能
  - 全部在浏览器里运行：没有后端、不上传，运行时不加载第三方脚本，依赖都打包进产物
  - 渲染出来的 Markdown 一律经过 DOMPurify 净化

### 开发

需要 Node.js 20 及以上版本。

```bash
npm install
npm run dev        # 启动本地开发服务器
npm test           # 运行测试
npm run build      # 类型检查并构建纯静态文件到 dist/
```

```text
src/core/          渲染与净化、Mermaid、文件与文件夹、存储、中英文案
src/styles/        主题变量、阅读排版和界面布局
src/main.ts        状态、交互和快捷键
tests/             单元测试
public/            静态文件，含 CalMD 标志
```

### 提交 PR

- 运行 `npm test` 和 `npm run build`，都要通过；新行为要补测试。
- 按 [AGENTS.md](AGENTS.md) 的约定写代码。界面文字在 `src/core/i18n.ts` 里中英两份都改；改布局后在 375 到 1600 像素宽度下检查。
- 两份 README 一起改。
- 用户看得到的变化，在 [CHANGELOG.md](CHANGELOG.md) 的 `Unreleased` 下加一条，版本号由维护者发布时改。

参与的人都遵守[行为准则](CODE_OF_CONDUCT.md)。

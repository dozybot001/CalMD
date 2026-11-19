# CalMD

纯粹、安静的浏览器端 Markdown 阅读器。所有设计与功能取舍都服务于单一目标：**沉浸式阅读**。

## 产品边界

- **只读不写**：CalMD 是阅读器，不是双栏编辑器或知识库管理系统，不堆砌编辑工具栏。
- **100% 本地浏览器运行**：不建后端、不上传用户文档、不引入运行期第三方 CDN 脚本；所有依赖（markdown-it、highlight.js、KaTeX 字体、Mermaid、DOMPurify）全部静态打包进产物。
- **安全净化**：所有导入的 Markdown 渲染结果必须经过 `DOMPurify` 严格净化，阻断 `<script>`、`javascript:` 链接和内联事件处理器。
- **视觉克制**：界面控件在滚动或进入全屏后自动退场；弹窗与浮层遵循固定最大高度内部滚动原则；严禁页面横向溢出，改布局后需在 375–1600px 多宽度核验。

## 代码结构

- `src/core/`：与界面解耦的核心逻辑（Markdown/KaTeX 渲染与净化、Mermaid 按需渲染、本地文件与文件夹相对图片解析、本地偏好与 IndexedDB 存储、中英双语文案）。
- `src/styles/`：`tokens.css`（4 套主题与排版变量）、`prose.css`（书卷排版样式）、`app.css`（首页、自动隐藏顶栏、抽屉、浮层与响应式布局）。
- `src/main.ts`：状态管理、沉浸交互与快捷键编排。
- `tests/`：核心渲染、安全净化与路径解析单元测试。

## 改动后检查

- 运行 `npm test` 与 `npm run build`，确保 TypeScript 类型检查、单测与静态打包全部通过。
- 中英文界面文字保持同步（`src/core/i18n.ts`），用户可见改动同步更新 `CHANGELOG.md`、`README.md` 与 `README.zh-CN.md`。
- 仓库只保留本项目文件，不留临时输出或未说明的冗余文件。

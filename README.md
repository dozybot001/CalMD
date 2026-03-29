# CalMD

CalMD 是一个 `local-first`、`reading-first` 的 Markdown 阅读器。

它不试图把你带进编辑器、知识库或协作文档系统，而是把 Markdown 当作一份要认真阅读的内容来呈现。

## 特性

- 导入并阅读 `.md`、`.markdown`、`.txt` 文件
- 阅读模式与源码模式切换
- 目录导航、页内搜索、阅读进度
- 数学公式、Mermaid 图表、GFM 表格与任务列表
- 最近打开文稿与阅读位置记忆
- 深色 / 浅色主题与阅读宽度切换
- 将当前文稿导出为长图
- 全程本地处理，不依赖后端服务

## 技术栈

- React 19
- TypeScript
- Vite
- react-markdown
- KaTeX
- Mermaid

## 环境要求

- Node.js `20+`
- npm `10+`

## 本地开发

```bash
npm install
npm run dev
```

默认会启动 Vite 开发服务器。

## 构建与预览

```bash
npm run build
npm run preview
```

构建产物会输出到 `dist/`，可以直接部署到 GitHub Pages、Netlify、Vercel 或任意静态文件托管服务。

## 浏览器说明

- 推荐使用最新版 Chrome 或 Edge
- Safari 和 Firefox 可使用大部分核心阅读能力
- 通过系统“打开方式”直接打开 Markdown 文件依赖 File Handling API，目前仅 Chromium 系浏览器支持

## 隐私与数据

- 文稿内容只在当前浏览器中处理
- 最近文稿、阅读位置和主题偏好保存在浏览器本地存储中
- 不会自动上传到任何远端服务

## 贡献

欢迎提 issue 和 PR。提交前请至少确保：

- `npm run build` 可以通过
- 变更范围尽量聚焦
- 文档和交互说明与代码保持一致

更具体的流程见 [CONTRIBUTING.md](./.github/CONTRIBUTING.md)。

## License

本项目使用 `MIT` 许可证发布。详细条款见 [LICENSE](./LICENSE)。

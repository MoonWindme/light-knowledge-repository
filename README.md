# Markdown Notes

一个前后端分离的 Markdown 笔记软件，风格接近 Obsidian：左侧文件树，中间编辑器，右侧实时预览，暗色主题为主。

![界面预览](docs/screenshot.svg)

## 功能概览

- Obsidian 风格布局：文件树 / 编辑 / 预览
- 实时 Markdown 预览（GFM + 代码高亮 + 数学公式）
- 文件夹、笔记的创建 / 重命名 / 删除
- 近期打开记录、搜索过滤、快捷键
- Windows 桌面版（Electron）支持绿色版 EXE
- **AI 智能助手**：对话式交互，支持续写、翻译、润色、总结等功能
- **思维导图**：Markdown 自动转换为可交互的思维导图
- **PDF 导出**：支持导出文档和思维导图为 PDF/PNG

## 新功能 (v1.2)

### AI 智能助手
- 对话式 AI 交互界面，类似 ChatGPT
- 支持多种 AI 提供商：OpenAI、DeepSeek、智谱 GLM、Google Gemini、Moonshot、通义千问
- 快捷指令：续写、翻译、总结、润色
- AI 回复可一键插入到文档
- 快捷键 `Ctrl+Shift+A` 打开/关闭 AI 面板
- API Key 持久化存储，重启后自动加载

### 思维导图
- Markdown 标题自动转换为思维导图节点
- 支持缩放、拖拽交互
- 编辑器 + 思维导图分栏模式
- 导出思维导图为 PNG 图片

### PDF 导出
- 文档预览导出为 PDF
- 思维导图导出为 PDF
- 思维导图导出为 PNG 图片

## 技术栈

- 前端：React 18 + TypeScript + Vite + Zustand + CodeMirror 6
- 后端：Spring Boot 4 + 文件系统存储
- 桌面端：Electron + electron-builder

## 启动方式

### 后端（Spring Boot）

```bash
mvn spring-boot:run
```

默认监听 `http://localhost:8080`，数据目录默认在 `./notes`。

### 前端（Web）

```bash
cd frontend
npm install
npm run dev
```

访问 `http://localhost:5173`。

## 桌面版打包（Windows）

### 生成后端 JAR
```bash
mvn -DskipTests package
```

### 构建前端
```bash
cd frontend
npm run build
```

### 打包绿色版 EXE
```bash
cd desktop
npm install
npm run pack:portable
```

生成位置：`desktop/dist/Markdown Notes.exe`

## 配置

后端配置文件：`src/main/resources/application.yml`

```yaml
server:
  port: 8080

notes:
  root: ./notes
```

## 目录结构

```
frontend/   # React 前端
src/main/   # Spring Boot 后端
desktop/    # Electron 桌面打包
notes/      # 笔记数据（默认生成）
```

## License

MIT

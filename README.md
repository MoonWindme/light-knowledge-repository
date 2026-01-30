# Markdown Notes

一个前后端分离的 Markdown 笔记软件，风格接近 Obsidian：左侧文件树，中间编辑器，右侧实时预览，暗色主题为主。

![界面预览](docs/screenshot.svg)

## 功能概览

- Obsidian 风格布局：文件树 / 编辑 / 预览
- 实时 Markdown 预览（GFM + 代码高亮 + 数学公式）
- 文件夹、笔记的创建 / 重命名 / 删除
- 近期打开记录、搜索过滤、快捷键
- Windows 桌面版（Electron）支持绿色版 EXE

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

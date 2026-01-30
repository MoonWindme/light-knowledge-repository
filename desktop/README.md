# Markdown Notes Desktop

## 打包成 Windows 安装包

1. 在项目根目录生成后端 JAR
   ```bash
   mvn -DskipTests package
   ```

2. 在 `frontend` 目录构建前端
   ```bash
   npm run build
   ```

3. 在 `desktop` 目录安装依赖
   ```bash
   npm install
   ```

4. 打包生成 exe 安装包
   ```bash
   npm run pack
   ```

产物默认位于 `desktop/dist`，双击 `Markdown Notes Setup.exe` 安装后即可使用。

## 打包成免安装绿色版 EXE

在完成上述 1~3 步后执行：
```bash
npm run pack:portable
```

产物位于 `desktop/dist/Markdown Notes.exe`，可直接双击运行。

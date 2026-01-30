import { cpSync, existsSync, mkdirSync, rmSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const desktopRoot = path.resolve(__dirname, '..')
const frontendDist = path.resolve(desktopRoot, '..', 'frontend', 'dist')
const backendJar = path.resolve(desktopRoot, '..', 'target', 'markdown-viewer-1.0.0.jar')
const targetDist = path.resolve(desktopRoot, 'renderer')

if (!existsSync(frontendDist)) {
  console.error('未找到前端产物，请先在 frontend 目录执行 npm run build')
  process.exit(1)
}

if (!existsSync(backendJar)) {
  console.error('未找到后端 JAR，请先在项目根目录执行 mvn -DskipTests package')
  process.exit(1)
}

if (existsSync(targetDist)) {
  rmSync(targetDist, { recursive: true, force: true })
}

mkdirSync(targetDist, { recursive: true })
cpSync(frontendDist, targetDist, { recursive: true })

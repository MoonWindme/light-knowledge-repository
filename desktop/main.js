const { app, BrowserWindow, dialog, shell } = require('electron')
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

let backendProcess = null

function getBackendJarPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'backend', 'markdown-viewer.jar')
  }
  return path.join(__dirname, '..', 'target', 'markdown-viewer-1.0.0.jar')
}

function getNotesRoot() {
  return path.join(app.getPath('userData'), 'notes')
}

function startBackend() {
  const jarPath = getBackendJarPath()
  if (!fs.existsSync(jarPath)) {
    dialog.showErrorBox('后端未找到', `找不到后端 JAR：${jarPath}`)
    return
  }

  const args = ['-jar', jarPath, '--server.port=8080', `--notes.root=${getNotesRoot()}`]
  backendProcess = spawn('java', args, { stdio: 'ignore' })

  backendProcess.on('error', (error) => {
    dialog.showErrorBox('后端启动失败', `无法启动后端服务：${error.message}`)
  })

  backendProcess.on('exit', () => {
    backendProcess = null
  })
}

function stopBackend() {
  if (backendProcess) {
    backendProcess.kill()
    backendProcess = null
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#1a1a1a',
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  const devUrl = process.env.VITE_DEV_SERVER_URL
  if (devUrl) {
    win.loadURL(devUrl)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(path.join(__dirname, 'renderer', 'index.html'))
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(() => {
  startBackend()
  createWindow()
})

app.on('window-all-closed', () => {
  stopBackend()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('quit', stopBackend)

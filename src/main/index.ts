import {
  app,
  shell,
  BrowserWindow,
  screen,
  Tray,
  Menu,
  nativeImage,
  nativeTheme,
  ipcMain,
  dialog,
  Notification
} from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { spawn, ChildProcess } from 'child_process'
import { createInterface, Interface } from 'readline'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import Store from 'electron-store'

const store = new Store({
  defaults: {
    windowBounds: { x: undefined, y: undefined, width: 1200, height: 800 },
    windowMaximized: false,
    minimizeToTray: false,
    theme: 'system' as 'system' | 'light' | 'dark',
    recentFiles: [] as string[]
  }
})

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let ttsProcess: ChildProcess | null = null
let ttsReady = false
let ttsReadline: Interface | null = null
let pendingRequests: Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }> =
  new Map()
let requestId = 0

function getWindowBounds(): { x?: number; y?: number; width: number; height: number } {
  const saved = store.get('windowBounds') as { x?: number; y?: number; width: number; height: number }

  // Validate that saved position is still on a visible display
  if (saved.x !== undefined && saved.y !== undefined) {
    const displays = screen.getAllDisplays()
    const onScreen = displays.some((display) => {
      const { x, y, width, height } = display.bounds
      return saved.x! >= x && saved.x! < x + width && saved.y! >= y && saved.y! < y + height
    })
    if (!onScreen) {
      // Reset to center if saved position is off-screen (e.g. monitor disconnected)
      return { width: saved.width, height: saved.height }
    }
  }

  return saved
}

function createWindow(): void {
  const bounds = getWindowBounds()

  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1e1e1e' : '#ffffff',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // Center window if no saved position
  if (bounds.x === undefined || bounds.y === undefined) {
    mainWindow.center()
  }

  // Restore maximized state
  if (store.get('windowMaximized')) {
    mainWindow.maximize()
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  // Save window state on changes
  mainWindow.on('resize', saveWindowState)
  mainWindow.on('move', saveWindowState)
  mainWindow.on('maximize', () => store.set('windowMaximized', true))
  mainWindow.on('unmaximize', () => store.set('windowMaximized', false))

  mainWindow.on('close', (event) => {
    if (store.get('minimizeToTray') && tray) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Load the app
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function saveWindowState(): void {
  if (!mainWindow || mainWindow.isMaximized()) return
  const bounds = mainWindow.getBounds()
  store.set('windowBounds', bounds)
}

function createTray(): void {
  const iconPath = join(__dirname, '../../resources/icon.png')
  let trayIcon: Electron.NativeImage

  if (existsSync(iconPath)) {
    trayIcon = nativeImage.createFromPath(iconPath)
  } else {
    // Generate a simple 16x16 placeholder icon
    trayIcon = nativeImage.createEmpty()
    const size = { width: 16, height: 16 }
    const canvas = Buffer.alloc(size.width * size.height * 4, 0)
    // Fill with a solid color (blue-ish)
    for (let i = 0; i < size.width * size.height; i++) {
      canvas[i * 4] = 74 // R
      canvas[i * 4 + 1] = 158 // G
      canvas[i * 4 + 2] = 255 // B
      canvas[i * 4 + 3] = 255 // A
    }
    trayIcon = nativeImage.createFromBuffer(canvas, size)
  }

  tray = new Tray(trayIcon)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show TTS-Soundboard',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit()
      }
    }
  ])

  tray.setToolTip('TTS-Soundboard')
  tray.setContextMenu(contextMenu)

  tray.on('double-click', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })
}

function addToRecentFiles(filePath: string): void {
  const recent = store.get('recentFiles') as string[]
  const updated = [filePath, ...recent.filter((f) => f !== filePath)].slice(0, 10)
  store.set('recentFiles', updated)
}

// IPC handlers
function setupIPC(): void {
  // Theme
  ipcMain.handle('get-theme', () => {
    return store.get('theme')
  })

  ipcMain.handle('set-theme', (_event, theme: 'system' | 'light' | 'dark') => {
    store.set('theme', theme)
    nativeTheme.themeSource = theme
  })

  ipcMain.handle('get-system-dark-mode', () => {
    return nativeTheme.shouldUseDarkColors
  })

  // File operations
  ipcMain.handle('file:open', async () => {
    if (!mainWindow) return { canceled: true }
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Open TTS Project',
      filters: [
        { name: 'TTS Project', extensions: ['ttsp'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true }
    }
    const filePath = result.filePaths[0]
    try {
      const content = readFileSync(filePath, 'utf-8')
      const data = JSON.parse(content)
      addToRecentFiles(filePath)
      return { canceled: false, filePath, data }
    } catch (err) {
      return { canceled: false, error: `Failed to read file: ${(err as Error).message}` }
    }
  })

  ipcMain.handle('file:save', async (_event, filePath: string, data: unknown) => {
    try {
      writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
      addToRecentFiles(filePath)
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('file:save-as', async (_event, data: unknown) => {
    if (!mainWindow) return { canceled: true }
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save TTS Project',
      filters: [{ name: 'TTS Project', extensions: ['ttsp'] }],
      defaultPath: 'untitled.ttsp'
    })
    if (result.canceled || !result.filePath) {
      return { canceled: true }
    }
    try {
      writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf-8')
      addToRecentFiles(result.filePath)
      return { canceled: false, filePath: result.filePath }
    } catch (err) {
      return { canceled: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('file:recent', () => {
    return store.get('recentFiles') as string[]
  })

  ipcMain.handle('file:open-path', async (_event, filePath: string) => {
    try {
      const content = readFileSync(filePath, 'utf-8')
      const data = JSON.parse(content)
      addToRecentFiles(filePath)
      return { success: true, data }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // Notifications
  ipcMain.handle('notify', (_event, title: string, body: string) => {
    new Notification({ title, body }).show()
  })

  // TTS operations
  ipcMain.handle('tts:status', () => {
    return { ready: ttsReady }
  })

  ipcMain.handle('tts:list-voices', async () => {
    return sendTTSCommand({ cmd: 'list_voices' })
  })

  ipcMain.handle(
    'tts:synthesize',
    async (
      _event,
      params: {
        text: string
        voice_id?: string
        rate?: number
        volume?: number
        pitch?: number
        output?: string
      }
    ) => {
      return sendTTSCommand({ cmd: 'synthesize', ...params })
    }
  )

  ipcMain.handle(
    'tts:preview',
    async (
      _event,
      params: {
        text: string
        voice_id?: string
        rate?: number
        volume?: number
        pitch?: number
      }
    ) => {
      const result = await sendTTSCommand({ cmd: 'preview', ...params }) as { ok: boolean; output?: string; error?: string }
      if (result.ok && result.output) {
        try {
          const audioData = readFileSync(result.output)
          const dataUrl = `data:audio/wav;base64,${audioData.toString('base64')}`
          return { ok: true, dataUrl }
        } catch (err) {
          return { ok: false, error: `Failed to read audio file: ${(err as Error).message}` }
        }
      }
      return result
    }
  )

  ipcMain.handle('tts:export', async (_event, params: { text: string; voice_id?: string; rate?: number; volume?: number; pitch?: number; graph?: object }) => {
    if (!mainWindow) return { canceled: true }
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Audio',
      filters: [{ name: 'WAV Audio', extensions: ['wav'] }],
      defaultPath: 'dialogue.wav'
    })
    if (result.canceled || !result.filePath) {
      return { canceled: true }
    }
    const cmd = params.graph
      ? { cmd: 'process_graph', ...params, output: result.filePath }
      : { cmd: 'synthesize', ...params, output: result.filePath }
    const synthResult = await sendTTSCommand(cmd)
    return { canceled: false, ...synthResult as object }
  })

  // DSP node registry
  ipcMain.handle('tts:list-dsp-nodes', async () => {
    return sendTTSCommand({ cmd: 'list_dsp_nodes' })
  })

  // Process through DSP graph
  ipcMain.handle('tts:process-graph', async (_event, params: {
    text: string
    voice_id?: string
    rate?: number
    volume?: number
    graph: object
    output?: string
  }) => {
    const result = await sendTTSCommand({ cmd: 'process_graph', ...params }) as { ok: boolean; output?: string; error?: string }
    if (result.ok && result.output) {
      try {
        const audioData = readFileSync(result.output)
        const dataUrl = `data:audio/wav;base64,${audioData.toString('base64')}`
        return { ok: true, dataUrl }
      } catch (err) {
        return { ok: false, error: `Failed to read audio file: ${(err as Error).message}` }
      }
    }
    return result
  })
}

// --- TTS subprocess management ---

function getTTSScriptPath(): string {
  if (is.dev) {
    return join(__dirname, '../../python/tts_engine.py')
  }
  // In production, the script is bundled alongside the app
  return join(process.resourcesPath, 'python', 'tts_engine.py')
}

function spawnTTSProcess(): void {
  const scriptPath = getTTSScriptPath()
  if (!existsSync(scriptPath)) {
    console.error('TTS engine script not found:', scriptPath)
    return
  }

  ttsProcess = spawn('python', [scriptPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  })

  ttsReadline = createInterface({ input: ttsProcess.stdout! })

  // First line is the ready signal
  ttsReadline.once('line', (line) => {
    try {
      const msg = JSON.parse(line)
      if (msg.ok && msg.status === 'ready') {
        ttsReady = true
        console.log('TTS engine ready')
        mainWindow?.webContents.send('tts:ready')
      } else if (msg.error) {
        console.error('TTS engine init error:', msg.error)
      }
    } catch {
      console.error('TTS engine unexpected output:', line)
    }

    // After ready, handle subsequent responses
    ttsReadline!.on('line', handleTTSResponse)
  })

  ttsProcess.stderr!.on('data', (data: Buffer) => {
    console.error('TTS stderr:', data.toString())
  })

  ttsProcess.on('exit', (code) => {
    console.log('TTS process exited with code', code)
    ttsReady = false
    ttsProcess = null
    ttsReadline = null
    // Reject any pending requests
    for (const [, req] of pendingRequests) {
      req.reject(new Error('TTS process exited'))
    }
    pendingRequests.clear()
  })
}

function handleTTSResponse(line: string): void {
  // Responses come back in order, resolve the oldest pending request
  const firstKey = pendingRequests.keys().next().value
  if (firstKey === undefined) {
    console.warn('TTS response with no pending request:', line)
    return
  }
  const req = pendingRequests.get(firstKey)!
  pendingRequests.delete(firstKey)

  try {
    const response = JSON.parse(line)
    req.resolve(response)
  } catch {
    req.reject(new Error(`Invalid TTS response: ${line}`))
  }
}

function sendTTSCommand(cmd: object): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (!ttsProcess || !ttsReady) {
      reject(new Error('TTS engine not ready'))
      return
    }

    const id = requestId++
    pendingRequests.set(id, { resolve, reject })
    ttsProcess.stdin!.write(JSON.stringify(cmd) + '\n')
  })
}

function shutdownTTS(): void {
  if (ttsProcess && ttsReady) {
    ttsProcess.stdin!.write(JSON.stringify({ cmd: 'quit' }) + '\n')
    setTimeout(() => {
      if (ttsProcess) {
        ttsProcess.kill()
        ttsProcess = null
      }
    }, 2000)
  }
}

app.whenReady().then(() => {
  // Set app user model id for Windows
  electronApp.setAppUserModelId('com.tts-soundboard.app')

  // Default open or close DevTools by F12 in development
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  setupIPC()
  createWindow()
  createTray()
  spawnTTSProcess()

  app.on('activate', () => {
    // macOS: re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  shutdownTTS()
})

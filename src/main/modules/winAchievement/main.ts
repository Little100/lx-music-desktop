import path from 'node:path'
import { BrowserWindow, screen } from 'electron'
import { getPlatform } from '@common/utils'
import { mainSend } from '@common/mainIpc'
import { encodePath } from '@common/utils/electron'

let browserWindow: Electron.BrowserWindow | null = null

const getWindowBounds = () => {
  if (!global.envParams.workAreaSize) return { x: 0, y: 0, width: 320, height: 600 }
  const { width: screenWidth, height: screenHeight } = global.envParams.workAreaSize
  const offsetY = global.lx.appSetting['achievement.offsetY'] ?? 20
  const offsetX = global.lx.appSetting['achievement.offsetX'] ?? 20
  const winWidth = 320
  const winHeight = screenHeight - offsetY * 2
  const x = screenWidth - winWidth - offsetX
  return { x, y: offsetY, width: winWidth, height: winHeight }
}

interface AlwaysOnTopTools {
  timeout: NodeJS.Timeout | null
  startLoop: () => void
  clearLoop: () => void
}

export const alwaysOnTopTools: AlwaysOnTopTools = {
  timeout: null,
  startLoop() {
    this.clearLoop()
    this.timeout = setInterval(() => {
      if (!isExistWindow()) {
        this.clearLoop()
        return
      }
      browserWindow!.setAlwaysOnTop(true, 'screen-saver')
    }, 500)
  },
  clearLoop() {
    if (!this.timeout) return
    clearInterval(this.timeout)
    this.timeout = null
  },
}

const winEvent = () => {
  if (!browserWindow) return

  browserWindow.on('closed', () => {
    browserWindow = null
    alwaysOnTopTools.clearLoop()
  })

  browserWindow.once('ready-to-show', () => {
    browserWindow!.show()
    browserWindow!.blur()
    browserWindow!.setIgnoreMouseEvents(true)
    alwaysOnTopTools.startLoop()
  })
}

export const createWindow = () => {
  closeWindow()
  const { x, y, width, height } = getWindowBounds()

  const { shouldUseDarkColors, theme } = global.lx.theme

  browserWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    useContentSize: true,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    roundedCorners: false,
    show: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      contextIsolation: false,
      webSecurity: false,
      sandbox: false,
      nodeIntegration: true,
      enableWebSQL: false,
      webgl: false,
      spellcheck: false,
      backgroundThrottling: false,
    },
  })

  const winURL = process.env.NODE_ENV !== 'production'
    ? 'http://localhost:5211/achievement.html'
    : `file://${path.join(encodePath(__dirname), 'achievement.html')}`

  void browserWindow.loadURL(winURL + `?os=${getPlatform()}&dark=${shouldUseDarkColors}&theme=${encodeURIComponent(JSON.stringify(theme))}`)

  winEvent()

  browserWindow.webContents.on('did-finish-load', () => {
    console.log('[achievement] renderer loaded, URL:', browserWindow!.webContents.getURL())
  })

  browserWindow.webContents.on('did-fail-load', (_e, errorCode, errorDesc) => {
    console.error('[achievement] renderer load FAILED:', errorCode, errorDesc)
  })

  console.log('[achievement] window created at', { x, y, width, height }, 'URL:', winURL)
}

export const isExistWindow = (): boolean => !!browserWindow

export const closeWindow = () => {
  if (!browserWindow) return
  alwaysOnTopTools.clearLoop()
  browserWindow.close()
}

export const sendEvent = <T = any>(name: string, params?: T) => {
  if (!browserWindow) return
  mainSend(browserWindow, name, params)
}

export const getMainFrame = (): Electron.WebFrameMain | null => {
  if (!browserWindow) return null
  return browserWindow.webContents.mainFrame
}

export const setWindowPosition = (x: number, y: number) => {
  if (!browserWindow) return
  browserWindow.setPosition(x, y)
}

export const setWindowSize = (width: number, height: number) => {
  if (!browserWindow) return
  browserWindow.setSize(width, height)
}

export const getWindow = () => browserWindow

export const setAlwaysOnTop = (flag: boolean) => {
  if (!browserWindow) return
  browserWindow.setAlwaysOnTop(flag, 'screen-saver')
}

export const repositionWindow = () => {
  if (!browserWindow) return
  const { x, y, width, height } = getWindowBounds()
  browserWindow.setBounds({ x, y, width, height })
}

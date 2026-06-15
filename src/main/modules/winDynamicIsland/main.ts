import path from 'node:path'
import { BrowserWindow, screen } from 'electron'
import { getPlatform } from '@common/utils'
import { mainSend } from '@common/mainIpc'
import { encodePath } from '@common/utils/electron'
import { WIN_DYNAMIC_ISLAND_RENDERER_EVENT_NAME } from '@common/ipcNames'

let browserWindow: Electron.BrowserWindow | null = null

const POLL_INTERVAL = 80

// 获取屏幕工作区宽度
const getScreenWidth = () => global.envParams.workAreaSize?.width ?? 1920

// 根据胶囊宽度计算居中 x 坐标
const getCenteredX = (capsuleWidth: number) => {
  return Math.round((getScreenWidth() - capsuleWidth) / 2)
}

// 当前胶囊尺寸和 dock 状态
let currentWidth = 0
let currentHeight = 0
let isDocked = false

interface MouseTools {
  timer: NodeJS.Timeout | null
  isInside: boolean
  start: () => void
  stop: () => void
  check: () => void
}

export const mouseTools: MouseTools = {
  timer: null,
  isInside: false,

  check() {
    if (!browserWindow) return
    const point = screen.getCursorScreenPoint()
    const bounds = browserWindow.getBounds()
    // 窗口=胶囊, 直接检测鼠标是否在窗口矩形内
    const inside = (
      point.x >= bounds.x && point.x <= bounds.x + bounds.width &&
      point.y >= bounds.y && point.y <= bounds.y + bounds.height
    )
    if (inside !== this.isInside) {
      this.isInside = inside
      if (browserWindow) {
        mainSend(browserWindow, inside
          ? WIN_DYNAMIC_ISLAND_RENDERER_EVENT_NAME.mouse_enter
          : WIN_DYNAMIC_ISLAND_RENDERER_EVENT_NAME.mouse_leave,
        )
      }
    }
  },

  start() {
    this.stop()
    this.timer = setInterval(() => {
      this.check()
    }, POLL_INTERVAL)
  },

  stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    if (this.isInside) {
      this.isInside = false
      browserWindow?.webContents.send(WIN_DYNAMIC_ISLAND_RENDERER_EVENT_NAME.mouse_leave)
    }
  },
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
      browserWindow?.setAlwaysOnTop(true, 'screen-saver')
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
    mouseTools.stop()
    alwaysOnTopTools.clearLoop()
  })

  browserWindow.once('ready-to-show', () => {
    browserWindow!.show()
    if (global.lx.appSetting['dynamicIsland.isAlwaysOnTop'] && global.lx.appSetting['dynamicIsland.isAlwaysOnTopLoop']) {
      alwaysOnTopTools.startLoop()
    }
    browserWindow!.blur()
    // 鼠标穿透: 胶囊不拦截桌面点击; hover 检测由主进程轮询光标位置完成
    browserWindow!.setIgnoreMouseEvents(true)
    mouseTools.start()
  })
}

export const createWindow = () => {
  closeWindow()
  const collapsedWidth = global.lx.appSetting['dynamicIsland.collapsedWidth'] ?? 280
  const collapsedHeight = global.lx.appSetting['dynamicIsland.collapsedHeight'] ?? 48
  const offsetY = global.lx.appSetting['dynamicIsland.offsetY'] ?? 80
  const isAlwaysOnTop = global.lx.appSetting['dynamicIsland.isAlwaysOnTop'] ?? true
  const useAcrylic = global.lx.appSetting['dynamicIsland.useAcrylic'] ?? true

  currentWidth = collapsedWidth
  currentHeight = collapsedHeight
  isDocked = false

  const x = getCenteredX(collapsedWidth)
  const y = offsetY

  const { shouldUseDarkColors, theme } = global.lx.theme

  browserWindow = new BrowserWindow({
    width: collapsedWidth,
    height: collapsedHeight,
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
    alwaysOnTop: isAlwaysOnTop,
    skipTaskbar: true,
    backgroundColor: '#00000000',
    backgroundMaterial: useAcrylic ? 'acrylic' : 'none',
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
    ? 'http://localhost:9082/dynamic-island.html'
    : `file://${path.join(encodePath(__dirname), 'dynamic-island.html')}`

  void browserWindow.loadURL(winURL + `?os=${getPlatform()}&dark=${shouldUseDarkColors}&theme=${encodeURIComponent(JSON.stringify(theme))}`)

  winEvent()
  // browserWindow.webContents.openDevTools({ mode: 'detach' })
}

export const isExistWindow = (): boolean => !!browserWindow

export const closeWindow = () => {
  if (!browserWindow) return
  mouseTools.stop()
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

// 调整窗口尺寸为胶囊实际大小, 保持水平居中
export const resizeToCapsule = (width: number, height: number) => {
  if (!browserWindow) return
  if (width <= 0 || height <= 0) return
  currentWidth = Math.ceil(width)
  currentHeight = Math.ceil(height)
  const x = getCenteredX(currentWidth)
  const offsetY = global.lx.appSetting['dynamicIsland.offsetY'] ?? 80
  const y = isDocked ? 0 : offsetY
  browserWindow.setBounds({ x, y, width: currentWidth, height: currentHeight })
}

// dock 状态变化: 贴顶或恢复 offsetY
export const setDocked = (docked: boolean) => {
  if (!browserWindow) return
  isDocked = docked
  const x = getCenteredX(currentWidth)
  const offsetY = global.lx.appSetting['dynamicIsland.offsetY'] ?? 80
  const y = docked ? 0 : offsetY
  browserWindow.setBounds({ x, y, width: currentWidth, height: currentHeight })
}

// 配置变化导致 offsetY 改变时重新定位
export const relayoutCanvas = () => {
  if (!browserWindow) return
  const x = getCenteredX(currentWidth)
  const offsetY = global.lx.appSetting['dynamicIsland.offsetY'] ?? 80
  const y = isDocked ? 0 : offsetY
  browserWindow.setBounds({ x, y, width: currentWidth, height: currentHeight })
}

export const getWindow = () => browserWindow

export const setAlwaysOnTop = (flag: boolean) => {
  if (!browserWindow) return
  browserWindow.setAlwaysOnTop(flag, 'screen-saver')
}

export const setAcrylic = (enable: boolean) => {
  if (!browserWindow) return
  browserWindow.setBackgroundMaterial(enable ? 'acrylic' : 'none')
}

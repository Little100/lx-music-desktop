import path from 'node:path'
import { BrowserWindow, screen } from 'electron'
import { getPlatform } from '@common/utils'
import { mainSend } from '@common/mainIpc'
import { encodePath } from '@common/utils/electron'
import { WIN_DYNAMIC_ISLAND_RENDERER_EVENT_NAME } from '@common/ipcNames'

let browserWindow: Electron.BrowserWindow | null = null

const POLL_INTERVAL = 80

// 窗口画布: 一次性给足够宽度(容纳最宽歌词), 永不动态拉伸, 避免异步跳动
const getCanvasSize = () => {
  const expandedWidth = global.lx.appSetting['dynamicIsland.expandedWidth'] ?? 380
  const expandedHeight = global.lx.appSetting['dynamicIsland.expandedHeight'] ?? 220
  const offsetY = global.lx.appSetting['dynamicIsland.offsetY'] ?? 80
  const collapsedWidth = global.lx.appSetting['dynamicIsland.collapsedWidth'] ?? 280
  const screenWidth = global.envParams.workAreaSize?.width ?? 1920
  // 歌词态胶囊上限为屏宽 35%, 画布预留到 40% 确保容器居中不被边界影响
  const lyricCanvas = Math.round(screenWidth * 0.4)
  const width = Math.max(expandedWidth, collapsedWidth, lyricCanvas) + 40
  const height = offsetY + expandedHeight + 60
  return { width, height }
}

const getCanvasXY = (width: number) => {
  if (!global.envParams.workAreaSize) return { x: 0, y: 0 }
  const screenWidth = global.envParams.workAreaSize.width
  const x = Math.round((screenWidth - width) / 2)
  return { x, y: 0 }
}

// 渲染器上报的可见容器屏幕矩形, 用于精确鼠标检测
let visibleRect: { x: number, y: number, width: number, height: number } | null = null

export const setVisibleRect = (rect: { x: number, y: number, width: number, height: number } | null) => {
  visibleRect = rect
}

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
    if (!browserWindow || !visibleRect) return
    const point = screen.getCursorScreenPoint()
    const bounds = browserWindow.getBounds()
    // 容器矩形是相对窗口的, 换算到屏幕坐标
    const rx = bounds.x + visibleRect.x
    const ry = bounds.y + visibleRect.y
    const inside = (
      point.x >= rx && point.x <= rx + visibleRect.width &&
      point.y >= ry && point.y <= ry + visibleRect.height
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
    visibleRect = null
    mouseTools.stop()
    alwaysOnTopTools.clearLoop()
  })

  browserWindow.once('ready-to-show', () => {
    browserWindow!.show()
    if (global.lx.appSetting['dynamicIsland.isAlwaysOnTop'] && global.lx.appSetting['dynamicIsland.isAlwaysOnTopLoop']) {
      alwaysOnTopTools.startLoop()
    }
    browserWindow!.blur()
    // 全程鼠标穿透: 透明区域不拦截桌面点击; hover 检测由主进程轮询光标位置完成
    browserWindow!.setIgnoreMouseEvents(true)
    mouseTools.start()
  })
}

export const createWindow = () => {
  closeWindow()
  const { width, height } = getCanvasSize()
  const { x, y } = getCanvasXY(width)
  const isAlwaysOnTop = global.lx.appSetting['dynamicIsland.isAlwaysOnTop'] ?? true

  const { shouldUseDarkColors, theme } = global.lx.theme

  const useAcrylic = global.lx.appSetting['dynamicIsland.useAcrylic'] ?? true

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

// 重新计算画布尺寸并居中(仅在 offsetY/expandedWidth 等配置变化时调用)
export const relayoutCanvas = () => {
  if (!browserWindow) return
  const { width, height } = getCanvasSize()
  const { x, y } = getCanvasXY(width)
  browserWindow.setBounds({ x, y, width, height })
}

// 当前画布宽度, 避免重复 setBounds
let curCanvasWidth = 0

// 按渲染器需求确保画布足够宽(歌词超长时拉伸窗口), 始终保持居中
export const ensureCanvasWidth = (needWidth: number) => {
  if (!browserWindow) return
  const base = getCanvasSize()
  const target = Math.max(base.width, Math.ceil(needWidth) + 80)
  if (target === curCanvasWidth) return
  curCanvasWidth = target
  if (!global.envParams.workAreaSize) return
  const screenWidth = global.envParams.workAreaSize.width
  const x = Math.round((screenWidth - target) / 2)
  const bounds = browserWindow.getBounds()
  browserWindow.setBounds({ x, y: bounds.y, width: target, height: bounds.height })
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

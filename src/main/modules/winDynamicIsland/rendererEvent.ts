import { mainOn, mainHandle } from '@common/mainIpc'
import { WIN_DYNAMIC_ISLAND_RENDERER_EVENT_NAME } from '@common/ipcNames'
import { sendNewDesktopLyricClient } from '@main/modules/winMain'
import { getMainFrame, sendEvent, setVisibleRect, ensureCanvasWidth } from './main'
import { MessageChannelMain } from 'electron'

export default () => {
  mainHandle(WIN_DYNAMIC_ISLAND_RENDERER_EVENT_NAME.get_config, async() => {
    return buildIslandConfig(global.lx.appSetting)
  })

  mainHandle<Partial<LX.AppSetting>>(WIN_DYNAMIC_ISLAND_RENDERER_EVENT_NAME.set_config, async({ params: config }) => {
    global.lx.event_app.update_config(config)
  })

  // 渲染器上报可见容器矩形(相对窗口), 主进程据此做精确鼠标命中检测
  mainOn<{ x: number, y: number, width: number, height: number } | null>(WIN_DYNAMIC_ISLAND_RENDERER_EVENT_NAME.report_bounds, ({ params }) => {
    setVisibleRect(params)
  })

  // 渲染器请求的胶囊宽度, 超出基础画布时拉伸窗口
  mainOn<{ width: number }>(WIN_DYNAMIC_ISLAND_RENDERER_EVENT_NAME.set_size, ({ params }) => {
    if (params && typeof params.width === 'number') ensureCanvasWidth(params.width)
  })

  mainOn(WIN_DYNAMIC_ISLAND_RENDERER_EVENT_NAME.request_main_window_channel, ({ event }) => {
    if (event.senderFrame !== getMainFrame()) return
    const { port1, port2 } = new MessageChannelMain()
    sendNewDesktopLyricClient(port1)
    event.senderFrame?.postMessage(WIN_DYNAMIC_ISLAND_RENDERER_EVENT_NAME.provide_main_window_channel, null, [port2])
    console.log('winDynamicIsland: request_main_window_channel')
  })
}

const buildIslandConfig = (setting: LX.AppSetting): Partial<LX.AppSetting> => {
  const keys: Array<keyof LX.AppSetting> = [
    'dynamicIsland.enable',
    'dynamicIsland.offsetY',
    'dynamicIsland.collapsedWidth',
    'dynamicIsland.collapsedHeight',
    'dynamicIsland.expandedWidth',
    'dynamicIsland.expandedHeight',
    'dynamicIsland.autoHideInfoDelay',
    'dynamicIsland.mouseLeaveDelay',
    'dynamicIsland.hoverExpandDelay',
    'dynamicIsland.isAlwaysOnTop',
    'dynamicIsland.isAlwaysOnTopLoop',
    'dynamicIsland.audioVisualization',
    'dynamicIsland.visualizerAmplify',
    'dynamicIsland.autoVisualizerAmplify',
    'dynamicIsland.useAcrylic',
    'dynamicIsland.blur',
    'dynamicIsland.opacity',
    'dynamicIsland.animationSpeed',
    'dynamicIsland.lyricAlign',
    'dynamicIsland.alwaysShowLyric',
    'dynamicIsland.lyricMode',
    'dynamicIsland.pausedOpacity',
    'dynamicIsland.font',
    'common.langId',
    'player.isShowLyricTranslation',
    'player.isShowLyricRoma',
    'player.isSwapLyricTranslationAndRoma',
    'player.isPlayLxlrc',
    'player.playbackRate',
    'desktopLyric.style.font',
  ]
  const result: Partial<LX.AppSetting> = {}
  for (const key of keys) {
    ;(result as any)[key] = setting[key]
  }
  return result
}

export const sendConfigChange = (setting: Partial<LX.AppSetting>) => {
  sendEvent(WIN_DYNAMIC_ISLAND_RENDERER_EVENT_NAME.on_config_change, setting)
}

export const sendMainWindowInitedEvent = () => {
  sendEvent(WIN_DYNAMIC_ISLAND_RENDERER_EVENT_NAME.main_window_inited)
}

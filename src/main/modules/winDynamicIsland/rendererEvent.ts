import { mainOn, mainHandle } from '@common/mainIpc'
import { WIN_DYNAMIC_ISLAND_RENDERER_EVENT_NAME } from '@common/ipcNames'
import { sendNewDesktopLyricClient } from '@main/modules/winMain'
import { getMainFrame, sendEvent, resizeToCapsule, setDocked as setDockedPosition } from './main'
import { MessageChannelMain } from 'electron'

export default () => {
  mainHandle(WIN_DYNAMIC_ISLAND_RENDERER_EVENT_NAME.get_config, async() => {
    return buildIslandConfig(global.lx.appSetting)
  })

  mainHandle<Partial<LX.AppSetting>>(WIN_DYNAMIC_ISLAND_RENDERER_EVENT_NAME.set_config, async({ params: config }) => {
    global.lx.event_app.update_config(config)
  })

  // 渲染器上报胶囊实际尺寸, 主进程调整窗口大小并居中
  mainOn<{ width: number, height: number }>(WIN_DYNAMIC_ISLAND_RENDERER_EVENT_NAME.set_size, ({ params }) => {
    if (params && typeof params.width === 'number' && typeof params.height === 'number') {
      resizeToCapsule(params.width, params.height)
    }
  })

  // 渲染器通知 dock 状态变化
  mainOn<boolean>(WIN_DYNAMIC_ISLAND_RENDERER_EVENT_NAME.set_docked, ({ params }) => {
    if (typeof params === 'boolean') setDockedPosition(params)
  })

  // report_bounds 在新架构下不再需要复杂偏移, 保留兼容
  mainOn(WIN_DYNAMIC_ISLAND_RENDERER_EVENT_NAME.report_bounds, () => {})

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

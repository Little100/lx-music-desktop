import { mainOn, mainHandle } from '@common/mainIpc'
import { WIN_ACHIEVEMENT_RENDERER_EVENT_NAME } from '@common/ipcNames'
import { sendNewDesktopLyricClient } from '@main/modules/winMain'
import { getMainFrame, sendEvent } from './main'
import { MessageChannelMain } from 'electron'

export default () => {
  mainHandle(WIN_ACHIEVEMENT_RENDERER_EVENT_NAME.get_config, async() => {
    return buildAchievementConfig(global.lx.appSetting)
  })

  mainHandle<Partial<LX.AppSetting>>(WIN_ACHIEVEMENT_RENDERER_EVENT_NAME.set_config, async({ params: config }) => {
    global.lx.event_app.update_config(config)
  })

  mainOn(WIN_ACHIEVEMENT_RENDERER_EVENT_NAME.request_main_window_channel, ({ event }) => {
    if (event.senderFrame !== getMainFrame()) return
    const { port1, port2 } = new MessageChannelMain()
    sendNewDesktopLyricClient(port1)
    event.senderFrame?.postMessage(WIN_ACHIEVEMENT_RENDERER_EVENT_NAME.provide_main_window_channel, null, [port2])
  })
}

const buildAchievementConfig = (setting: LX.AppSetting): Partial<LX.AppSetting> => {
  const keys: Array<keyof LX.AppSetting> = [
    'achievement.enable',
    'achievement.fontSize',
    'achievement.offsetY',
    'achievement.offsetX',
    'achievement.duration',
    'achievement.opacity',
    'achievement.showCover',
    'achievement.enableSound',
    'achievement.soundVolume',
    'achievement.maxVisible',
    'achievement.pauseHide',
    'common.langId',
    'achievement.font',
  ]
  const result: Partial<LX.AppSetting> = {}
  for (const key of keys) {
    ;(result as any)[key] = setting[key]
  }
  return result
}

export const sendConfigChange = (setting: Partial<LX.AppSetting>) => {
  sendEvent(WIN_ACHIEVEMENT_RENDERER_EVENT_NAME.on_config_change, setting)
}

export const sendMainWindowInitedEvent = () => {
  sendEvent(WIN_ACHIEVEMENT_RENDERER_EVENT_NAME.main_window_inited)
}

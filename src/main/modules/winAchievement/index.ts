import initRendererEvent, { sendMainWindowInitedEvent } from './rendererEvent'
import { setAchievementConfig } from './config'
import { closeWindow, createWindow, isExistWindow } from './main'

export default () => {
  initRendererEvent()

  global.lx.event_app.on('main_window_inited', () => {
    if (global.lx.appSetting['achievement.enable']) {
      if (isExistWindow()) sendMainWindowInitedEvent()
      else createWindow()
    }
  })

  global.lx.event_app.on('updated_config', (keys: Array<keyof LX.AppSetting>, setting: Partial<LX.AppSetting>) => {
    setAchievementConfig(keys, setting)
  })

  global.lx.event_app.on('main_window_close', () => {
    closeWindow()
  })
}

export * from './main'
export * from './rendererEvent'

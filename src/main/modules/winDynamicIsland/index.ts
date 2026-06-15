import initRendererEvent, { sendMainWindowInitedEvent } from './rendererEvent'
import { setIslandConfig } from './config'
import { closeWindow, createWindow, isExistWindow } from './main'

export default () => {
  initRendererEvent()

  global.lx.event_app.on('main_window_inited', () => {
    if (global.lx.appSetting['dynamicIsland.enable']) {
      if (isExistWindow()) sendMainWindowInitedEvent()
      else createWindow()
    }
  })

  global.lx.event_app.on('updated_config', (keys: Array<keyof LX.AppSetting>, setting: Partial<LX.AppSetting>) => {
    setIslandConfig(keys, setting)
  })

  global.lx.event_app.on('main_window_close', () => {
    closeWindow()
  })
}

export * from './main'
export * from './rendererEvent'

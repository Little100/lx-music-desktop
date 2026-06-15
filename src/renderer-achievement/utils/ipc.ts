import { rendererInvoke, rendererSend, rendererOn, rendererOff } from '@common/rendererIpc'
import { WIN_ACHIEVEMENT_RENDERER_EVENT_NAME } from '@common/ipcNames'

type RemoveListener = () => void

export const getSetting = async () => {
  return rendererInvoke<LX.AppSetting>(WIN_ACHIEVEMENT_RENDERER_EVENT_NAME.get_config)
}

export const onSettingChanged = (listener: LX.IpcRendererEventListenerParams<Partial<LX.AppSetting>>): RemoveListener => {
  rendererOn<Partial<LX.AppSetting>>(WIN_ACHIEVEMENT_RENDERER_EVENT_NAME.on_config_change, listener)
  return () => {
    rendererOff(WIN_ACHIEVEMENT_RENDERER_EVENT_NAME.on_config_change, listener)
  }
}

export const sendConnectMainWindowEvent = () => {
  rendererSend(WIN_ACHIEVEMENT_RENDERER_EVENT_NAME.request_main_window_channel)
}

export const onProvideMainWindowChannel = (listener: LX.IpcRendererEventListener): RemoveListener => {
  rendererOn(WIN_ACHIEVEMENT_RENDERER_EVENT_NAME.provide_main_window_channel, listener)
  return () => {
    rendererOff(WIN_ACHIEVEMENT_RENDERER_EVENT_NAME.provide_main_window_channel, listener)
  }
}

export const onMainWindowInited = (listener: LX.IpcRendererEventListener): RemoveListener => {
  rendererOn(WIN_ACHIEVEMENT_RENDERER_EVENT_NAME.main_window_inited, listener)
  return () => {
    rendererOff(WIN_ACHIEVEMENT_RENDERER_EVENT_NAME.main_window_inited, listener)
  }
}

import { rendererSend, rendererInvoke, rendererOn, rendererOff } from '@common/rendererIpc'
import { WIN_DYNAMIC_ISLAND_RENDERER_EVENT_NAME } from '@common/ipcNames'

type RemoveListener = () => void

export const getSetting = async () => {
  return rendererInvoke<LX.AppSetting>(WIN_DYNAMIC_ISLAND_RENDERER_EVENT_NAME.get_config)
}

export const onSettingChanged = (listener: LX.IpcRendererEventListenerParams<Partial<LX.AppSetting>>): RemoveListener => {
  rendererOn<Partial<LX.AppSetting>>(WIN_DYNAMIC_ISLAND_RENDERER_EVENT_NAME.on_config_change, listener)
  return () => {
    rendererOff(WIN_DYNAMIC_ISLAND_RENDERER_EVENT_NAME.on_config_change, listener)
  }
}

export const sendConnectMainWindowEvent = () => {
  rendererSend(WIN_DYNAMIC_ISLAND_RENDERER_EVENT_NAME.request_main_window_channel)
}

export const onProvideMainWindowChannel = (listener: LX.IpcRendererEventListener): RemoveListener => {
  rendererOn(WIN_DYNAMIC_ISLAND_RENDERER_EVENT_NAME.provide_main_window_channel, listener)
  return () => {
    rendererOff(WIN_DYNAMIC_ISLAND_RENDERER_EVENT_NAME.provide_main_window_channel, listener)
  }
}

export const onMainWindowInited = (listener: LX.IpcRendererEventListener): RemoveListener => {
  rendererOn(WIN_DYNAMIC_ISLAND_RENDERER_EVENT_NAME.main_window_inited, listener)
  return () => {
    rendererOff(WIN_DYNAMIC_ISLAND_RENDERER_EVENT_NAME.main_window_inited, listener)
  }
}

export const onMouseEnter = (listener: () => void): RemoveListener => {
  const wrapped: LX.IpcRendererEventListener = () => listener()
  rendererOn(WIN_DYNAMIC_ISLAND_RENDERER_EVENT_NAME.mouse_enter, wrapped)
  return () => {
    rendererOff(WIN_DYNAMIC_ISLAND_RENDERER_EVENT_NAME.mouse_enter, wrapped)
  }
}

export const onMouseLeave = (listener: () => void): RemoveListener => {
  const wrapped: LX.IpcRendererEventListener = () => listener()
  rendererOn(WIN_DYNAMIC_ISLAND_RENDERER_EVENT_NAME.mouse_leave, wrapped)
  return () => {
    rendererOff(WIN_DYNAMIC_ISLAND_RENDERER_EVENT_NAME.mouse_leave, wrapped)
  }
}

export const sendSetDocked = (docked: boolean) => {
  rendererSend<boolean>(WIN_DYNAMIC_ISLAND_RENDERER_EVENT_NAME.set_docked, docked)
}

export const sendSetSize = (width: number, height: number) => {
  rendererSend<{ width: number, height: number }>(WIN_DYNAMIC_ISLAND_RENDERER_EVENT_NAME.set_size, { width, height })
}

export const sendReportBounds = (rect: { x: number, y: number, width: number, height: number } | null) => {
  rendererSend(WIN_DYNAMIC_ISLAND_RENDERER_EVENT_NAME.report_bounds, rect)
}

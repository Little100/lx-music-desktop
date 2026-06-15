import { createApp } from 'vue'
import App from './App.vue'

import '@root/common/error'
import { getSetting, onSettingChanged, onMainWindowInited, sendConnectMainWindowEvent } from './utils/ipc'
import { initSetting, mergeSetting } from './store/action'
import { init as initMainWindowChannel, getInfo } from './core/mainWindowChannel'
import { isConnected } from './store/state'

initMainWindowChannel()

void getSetting().then((setting) => {
  if (setting) {
    const languageId = (setting as any)['common.langId']
    if (languageId && typeof (window as any).setLang === 'function') {
      ;(window as any).setLang(languageId)
    }
    initSetting(setting)
  }

  onSettingChanged(({ params: newSetting }: { params: Partial<LX.AppSetting> }) => {
    mergeSetting(newSetting)
  })

  // 立即请求与主窗口的 MessageChannel 连接
  sendConnectMainWindowEvent()

  // 如果主窗口随后才初始化完成，重试连接
  onMainWindowInited(() => {
    if (!isConnected.value) {
      sendConnectMainWindowEvent()
    }
  })

  // 延时重试：如果连接仍未建立
  setTimeout(() => {
    if (!isConnected.value) {
      console.log('achievement: retrying channel connection')
      sendConnectMainWindowEvent()
    }
  }, 2000)

  const app = createApp(App)
  app.mount('#root')
})

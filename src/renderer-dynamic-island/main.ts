import { createApp } from 'vue'
import App from './App.vue'

import '@root/common/error'
import { getSetting, onSettingChanged, onMainWindowInited, sendConnectMainWindowEvent } from './utils/ipc'
import { initSetting, mergeSetting } from './store/action'
import { init as initMainWindowChannel } from './core/mainWindowChannel'

void getSetting().then((setting) => {
  if (setting) {
    const languageId = (setting as any)['common.langId']
    if (languageId && typeof (window as any).setLang === 'function') {
      ;(window as any).setLang(languageId)
    }
    initSetting(setting)
  }

  onSettingChanged(({ params: newSetting }) => {
    mergeSetting(newSetting)
  })

  onMainWindowInited(() => {
    sendConnectMainWindowEvent()
  })

  initMainWindowChannel()

  const app = createApp(App)
  app.mount('#root')
})

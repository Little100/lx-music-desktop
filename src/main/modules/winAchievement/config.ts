import { closeWindow, createWindow, isExistWindow, alwaysOnTopTools, repositionWindow } from './main'
import { sendConfigChange } from './rendererEvent'

const watchConfigKeys: Array<keyof LX.AppSetting> = [
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

export const setAchievementConfig = (keys: Array<keyof LX.AppSetting>, setting: Partial<LX.AppSetting>) => {
  if (!watchConfigKeys.some(key => keys.includes(key))) return

  if (isExistWindow()) {
    sendConfigChange(setting)

    if (keys.includes('achievement.offsetY') || keys.includes('achievement.offsetX')) {
      repositionWindow()
    }
  }

  if (keys.includes('achievement.enable')) {
    if (global.lx.appSetting['achievement.enable']) {
      if (!isExistWindow()) createWindow()
    } else {
      closeWindow()
    }
  }
}

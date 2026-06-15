import { closeWindow, createWindow, isExistWindow, alwaysOnTopTools, setAlwaysOnTop, relayoutCanvas } from './main'
import { sendConfigChange } from './rendererEvent'

const watchConfigKeys: Array<keyof LX.AppSetting> = [
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

export const setIslandConfig = (keys: Array<keyof LX.AppSetting>, setting: Partial<LX.AppSetting>) => {
  if (!watchConfigKeys.some(key => keys.includes(key))) return

  if (isExistWindow()) {
    sendConfigChange(setting)

    // 影响画布尺寸的配置变化时重新布局窗口
    if (keys.includes('dynamicIsland.expandedWidth') ||
        keys.includes('dynamicIsland.expandedHeight') ||
        keys.includes('dynamicIsland.collapsedWidth') ||
        keys.includes('dynamicIsland.offsetY')) {
      relayoutCanvas()
    }

    if (keys.includes('dynamicIsland.isAlwaysOnTop')) {
      setAlwaysOnTop(global.lx.appSetting['dynamicIsland.isAlwaysOnTop'])
      if (global.lx.appSetting['dynamicIsland.isAlwaysOnTop'] && global.lx.appSetting['dynamicIsland.isAlwaysOnTopLoop']) {
        alwaysOnTopTools.startLoop()
      } else {
        alwaysOnTopTools.clearLoop()
      }
    }

    if (keys.includes('dynamicIsland.isAlwaysOnTopLoop')) {
      if (!global.lx.appSetting['dynamicIsland.isAlwaysOnTop']) return
      if (global.lx.appSetting['dynamicIsland.isAlwaysOnTopLoop']) {
        alwaysOnTopTools.startLoop()
      } else {
        alwaysOnTopTools.clearLoop()
      }
    }
  }

  if (keys.includes('dynamicIsland.enable')) {
    if (global.lx.appSetting['dynamicIsland.enable']) {
      if (!isExistWindow()) createWindow()
    } else {
      closeWindow()
    }
  }
}

import { ref, shallowReactive } from '@common/utils/vueTools'

export const setting = shallowReactive<LX.AppSetting>({
  'achievement.enable': false,
  'achievement.fontSize': 14,
  'achievement.offsetY': 20,
  'achievement.offsetX': 20,
  'achievement.duration': 5000,
  'achievement.opacity': 85,
  'achievement.showCover': true,
  'achievement.enableSound': true,
  'achievement.soundVolume': 50,
  'achievement.maxVisible': 5,
  'achievement.pauseHide': false,
  'common.langId': 'zh-cn',
  'achievement.font': '',
} as unknown as LX.AppSetting)

export const musicInfo = shallowReactive({
  id: '',
  name: '',
  singer: '',
  pic: '',
})

export const isPlay = ref(false)

export const isConnected = ref(false)

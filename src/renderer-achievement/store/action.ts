import { setting, musicInfo, isPlay } from './state'

export const initSetting = (newSetting: Partial<LX.AppSetting>) => {
  mergeSetting(newSetting)
}

export const mergeSetting = (newSetting: Partial<LX.AppSetting>) => {
  for (const [key, value] of Object.entries(newSetting)) {
    ;(setting as any)[key] = value
  }
}

type MusicInfoKeys = keyof typeof musicInfo
const musicInfoKeys: MusicInfoKeys[] = Object.keys(musicInfo) as MusicInfoKeys[]

export const setMusicInfo = (_musicInfo: Partial<typeof musicInfo>) => {
  for (const key of musicInfoKeys) {
    const val = _musicInfo[key]
    if (val !== undefined) {
      ;(musicInfo as any)[key] = val
    }
  }
}

export const setIsPlay = (status: boolean) => {
  isPlay.value = status
}

import { setting, musicInfo, isPlay, uiState, lyricState, playTime, nextSongInfo, type LyricLine } from './state'

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

export const setExpanded = (val: boolean) => {
  uiState.isExpanded = val
}

export const setShowInfo = (val: boolean) => {
  uiState.showInfo = val
}

export const setMouseInside = (val: boolean) => {
  uiState.isMouseInside = val
}

export const setDocked = (val: boolean) => {
  uiState.isDocked = val
}

export const setLyricLines = (lines: LyricLine[]) => {
  lyricState.lines = lines
  lyricState.currentLine = 0
}

export const setCurrentLine = (index: number) => {
  lyricState.currentLine = Math.max(0, index)
}

export const setPlayTime = (played: number, duration: number) => {
  playTime.played = played
  playTime.duration = duration
}

// 设置即将播放的下一首歌预告
export const setNextSongInfo = (name: string, singer: string, pic: string) => {
  nextSongInfo.name = name
  nextSongInfo.singer = singer
  nextSongInfo.pic = pic
  nextSongInfo.active = true
}

// 清除下一首歌预告(切歌后)
export const clearNextSongInfo = () => {
  nextSongInfo.name = ''
  nextSongInfo.singer = ''
  nextSongInfo.pic = ''
  nextSongInfo.active = false
}

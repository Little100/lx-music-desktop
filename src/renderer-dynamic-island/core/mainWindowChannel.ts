import { onProvideMainWindowChannel } from '@island/utils/ipc'
import { onBeforeUnmount } from '@common/utils/vueTools'
import { setMusicInfo, setIsPlay, setLyricLines, setCurrentLine, setPlayTime, setNextSongInfo, clearNextSongInfo } from '../store/action'
import { play, pause, stop, setLyric, setPlaybackRate } from './lyric'
import { setting, playTime } from '@island/store/state'

let mainWindowPort: Electron.IpcRendererEvent['ports'][0] | null = null

export const sendIslandInfo = (action: string, data?: any) => {
  if (mainWindowPort == null) return
  mainWindowPort.postMessage({ action, data })
}

const listeners: Array<(event: any) => void> = []

const handleMessage = (event: any) => {
  switch (event.action) {
    case 'set_info':
      // 切歌到来: 清除下一首预告状态
      clearNextSongInfo()
      setMusicInfo({
        id: event.data.id ?? '',
        singer: event.data.singer ?? '',
        name: event.data.name ?? '',
        album: event.data.album ?? '',
        pic: event.data.pic ?? '',
      })
      setLyric({
        lyric: event.data.lrc ?? '',
        tlyric: event.data.tlrc,
        rlyric: event.data.rlrc,
        lxlyric: event.data.lxlrc,
      })
      break
    case 'set_pic':
      setMusicInfo({ pic: event.data.pic ?? '' })
      break
    case 'set_lyric':
      setLyric({
        lyric: event.data.lrc ?? '',
        tlyric: event.data.tlrc,
        rlyric: event.data.rlrc,
        lxlyric: event.data.lxlrc,
      })
      break
    case 'set_status':
      setIsPlay(event.data.isPlay)
      if (event.data.isPlay) play(event.data.played_time)
      else pause()
      if (event.data.played_time !== undefined) {
        setPlayTime(event.data.played_time, event.data.duration ?? 0)
      }
      break
    case 'set_play_time':
      setPlayTime(event.data.played, event.data.duration)
      break
    case 'set_pause':
      setIsPlay(false)
      pause()
      break
    case 'set_play':
      setIsPlay(true)
      play(event.data)
      // seek/切时间点: 同步播放进度基准, 保证卡拉OK着色立即跟随
      if (typeof event.data === 'number') {
        setPlayTime(event.data, playTime.duration)
      }
      break
    case 'set_stop':
      setIsPlay(false)
      stop()
      setLyricLines([])
      break
    case 'set_playbackRate':
      setPlaybackRate(event.data)
      break
    case 'set_next_song':
      // 收到即将播放的下一首歌信息
      setNextSongInfo(event.data.name ?? '', event.data.singer ?? '', event.data.pic ?? '')
      break
    default:
      for (const listener of listeners) {
        listener(event)
      }
      break
  }
}

export const init = () => {
  onProvideMainWindowChannel(({ event }) => {
    const [port] = event.ports
    mainWindowPort = port

    port.onmessage = ({ data }) => {
      handleMessage(data)
    }

    port.onmessageerror = (e: any) => {
      console.log('onmessageerror', e)
    }

    getInfo()
    getStatus()
  })
}

export const useEvent = (listener: (event: any) => void) => {
  listeners.push(listener)

  onBeforeUnmount(() => {
    listeners.splice(listeners.indexOf(listener), 1)
  })
}

export const getInfo = () => {
  sendIslandInfo('get_info')
}

export const getStatus = () => {
  sendIslandInfo('get_status')
}

export const getAnalyserDataArray = () => {
  sendIslandInfo('get_analyser_data_array')
}

// Re-export for use in action updates
export { setLyricLines, setCurrentLine }

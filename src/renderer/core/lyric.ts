import Lyric from '@common/utils/lyric-font-player'
import { getAnalyser, getCurrentTime as getPlayerCurrentTime, getDuration } from '@renderer/plugins/player'
import { lyric, setLines, setOffset, setTempOffset, setText } from '@renderer/store/player/lyric'
import { isPlay, musicInfo } from '@renderer/store/player/state'
import { setStatusText } from '@renderer/store/player/action'
import { markRawList } from '@common/utils/vueTools'
import { appSetting } from '@renderer/store/setting'
import { onNewDesktopLyricProcess } from '@renderer/utils/ipc'

const getCurrentTime = () => {
  return getPlayerCurrentTime() * 1000
}

let lrc: Lyric
// 支持多个桌面歌词/灵动岛客户端同时连接, 广播给所有
let desktopLyricPorts: Array<Electron.IpcRendererEvent['ports'][0]> = []
let achievementPort: Electron.IpcRendererEvent['ports'][0] | null = null
const analyserTools: {
  dataArray: Uint8Array
  bufferLength: number
  analyser: AnalyserNode | null
  sendDataArray: () => void
} = {
  dataArray: new Uint8Array(),
  bufferLength: 0,
  analyser: null,
  sendDataArray() {
    if (this.analyser == null) {
      this.analyser = getAnalyser()
      // console.log(this.analyser)
      if (!this.analyser) return
      this.bufferLength = this.analyser.frequencyBinCount
    }
    if (!desktopLyricPorts.length) return
    // 每个客户端单独拷贝一份(transfer 会转移所有权, 不能复用)
    for (const port of desktopLyricPorts) {
      const dataArray = new Uint8Array(this.bufferLength)
      this.analyser.getByteFrequencyData(dataArray)
      try {
        port.postMessage({ action: 'send_analyser_data_array', data: dataArray }, [dataArray.buffer])
      } catch (_e) {}
    }
  },
}

export const sendDesktopLyricInfo = (info: LX.DesktopLyric.LyricActions, transferList?: Transferable[]) => {
  if (!desktopLyricPorts.length) return
  for (const port of desktopLyricPorts) {
    try {
      if (transferList) port.postMessage(info, transferList)
      else port.postMessage(info)
    } catch (_e) {}
  }
}

export const sendAchievementInfo = (info: { action: string, data?: any }) => {
  if (achievementPort == null) return
  try {
    achievementPort.postMessage(info)
  } catch (_e) {
    achievementPort = null
  }
}

// 封面异步加载完成后单独补发给成就通知, 避免切歌瞬间封面为空
export const sendAchievementPic = () => {
  sendAchievementInfo({
    action: 'set_pic',
    data: {
      id: musicInfo.id,
      pic: musicInfo.pic,
    },
  })
  // 同时补发给灵动岛/桌面歌词端口
  sendDesktopLyricInfo({
    action: 'set_pic',
    data: {
      id: musicInfo.id,
      pic: musicInfo.pic,
    },
  } as any)
}
const postToPort = (port: Electron.IpcRendererEvent['ports'][0], info: any, transferList?: Transferable[]) => {
  try {
    if (transferList) port.postMessage(info, transferList)
    else port.postMessage(info)
  } catch (_e) {}
}

const handleClientMessage = (port: Electron.IpcRendererEvent['ports'][0], action: LX.DesktopLyric.WinMainActions) => {
  switch (action) {
    case 'get_info':
      postToPort(port, {
        action: 'set_info',
        data: {
          id: musicInfo.id,
          singer: musicInfo.singer,
          name: musicInfo.name,
          album: musicInfo.album,
          lrc: musicInfo.lrc,
          tlrc: musicInfo.tlrc,
          rlrc: musicInfo.rlrc,
          lxlrc: musicInfo.lxlrc,
          pic: musicInfo.pic,
          isPlay: isPlay.value,
          line: lyric.line,
          played_time: getCurrentTime(),
        },
      })
      break
    case 'get_status':
      postToPort(port, {
        action: 'set_status',
        data: {
          isPlay: isPlay.value,
          line: lyric.line,
          played_time: getCurrentTime(),
          duration: getDuration() * 1000,
        },
      })
      break
    case 'get_analyser_data_array': {
      if (analyserTools.analyser == null) {
        analyserTools.analyser = getAnalyser()
        if (!analyserTools.analyser) break
        analyserTools.bufferLength = analyserTools.analyser.frequencyBinCount
      }
      const dataArray = new Uint8Array(analyserTools.bufferLength)
      analyserTools.analyser.getByteFrequencyData(dataArray)
      postToPort(port, { action: 'send_analyser_data_array', data: dataArray }, [dataArray.buffer])
      break
    }
    default:
      break
  }
}
export const init = () => {
  lrc = new Lyric({
    shadowContent: false,
    onPlay(line, text) {
      setText(text, Math.max(line, 0))
      setStatusText(text)
      window.app_event.lyricLinePlay(text, line)
      // console.log(line, text)
    },
    onSetLyric(lines, offset) { // listening lyrics seting event
      // console.log(lines) // lines is array of all lyric text
      setLines(markRawList([...lines]))
      setText(lines[0] ?? '', 0)
      setOffset(offset) // 歌词延迟
      setTempOffset(0) // 重置临时延迟
    },
    onUpdateLyric(lines) {
      setLines(markRawList([...lines]))
      setText(lines[0] ?? '', 0)
    },
    rate: appSetting['player.playbackRate'],
    // offset: 80,
  })

  onNewDesktopLyricProcess(({ event }) => {
    console.log('onNewDesktopLyricProcess')
    const [port] = event.ports

    let identified = false
    const tempHandler = ({ data }: { data: any }) => {
      if (identified) return
      identified = true
      port.onmessage = null

      if (data.action === 'register_achievement') {
        achievementPort = port
        port.onmessage = ({ data: msg }: { data: any }) => {
          if (msg.action === 'get_info') {
            sendAchievementInfo({
              action: 'set_info',
              data: {
                id: musicInfo.id,
                singer: musicInfo.singer,
                name: musicInfo.name,
                pic: musicInfo.pic,
              },
            })
          }
        }
        sendAchievementInfo({
          action: 'set_info',
          data: {
            id: musicInfo.id,
            singer: musicInfo.singer,
            name: musicInfo.name,
            pic: musicInfo.pic,
          },
        })
      } else {
        // 桌面歌词或灵动岛客户端, 加入广播列表
        desktopLyricPorts.push(port)
        port.onmessage = ({ data: msg }: { data: any }) => {
          handleClientMessage(port, msg.action)
        }
        handleClientMessage(port, data.action)
      }
    }

    port.onmessage = tempHandler

    port.onmessageerror = (event) => {
      console.log('onmessageerror', event)
      const idx = desktopLyricPorts.indexOf(port)
      if (idx !== -1) desktopLyricPorts.splice(idx, 1)
      if (achievementPort === port) achievementPort = null
    }
  })
}

export const setLyricOffset = (offset: number) => {
  const tempOffset = offset - lyric.offset
  setTempOffset(tempOffset)
  lrc.setOffset(tempOffset)
  sendDesktopLyricInfo({
    action: 'set_offset',
    data: tempOffset,
  })

  if (isPlay.value) {
    setTimeout(() => {
      const time = getCurrentTime()
      sendDesktopLyricInfo({
        action: 'set_play',
        data: time,
      })
      lrc.play(time)
    })
  }
}

export const setPlaybackRate = (rate: number) => {
  lrc.setPlaybackRate(rate)

  if (isPlay.value) {
    setTimeout(() => {
      const time = getCurrentTime()
      lrc.play(time)
    })
  }
}

export const setLyric = () => {
  if (!musicInfo.id) return
  if (musicInfo.lrc) {
    const extendedLyrics = []
    if (appSetting['player.isShowLyricRoma'] && musicInfo.rlrc) extendedLyrics.push(musicInfo.rlrc)
    if (appSetting['player.isShowLyricTranslation'] && musicInfo.tlrc) extendedLyrics.push(musicInfo.tlrc)
    if (appSetting['player.isSwapLyricTranslationAndRoma']) extendedLyrics.reverse()

    lrc.setLyric(
      appSetting['player.isPlayLxlrc'] && musicInfo.lxlrc ? musicInfo.lxlrc : musicInfo.lrc,
      extendedLyrics,
    )
    sendDesktopLyricInfo({
      action: 'set_lyric',
      data: {
        lrc: musicInfo.lrc,
        tlrc: musicInfo.tlrc,
        rlrc: musicInfo.rlrc,
        lxlrc: musicInfo.lxlrc,
      },
    })
  }

  if (isPlay.value) {
    setTimeout(() => {
      const time = getCurrentTime()
      sendDesktopLyricInfo({ action: 'set_play', data: time })
      lrc.play(time)
    })
  }
}

export const setDisabledAutoPause = (disabledAutoPause: boolean) => {
  lrc.setDisabledAutoPause(disabledAutoPause)
}

let sources = new Map<string, boolean>()
let prevDisabled = false
export const setDisableAutoPauseBySource = (disabled: boolean, source: string) => {
  sources.set(source, disabled)
  const currentDisabled = Array.from(sources.values()).some(e => e)
  if (prevDisabled == currentDisabled) return
  prevDisabled = currentDisabled
  setDisabledAutoPause(currentDisabled)
}


export const play = () => {
  // if (!musicInfo.lrc) return
  const currentTime = getCurrentTime()
  lrc.play(currentTime)
  sendDesktopLyricInfo({ action: 'set_play', data: currentTime })
}

export const pause = () => {
  lrc.pause()
  sendDesktopLyricInfo({ action: 'set_pause' })
}

export const stop = () => {
  lrc.setLyric('')
  sendDesktopLyricInfo({ action: 'set_stop' })
  // setLines([])
  setText('', 0)
}

export const sendInfo = () => {
  sendDesktopLyricInfo({
    action: 'set_info',
    data: {
      id: musicInfo.id,
      singer: musicInfo.singer,
      name: musicInfo.name,
      album: musicInfo.album,
      lrc: musicInfo.lrc,
      tlrc: musicInfo.tlrc,
      rlrc: musicInfo.rlrc,
      lxlrc: musicInfo.lxlrc,
      pic: musicInfo.pic,
      isPlay: isPlay.value,
      line: lyric.line,
      played_time: getCurrentTime(),
    },
  })
  sendAchievementInfo({
    action: 'set_info',
    data: {
      id: musicInfo.id,
      singer: musicInfo.singer,
      name: musicInfo.name,
      pic: musicInfo.pic,
    },
  })
}

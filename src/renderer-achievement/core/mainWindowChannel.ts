import { onProvideMainWindowChannel } from '@achievement/utils/ipc'
import { setMusicInfo, setIsPlay } from '../store/action'
import { isConnected, musicInfo } from '../store/state'

let mainWindowPort: Electron.IpcRendererEvent['ports'][0] | null = null

const listeners: Array<(event: any) => void> = []

const handleMessage = (event: { action: string, data?: any }) => {
  switch (event.action) {
    case 'set_info':
      setMusicInfo({
        id: event.data.id,
        singer: event.data.singer,
        name: event.data.name,
        pic: event.data.pic ?? '',
      })
      break
    case 'set_pic':
      // 封面异步加载完成后单独更新, 仅当 id 匹配当前歌曲时生效
      if (event.data.id === musicInfo.id) {
        setMusicInfo({ pic: event.data.pic ?? '' })
      }
      break
    case 'set_status':
      setIsPlay(event.data.isPlay)
      break
    case 'set_pause':
      setIsPlay(false)
      break
    case 'set_play':
      setIsPlay(true)
      break
    case 'set_stop':
      setIsPlay(false)
      break
    default:
      for (const listener of listeners) {
        listener(event)
      }
      break
  }
}

export const init = () => {
  onProvideMainWindowChannel(({ event }: { event: any }) => {
    const [port] = event.ports
    mainWindowPort = port

    port.onmessage = ({ data }: { data: any }) => {
      handleMessage(data)
    }

    port.onmessageerror = (e: any) => {
      console.log('achievement onmessageerror', e)
    }

    // 通知主窗口这是成就通知端口
    port.postMessage({ action: 'register_achievement' })

    isConnected.value = true
    getInfo()
  })
}

export const getInfo = () => {
  if (mainWindowPort == null) return
  mainWindowPort.postMessage({ action: 'get_info' })
}

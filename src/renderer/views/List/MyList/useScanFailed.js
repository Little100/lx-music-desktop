import { ref, shallowRef } from '@common/utils/vueTools'
import { getListMusics } from '@renderer/store/list/action'
import { checkLocalFileAvailable } from '@renderer/utils/music'
import { getOnlineOtherSourceMusicUrlByLocal } from '@renderer/core/music/utils'
import { removeListMusics } from '@renderer/store/list/action'

export default () => {
  const isShowScanModal = ref(false)
  const scanProgress = ref({ current: 0, total: 0 })
  const scanResults = shallowRef([])
  const isScanning = ref(false)
  let scanListId = ''

  const startScan = async(listInfo) => {
    if (isScanning.value) return
    scanListId = listInfo.id
    isShowScanModal.value = true
    isScanning.value = true
    scanResults.value = []
    scanProgress.value = { current: 0, total: 0 }

    const musics = await getListMusics(listInfo.id)
    const localMusics = musics.filter(m => m.source === 'local')

    if (!localMusics.length) {
      isScanning.value = false
      scanProgress.value = { current: 0, total: 0 }
      return
    }

    scanProgress.value = { current: 0, total: localMusics.length }
    const failed = []

    for (const music of localMusics) {
      const fileExists = await checkLocalFileAvailable(music)
      if (!fileExists) {
        let sourceOk = false
        try {
          await getOnlineOtherSourceMusicUrlByLocal(music, false)
          sourceOk = true
        } catch {}
        if (!sourceOk) {
          failed.push({
            id: music.id,
            name: music.name,
            singer: music.singer,
            reason: 'file_missing',
          })
        }
      }
      scanProgress.value = { current: scanProgress.value.current + 1, total: localMusics.length }
    }

    scanResults.value = failed
    isScanning.value = false
  }

  const removeFailedMusics = async() => {
    if (!scanResults.value.length || !scanListId) return
    const ids = scanResults.value.map(r => r.id)
    await removeListMusics({ listId: scanListId, ids })
    scanResults.value = []
  }

  const closeScanModal = () => {
    isShowScanModal.value = false
  }

  return {
    isShowScanModal,
    scanProgress,
    scanResults,
    isScanning,
    startScan,
    removeFailedMusics,
    closeScanModal,
  }
}

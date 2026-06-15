<template>
  <div ref="dom_container" :class="$style.content" />
</template>

<script>
import { ref, onBeforeUnmount, onMounted, watch } from '@common/utils/vueTools'
import { getAnalyser, setAnalyserFftSize } from '@renderer/plugins/player'
import { isPlay } from '@renderer/store/player/state'
import { appSetting } from '@renderer/store/setting'
import { rendererInvoke } from '@common/rendererIpc'
import { WIN_MAIN_RENDERER_EVENT_NAME } from '@common/ipcNames'

let nativeVisualizer = null
try {
  const path = require('path')
  const addonPath = process.env.NODE_ENV === 'production'
    ? path.join(__dirname, 'visualizer.win32-x64.node')
    : path.join(__dirname, '../../../../native/visualizer/visualizer.win32-x64.node')
  nativeVisualizer = require(addonPath)
} catch (e) {
  console.warn('Native visualizer not available, using canvas fallback')
}

export default {
  setup() {
    const dom_container = ref(null)
    const analyser = getAnalyser()

    let isPlaying = false
    let animationFrameId = null
    let dataArray = null
    let nativeBuffer = null
    let bufferLength = 0
    let colorTimerId = null
    let initialized = false
    let lastFrameTime = 0

    const getSetting = (key, def) => appSetting[key] ?? def

    const sendSettings = () => {
      if (!nativeVisualizer || !initialized) return
      nativeVisualizer.setSettings({
        smoothing: getSetting('player.audioVisualization.smoothing', 80),
        heightScale: getSetting('player.audioVisualization.heightScale', 70),
        opacity: getSetting('player.audioVisualization.opacity', 30),
        amplitudeScale: getSetting('player.audioVisualization.amplitudeScale', 100),
        showBars: getSetting('player.audioVisualization.showBars', true),
        showWave: getSetting('player.audioVisualization.showWave', false),
        useLogScale: getSetting('player.audioVisualization.useLogScale', true),
        barCount: getSetting('player.audioVisualization.barCount', 128),
        barWidth: getSetting('player.audioVisualization.barWidth', 0),
        centerMirror: getSetting('player.audioVisualization.centerMirror', false),
      })
    }

    const sendColor = () => {
      if (!nativeVisualizer || !initialized) return
      const s = getComputedStyle(document.documentElement)
        .getPropertyValue('--color-primary-light-200-alpha-800').trim()
      const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
      if (m) nativeVisualizer.setColor(+m[1], +m[2], +m[3])
    }

    const pump = (timestamp) => {
      if (!analyser || !initialized || !isPlaying) return

      const targetFps = getSetting('player.audioVisualization.targetFps', 0)
      if (targetFps > 0) {
        const interval = 1000 / targetFps
        if (timestamp - lastFrameTime < interval) {
          animationFrameId = requestAnimationFrame(pump)
          return
        }
        lastFrameTime = timestamp - ((timestamp - lastFrameTime) % interval)
      }

      analyser.getByteFrequencyData(dataArray)
      nativeBuffer.set(dataArray)
      nativeVisualizer.updateFrame(nativeBuffer)

      animationFrameId = requestAnimationFrame(pump)
    }

    const handlePlay = () => {
      isPlaying = true
      const fft = getSetting('player.audioVisualization.fftSize', 2048)
      setAnalyserFftSize(fft)
      bufferLength = analyser.frequencyBinCount
      dataArray = new Uint8Array(bufferLength)
      nativeBuffer = Buffer.alloc(bufferLength)
      if (initialized) {
        nativeVisualizer.show()
        lastFrameTime = 0
        animationFrameId = requestAnimationFrame(pump)
      }
    }

    const handlePause = () => {
      if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null }
      isPlaying = false
    }

    const handleResize = () => {
      if (!initialized || !dom_container.value) return
      const rect = dom_container.value.getBoundingClientRect()
      nativeVisualizer.resize(
        Math.round(rect.left), Math.round(rect.top),
        Math.round(rect.width), Math.round(rect.height),
      )
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null }
      } else if (isPlaying && initialized) {
        lastFrameTime = 0
        animationFrameId = requestAnimationFrame(pump)
      }
    }

    watch(
      () => [
        appSetting['player.audioVisualization.smoothing'],
        appSetting['player.audioVisualization.heightScale'],
        appSetting['player.audioVisualization.opacity'],
        appSetting['player.audioVisualization.amplitudeScale'],
        appSetting['player.audioVisualization.showBars'],
        appSetting['player.audioVisualization.showWave'],
        appSetting['player.audioVisualization.useLogScale'],
        appSetting['player.audioVisualization.barCount'],
        appSetting['player.audioVisualization.barWidth'],
        appSetting['player.audioVisualization.centerMirror'],
      ],
      () => { sendSettings() },
    )

    watch(() => appSetting['player.audioVisualization.fftSize'], (v) => {
      if (isPlaying && v) {
        setAnalyserFftSize(v)
        bufferLength = analyser.frequencyBinCount
        dataArray = new Uint8Array(bufferLength)
        nativeBuffer = Buffer.alloc(bufferLength)
      }
    })

    window.app_event.on('play', handlePlay)
    window.app_event.on('pause', handlePause)
    window.app_event.on('error', handlePause)
    window.addEventListener('resize', handleResize)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    onBeforeUnmount(() => {
      handlePause()
      if (colorTimerId) { clearInterval(colorTimerId); colorTimerId = null }
      window.app_event.off('play', handlePlay)
      window.app_event.off('pause', handlePause)
      window.app_event.off('error', handlePause)
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (initialized) {
        nativeVisualizer.destroy()
        initialized = false
      }
    })

    onMounted(async() => {
      if (!nativeVisualizer) return

      const handleBytes = await rendererInvoke(WIN_MAIN_RENDERER_EVENT_NAME.get_native_window_handle)
      if (!handleBytes || handleBytes.length === 0) return

      const buf = Buffer.from(handleBytes)
      const hwnd = buf.length >= 8 ? Number(buf.readBigInt64LE(0)) : buf.readInt32LE(0)

      const container = dom_container.value
      const rect = container.getBoundingClientRect()

      initialized = nativeVisualizer.create(
        hwnd,
        Math.round(rect.left), Math.round(rect.top),
        Math.round(rect.width), Math.round(rect.height),
      )

      if (initialized) {
        sendSettings()
        sendColor()
        colorTimerId = setInterval(sendColor, 2000)
        if (isPlay.value) handlePlay()
      }
    })

    return { dom_container }
  },
}
</script>

<style lang="less" module>
.content {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 100;
}
</style>

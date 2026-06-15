<template>
  <div :class="$style.content">
    <canvas ref="dom_canvas" :class="$style.canvas" />
  </div>
</template>

<script>
import { ref, onBeforeUnmount, onMounted, watch } from '@common/utils/vueTools'
import { useEvent, getAnalyserDataArray } from '@lyric/core/mainWindowChannel'
import { isPlay, setting } from '@lyric/store/state'

export default {
  setup() {
    const dom_canvas = ref(null)

    let ctx, WIDTH, HEIGHT
    let isPlaying = false
    let animationFrameId
    let bars = []

    const get = (key, def) => setting[key] ?? def

    // 频谱映射（与主渲染器完全一致的算法）
    const mapFrequency = (data, numBars, mode) => {
      const result = new Float32Array(numBars)
      const len = data.length
      const usable = Math.max(16, Math.floor(len * 0.45))

      for (let i = 0; i < numBars; i++) {
        const t = i / numBars
        const binPos = mode === 'log'
          ? Math.pow(t, 0.55) * usable
          : t * usable
        const lo = Math.min(usable - 1, Math.floor(binPos))
        const hi = Math.min(usable - 1, lo + 1)
        const frac = binPos - lo
        result[i] = (data[lo] || 0) * (1 - frac) + (data[hi] || 0) * frac
      }
      return result
    }

    const calcFrequencyAvg = (data) => {
      const len = data.length
      let avg = 0
      for (let i = 0; i < len; i++) {
        const v = data[i] || 0
        if (v > 5) avg += v * 1.2
      }
      avg /= len
      avg *= 1.4
      avg = avg / 255
      return avg
    }

    useEvent((event) => {
      if (event.action == 'send_analyser_data_array') {
        render(event.data)
      }
    })

    const render = (dataArray) => {
      if (!ctx) return

      const smoothing = get('player.audioVisualization.smoothing', 80) / 100
      const heightScale = get('player.audioVisualization.heightScale', 70) / 100
      const opacity = get('player.audioVisualization.opacity', 30) / 100
      const amp = get('player.audioVisualization.amplitudeScale', 100) / 100
      const showBars = get('player.audioVisualization.showBars', true)
      const showWave = get('player.audioVisualization.showWave', false)
      const logScale = get('player.audioVisualization.useLogScale', true)
      const numBars = get('player.audioVisualization.barCount', 128)
      const userBarWidth = get('player.audioVisualization.barWidth', 0)
      const centerMirror = get('player.audioVisualization.centerMirror', false)

      ctx.clearRect(0, 0, WIDTH, HEIGHT)

      const mapped = mapFrequency(dataArray, numBars, logScale ? 'log' : 'linear')
      const frequencyAvg = calcFrequencyAvg(dataArray)

      if (bars.length !== numBars) {
        bars = Array.from({ length: numBars }, () => ({ value: 0, peak: 0, peakV: 0 }))
      }

      // 平滑 + 峰值 + 振幅（含频谱均值加成）
      const rise = 0.3 + (1 - smoothing) * 0.55
      const fall = 0.04 + (1 - smoothing) * 0.1
      for (let i = 0; i < numBars; i++) {
        const raw = mapped[i] / 255
        const boosted = raw * frequencyAvg + raw * 0.42
        const target = Math.min(1, boosted) * amp
        const b = bars[i]
        b.value += (target - b.value) * (target > b.value ? rise : fall)
        if (b.value > b.peak) { b.peak = b.value; b.peakV = 0 }
        else { b.peakV += 0.001; b.peak = Math.max(0, b.peak - b.peakV) }
      }

      const r = 255, g = 255, b2 = 255
      const maxH = HEIGHT * heightScale

      // 镜像模式：柱子铺满半宽，从中心向两侧对称绘制
      // 普通模式：柱子铺满全宽，从左到右绘制
      const layoutW = centerMirror ? Math.floor(WIDTH / 2) : WIDTH
      const gap = 1
      const totalGap = gap * (numBars - 1)
      // barWidth: 0=自动(铺满layoutW), >0=用户指定像素宽度
      const barW = userBarWidth > 0 ? userBarWidth : Math.max(1, (layoutW - totalGap) / numBars)
      const stepW = barW + gap
      const useGradient = barW > 3

      const drawBar = (x, v, h, a) => {
        if (h < 0.5) return
        const y = HEIGHT - h
        const va = (0.35 + v * 0.65) * a

        if (useGradient) {
          const gr = ctx.createLinearGradient(x, HEIGHT, x, y)
          gr.addColorStop(0, `rgba(${r},${g},${b2},${va * 0.08})`)
          gr.addColorStop(0.4, `rgba(${r},${g},${b2},${va * 0.5})`)
          gr.addColorStop(1, `rgba(${r},${g},${b2},${va})`)
          ctx.fillStyle = gr
          const rad = Math.min(barW * 0.3, 3)
          ctx.beginPath()
          ctx.moveTo(x, HEIGHT)
          ctx.lineTo(x, y + rad)
          ctx.quadraticCurveTo(x, y, x + rad, y)
          ctx.lineTo(x + barW - rad, y)
          ctx.quadraticCurveTo(x + barW, y, x + barW, y + rad)
          ctx.lineTo(x + barW, HEIGHT)
          ctx.closePath()
          ctx.fill()
          if (h > 4) {
            ctx.fillStyle = `rgba(${r},${g},${b2},${va * 0.5})`
            ctx.fillRect(x, y, barW, Math.min(1.5, h * 0.04))
          }
        } else {
          ctx.fillStyle = `rgba(${r},${g},${b2},${va * 0.7})`
          ctx.fillRect(x, y, barW, h)
        }
      }

      if (showBars) {
        const a = opacity
        if (centerMirror) {
          const center = WIDTH / 2
          for (let i = 0; i < numBars; i++) {
            const v = bars[i].value
            const h = Math.min(HEIGHT - 2, v * maxH)
            const offset = i * stepW
            drawBar(center + offset, v, h, a)
            drawBar(center - offset - barW, v, h, a)
            if (useGradient) {
              const ph = Math.min(HEIGHT - 2, bars[i].peak * maxH)
              if (ph > h + 3) {
                const py = HEIGHT - ph
                const pa = Math.max(0.08, 1 - bars[i].peakV * 8) * a * 0.6
                ctx.fillStyle = `rgba(${r},${g},${b2},${pa})`
                ctx.fillRect(center + offset, py, barW, 1.5)
                ctx.fillRect(center - offset - barW, py, barW, 1.5)
              }
            }
          }
        } else {
          for (let i = 0; i < numBars; i++) {
            const v = bars[i].value
            const h = Math.min(HEIGHT - 2, v * maxH)
            const x = i * stepW
            drawBar(x, v, h, a)
            if (useGradient) {
              const ph = Math.min(HEIGHT - 2, bars[i].peak * maxH)
              if (ph > h + 3) {
                const py = HEIGHT - ph
                const pa = Math.max(0.08, 1 - bars[i].peakV * 8) * a * 0.6
                ctx.fillStyle = `rgba(${r},${g},${b2},${pa})`
                ctx.fillRect(x, py, barW, 1.5)
              }
            }
          }
        }
      }

      if (showWave) {
        const wH = maxH * 0.6
        if (centerMirror) {
          const center = WIDTH / 2
          ctx.beginPath()
          ctx.moveTo(center, HEIGHT)
          for (let i = 0; i < numBars; i++) {
            const x = center + (i / (numBars - 1)) * layoutW
            const y = Math.max(0, HEIGHT - bars[i].value * wH)
            if (i === 0) ctx.lineTo(x, y)
            else {
              const px = center + ((i - 1) / (numBars - 1)) * layoutW
              ctx.quadraticCurveTo((px + x) / 2, Math.max(0, HEIGHT - bars[i - 1].value * wH), x, y)
            }
          }
          ctx.lineTo(center + layoutW, HEIGHT)
          ctx.closePath()
          ctx.moveTo(center, HEIGHT)
          for (let i = 0; i < numBars; i++) {
            const x = center - (i / (numBars - 1)) * layoutW
            const y = Math.max(0, HEIGHT - bars[i].value * wH)
            if (i === 0) ctx.lineTo(x, y)
            else {
              const px = center - ((i - 1) / (numBars - 1)) * layoutW
              ctx.quadraticCurveTo((px + x) / 2, Math.max(0, HEIGHT - bars[i - 1].value * wH), x, y)
            }
          }
          ctx.lineTo(center - layoutW, HEIGHT)
          ctx.closePath()
          const wg = ctx.createLinearGradient(0, HEIGHT - wH, 0, HEIGHT)
          wg.addColorStop(0, `rgba(${r},${g},${b2},${0.2 * opacity})`)
          wg.addColorStop(1, `rgba(${r},${g},${b2},${0.02 * opacity})`)
          ctx.fillStyle = wg
          ctx.fill()
          ctx.beginPath()
          for (let i = 0; i < numBars; i++) {
            const x = center + (i / (numBars - 1)) * layoutW
            const y = Math.max(0, HEIGHT - bars[i].value * wH)
            if (i === 0) ctx.moveTo(x, y)
            else {
              const px = center + ((i - 1) / (numBars - 1)) * layoutW
              ctx.quadraticCurveTo((px + x) / 2, Math.max(0, HEIGHT - bars[i - 1].value * wH), x, y)
            }
          }
          ctx.moveTo(center, Math.max(0, HEIGHT - bars[0].value * wH))
          for (let i = 1; i < numBars; i++) {
            const x = center - (i / (numBars - 1)) * layoutW
            const y = Math.max(0, HEIGHT - bars[i].value * wH)
            const px = center - ((i - 1) / (numBars - 1)) * layoutW
            ctx.quadraticCurveTo((px + x) / 2, Math.max(0, HEIGHT - bars[i - 1].value * wH), x, y)
          }
          ctx.strokeStyle = `rgba(${r},${g},${b2},${0.35 * opacity})`
          ctx.lineWidth = 1
          ctx.stroke()
        } else {
          ctx.beginPath()
          ctx.moveTo(0, HEIGHT)
          for (let i = 0; i < numBars; i++) {
            const x = (i / (numBars - 1)) * WIDTH
            const y = Math.max(0, HEIGHT - bars[i].value * wH)
            if (i === 0) ctx.lineTo(x, y)
            else {
              const px = ((i - 1) / (numBars - 1)) * WIDTH
              ctx.quadraticCurveTo((px + x) / 2, Math.max(0, HEIGHT - bars[i - 1].value * wH), x, y)
            }
          }
          ctx.lineTo(WIDTH, HEIGHT)
          ctx.closePath()
          const wg = ctx.createLinearGradient(0, HEIGHT - wH, 0, HEIGHT)
          wg.addColorStop(0, `rgba(${r},${g},${b2},${0.2 * opacity})`)
          wg.addColorStop(1, `rgba(${r},${g},${b2},${0.02 * opacity})`)
          ctx.fillStyle = wg
          ctx.fill()
          ctx.beginPath()
          for (let i = 0; i < numBars; i++) {
            const x = (i / (numBars - 1)) * WIDTH
            const y = Math.max(0, HEIGHT - bars[i].value * wH)
            if (i === 0) ctx.moveTo(x, y)
            else {
              const px = ((i - 1) / (numBars - 1)) * WIDTH
              ctx.quadraticCurveTo((px + x) / 2, Math.max(0, HEIGHT - bars[i - 1].value * wH), x, y)
            }
          }
          ctx.strokeStyle = `rgba(${r},${g},${b2},${0.35 * opacity})`
          ctx.lineWidth = 1
          ctx.stroke()
        }
      }

      animationFrameId = null
      if (isPlaying) animationFrameId = window.requestAnimationFrame(getAnalyserDataArray)
    }

    const handlePlay = () => {
      isPlaying = true
      bars = []
      getAnalyserDataArray()
    }
    const handlePause = () => {
      if (animationFrameId) window.cancelAnimationFrame(animationFrameId)
      isPlaying = false
    }
    const handleResize = () => {
      const c = dom_canvas.value
      if (!c) return
      c.width = c.clientWidth
      c.height = c.clientHeight
      WIDTH = c.width
      HEIGHT = c.height
    }

    watch(isPlay, (val) => { if (val) handlePlay(); else handlePause() })
    watch(() => setting['desktopLyric.audioVisualization'], (v) => { if (!v) handlePause() })
    watch(() => setting['player.audioVisualization.barCount'], () => { bars = [] })
    window.addEventListener('resize', handleResize)
    onBeforeUnmount(() => { handlePause(); window.removeEventListener('resize', handleResize) })

    onMounted(() => {
      const c = dom_canvas.value
      ctx = c.getContext('2d')
      c.width = c.clientWidth
      c.height = c.clientHeight
      WIDTH = c.width
      HEIGHT = c.height
      if (isPlay.value) handlePlay()
    })

    return { dom_canvas }
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
  z-index: -1;
}
.canvas {
  width: 100%;
  height: 100%;
}
</style>

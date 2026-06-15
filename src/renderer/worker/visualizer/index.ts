import type { WorkerInMessage, VisualizerSettings } from './types'
import { type Bar, mapFrequency, calcFrequencyAvg, smoothBars } from './smoothing'
import { WebGLBarsRenderer } from './renderer-webgl'
import { Canvas2DWaveRenderer } from './renderer-canvas2d'

let barsRenderer: WebGLBarsRenderer | null = null
let waveRenderer: Canvas2DWaveRenderer | null = null

let bars: Bar[] = []
let settings: VisualizerSettings = {
  smoothing: 80,
  heightScale: 70,
  opacity: 30,
  amplitudeScale: 100,
  showBars: true,
  showWave: false,
  useLogScale: true,
  barCount: 128,
  barWidth: 0,
  centerMirror: false,
}

let colorR = 120
let colorG = 180
let colorB = 140

const handleInit = (barsCanvas: OffscreenCanvas, waveCanvas: OffscreenCanvas, width: number, height: number, dpr: number) => {
  barsRenderer = new WebGLBarsRenderer()
  barsRenderer.init(barsCanvas, width, height, dpr)

  waveRenderer = new Canvas2DWaveRenderer()
  waveRenderer.init(waveCanvas, width, height, dpr)
}

const handleFrame = (buffer: ArrayBuffer) => {
  const data = new Uint8Array(buffer)
  const numBars = settings.barCount
  const mode = settings.useLogScale ? 'log' : 'linear'

  const mapped = mapFrequency(data, numBars, mode)
  const frequencyAvg = calcFrequencyAvg(data)
  smoothBars(bars, mapped, frequencyAvg, settings)

  if (settings.showBars && barsRenderer) {
    barsRenderer.render(bars, settings, colorR, colorG, colorB)
  } else if (barsRenderer) {
    barsRenderer.clear()
  }

  if (settings.showWave && waveRenderer) {
    waveRenderer.render(bars, settings, colorR, colorG, colorB)
  } else if (waveRenderer) {
    waveRenderer.clear()
  }

  ;(self as unknown as Worker).postMessage({ type: 'buffer-return', buffer }, [buffer])
}

const handleConfig = (newSettings: VisualizerSettings) => {
  if (newSettings.barCount !== settings.barCount) {
    bars = []
  }
  settings = newSettings
}

const handleResize = (width: number, height: number, dpr: number) => {
  if (barsRenderer) barsRenderer.resize(width, height, dpr)
  if (waveRenderer) waveRenderer.resize(width, height, dpr)
}

const handlePause = () => {
  if (barsRenderer) barsRenderer.clear()
  if (waveRenderer) waveRenderer.clear()
}

const handleDestroy = () => {
  if (barsRenderer) { barsRenderer.destroy(); barsRenderer = null }
  if (waveRenderer) { waveRenderer.destroy(); waveRenderer = null }
  bars = []
}

self.onmessage = (e: MessageEvent<WorkerInMessage>) => {
  const msg = e.data
  switch (msg.type) {
    case 'init':
      handleInit(msg.barsCanvas, msg.waveCanvas, msg.width, msg.height, msg.dpr)
      break
    case 'frame':
      handleFrame(msg.buffer)
      break
    case 'config':
      handleConfig(msg.settings)
      break
    case 'color':
      colorR = msg.r
      colorG = msg.g
      colorB = msg.b
      break
    case 'resize':
      handleResize(msg.width, msg.height, msg.dpr)
      break
    case 'pause':
      handlePause()
      break
    case 'destroy':
      handleDestroy()
      break
  }
}

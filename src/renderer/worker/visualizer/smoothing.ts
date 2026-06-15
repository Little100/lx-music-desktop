import type { VisualizerSettings } from './types'

export interface Bar {
  value: number
  peak: number
  peakV: number
}

let mappedBuffer: Float32Array | null = null
let mappedBufferSize = 0

export const mapFrequency = (data: Uint8Array, numBars: number, mode: 'log' | 'linear'): Float32Array => {
  if (mappedBufferSize !== numBars) {
    mappedBuffer = new Float32Array(numBars)
    mappedBufferSize = numBars
  }
  const result = mappedBuffer!
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

export const calcFrequencyAvg = (data: Uint8Array): number => {
  const len = data.length
  const step = len > 2048 ? Math.floor(len / 1024) : 1
  let avg = 0
  let count = 0
  for (let i = 0; i < len; i += step) {
    const v = data[i] || 0
    if (v > 5) avg += v * 1.2
    count++
  }
  avg /= count
  avg *= 1.4
  avg = avg / 255
  return avg
}

export const smoothBars = (
  bars: Bar[],
  mapped: Float32Array,
  frequencyAvg: number,
  settings: VisualizerSettings,
): void => {
  const numBars = settings.barCount
  const smoothing = settings.smoothing / 100
  const amp = settings.amplitudeScale / 100

  if (bars.length !== numBars) {
    bars.length = 0
    for (let i = 0; i < numBars; i++) {
      bars.push({ value: 0, peak: 0, peakV: 0 })
    }
  }

  const rise = 0.3 + (1 - smoothing) * 0.55
  const fall = 0.04 + (1 - smoothing) * 0.1

  for (let i = 0; i < numBars; i++) {
    const raw = mapped[i] / 255
    const boosted = raw * frequencyAvg + raw * 0.42
    const target = Math.min(1, boosted) * amp
    const b = bars[i]
    b.value += (target - b.value) * (target > b.value ? rise : fall)
    if (b.value > b.peak) {
      b.peak = b.value
      b.peakV = 0
    } else {
      b.peakV += 0.001
      b.peak = Math.max(0, b.peak - b.peakV)
    }
  }
}

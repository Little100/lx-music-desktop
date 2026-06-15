import type { RGBA } from './colorInterp'
import { toRGBAString } from './colorInterp'

export type AmbientMode = 'off' | 'drift' | 'pulse' | 'rhythm' | 'combined'
export type AmbientLevel = 'low' | 'medium' | 'high'

interface AmbientConfig {
  fps: number
  driftSpeed: number
  pulseSpeed: number
  positionRange: number
}

// 性能等级对应的配置参数
const LEVEL_CONFIG: Record<AmbientLevel, AmbientConfig> = {
  low: { fps: 20, driftSpeed: 0.0003, pulseSpeed: 0.0008, positionRange: 8 },
  medium: { fps: 35, driftSpeed: 0.0005, pulseSpeed: 0.0012, positionRange: 15 },
  high: { fps: 60, driftSpeed: 0.0008, pulseSpeed: 0.0018, positionRange: 22 },
}

interface DriftState {
  // 每个颜色块的位移角度
  angles: number[]
  // 每个颜色块的位移速度系数
  speeds: number[]
}

interface PulseState {
  phase: number
}

interface AmbientAnimationState {
  rafId: number | null
  lastFrameTime: number
  drift: DriftState
  pulse: PulseState
  baseColors: RGBA[]
  running: boolean
}

export interface AmbientCallbackData {
  // 颜色字符串数组(供 style 绑定)
  colors: string[]
  // 位置偏移(百分比, 供 gradient 位置调整)
  offsets: { x: number; y: number }[]
  // 透明度缩放因子
  opacityScale: number
}

// 生成随机初始角度
function randomAngles(count: number): number[] {
  return Array.from({ length: count }, () => Math.random() * Math.PI * 2)
}

// 生成随机速度系数(围绕1.0的小范围浮动)
function randomSpeeds(count: number): number[] {
  return Array.from({ length: count }, () => 0.7 + Math.random() * 0.6)
}

// 漂移动画: 颜色块位置缓慢移动
function computeDrift(state: DriftState, config: AmbientConfig, elapsed: number): { x: number; y: number }[] {
  return state.angles.map((angle, i) => {
    const speed = state.speeds[i]
    const t = elapsed * config.driftSpeed * speed
    const currentAngle = angle + t
    return {
      x: Math.sin(currentAngle) * config.positionRange,
      y: Math.cos(currentAngle * 0.7 + i) * config.positionRange * 0.6,
    }
  })
}

// 呼吸脉动: 透明度和尺寸周期变化
function computePulse(state: PulseState, config: AmbientConfig, elapsed: number): number {
  const t = elapsed * config.pulseSpeed + state.phase
  // 呼吸感: sin + 小幅二次谐波
  return 0.85 + 0.15 * Math.sin(t) + 0.05 * Math.sin(t * 2.3)
}

// 音乐律动: 基于外部音频数据的响应
function computeRhythm(audioEnergy: number): { colorShift: number; opacityBoost: number } {
  const clamped = Math.min(1, Math.max(0, audioEnergy))
  return {
    colorShift: clamped * 0.15,
    opacityBoost: clamped * 0.25,
  }
}

// 对颜色应用亮度/饱和度偏移
function shiftColor(color: RGBA, shift: number): RGBA {
  const factor = 1 + shift
  return {
    r: Math.min(255, Math.round(color.r * factor)),
    g: Math.min(255, Math.round(color.g * factor)),
    b: Math.min(255, Math.round(color.b * factor)),
    a: color.a,
  }
}

export function createAmbientAnimation(
  mode: AmbientMode,
  level: AmbientLevel,
  baseColors: RGBA[],
  callback: (data: AmbientCallbackData) => void,
  getAudioEnergy?: () => number,
): { cancel: () => void; updateColors: (colors: RGBA[]) => void; updateMode: (m: AmbientMode) => void; updateLevel: (l: AmbientLevel) => void } {
  const colorCount = baseColors.length

  const state: AmbientAnimationState = {
    rafId: null,
    lastFrameTime: 0,
    drift: {
      angles: randomAngles(colorCount),
      speeds: randomSpeeds(colorCount),
    },
    pulse: {
      phase: Math.random() * Math.PI * 2,
    },
    baseColors: [...baseColors],
    running: false,
  }

  let currentMode = mode
  let currentConfig = LEVEL_CONFIG[level]
  let startTime = performance.now()

  const tick = () => {
    if (!state.running) return
    const now = performance.now()
    const frameInterval = 1000 / currentConfig.fps
    if (now - state.lastFrameTime < frameInterval) {
      state.rafId = requestAnimationFrame(tick)
      return
    }
    state.lastFrameTime = now
    const elapsed = now - startTime

    let offsets: { x: number; y: number }[] = state.baseColors.map(() => ({ x: 0, y: 0 }))
    let opacityScale = 1
    let colors = state.baseColors

    // 漂移模式
    if (currentMode === 'drift' || currentMode === 'combined') {
      offsets = computeDrift(state.drift, currentConfig, elapsed)
    }

    // 脉动模式
    if (currentMode === 'pulse' || currentMode === 'combined') {
      opacityScale = computePulse(state.pulse, currentConfig, elapsed)
    }

    // 音乐律动模式
    if (currentMode === 'rhythm' || currentMode === 'combined') {
      const energy = getAudioEnergy ? getAudioEnergy() : 0
      const rhythmData = computeRhythm(energy)
      colors = state.baseColors.map(c => shiftColor(c, rhythmData.colorShift))
      opacityScale *= (1 + rhythmData.opacityBoost)
    }

    // 拼装回调数据
    const colorStrings = colors.map((c) => {
      const alpha = Math.min(1, c.a * opacityScale)
      return toRGBAString({ ...c, a: +alpha.toFixed(3) })
    })

    callback({ colors: colorStrings, offsets, opacityScale })
    state.rafId = requestAnimationFrame(tick)
  }

  const start = () => {
    if (currentMode === 'off') return
    state.running = true
    startTime = performance.now()
    state.lastFrameTime = 0
    state.rafId = requestAnimationFrame(tick)
  }

  const cancel = () => {
    state.running = false
    if (state.rafId != null) {
      cancelAnimationFrame(state.rafId)
      state.rafId = null
    }
  }

  const updateColors = (colors: RGBA[]) => {
    state.baseColors = [...colors]
    // 保持 drift 状态连续性, 如果颜色数量变化则重新初始化
    if (colors.length !== state.drift.angles.length) {
      state.drift.angles = randomAngles(colors.length)
      state.drift.speeds = randomSpeeds(colors.length)
    }
  }

  const updateMode = (m: AmbientMode) => {
    currentMode = m
    if (m === 'off') {
      cancel()
    } else if (!state.running) {
      start()
    }
  }

  const updateLevel = (l: AmbientLevel) => {
    currentConfig = LEVEL_CONFIG[l]
  }

  start()

  return { cancel, updateColors, updateMode, updateLevel }
}

export interface VisualizerSettings {
  smoothing: number
  heightScale: number
  opacity: number
  amplitudeScale: number
  showBars: boolean
  showWave: boolean
  useLogScale: boolean
  barCount: number
  barWidth: number
  centerMirror: boolean
}

export interface InitMessage {
  type: 'init'
  barsCanvas: OffscreenCanvas
  waveCanvas: OffscreenCanvas
  width: number
  height: number
  dpr: number
}

export interface FrameMessage {
  type: 'frame'
  buffer: ArrayBuffer
}

export interface ConfigMessage {
  type: 'config'
  settings: VisualizerSettings
}

export interface ResizeMessage {
  type: 'resize'
  width: number
  height: number
  dpr: number
}

export interface ColorMessage {
  type: 'color'
  r: number
  g: number
  b: number
}

export interface PauseMessage {
  type: 'pause'
}

export interface DestroyMessage {
  type: 'destroy'
}

export type WorkerInMessage =
  | InitMessage
  | FrameMessage
  | ConfigMessage
  | ResizeMessage
  | ColorMessage
  | PauseMessage
  | DestroyMessage

export interface BufferReturnMessage {
  type: 'buffer-return'
  buffer: ArrayBuffer
}

export type WorkerOutMessage = BufferReturnMessage

import type { VisualizerSettings } from './types'
import type { Bar } from './smoothing'

export class Canvas2DWaveRenderer {
  private ctx: OffscreenCanvasRenderingContext2D | null = null
  private canvas: OffscreenCanvas | null = null
  private width = 0
  private height = 0
  private dpr = 1

  init(canvas: OffscreenCanvas, width: number, height: number, dpr: number): boolean {
    this.canvas = canvas
    this.width = width
    this.height = height
    this.dpr = dpr
    canvas.width = width * dpr
    canvas.height = height * dpr

    const ctx = canvas.getContext('2d')
    if (!ctx) return false
    this.ctx = ctx
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    return true
  }

  resize(width: number, height: number, dpr: number): void {
    this.width = width
    this.height = height
    this.dpr = dpr
    if (this.canvas) {
      this.canvas.width = width * dpr
      this.canvas.height = height * dpr
    }
    if (this.ctx) {
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
  }

  render(bars: Bar[], settings: VisualizerSettings, colorR: number, colorG: number, colorB: number): void {
    const ctx = this.ctx
    if (!ctx) return

    const WIDTH = this.width
    const HEIGHT = this.height
    const numBars = settings.barCount
    const opacity = settings.opacity / 100
    const heightScale = settings.heightScale / 100
    const centerMirror = settings.centerMirror
    const maxH = HEIGHT * heightScale
    const wH = maxH * 0.6
    const layoutW = centerMirror ? Math.floor(WIDTH / 2) : WIDTH

    const r = colorR, g = colorG, b = colorB

    ctx.clearRect(0, 0, WIDTH, HEIGHT)

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
      wg.addColorStop(0, `rgba(${r},${g},${b},${0.2 * opacity})`)
      wg.addColorStop(1, `rgba(${r},${g},${b},${0.02 * opacity})`)
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
      ctx.strokeStyle = `rgba(${r},${g},${b},${0.35 * opacity})`
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
      wg.addColorStop(0, `rgba(${r},${g},${b},${0.2 * opacity})`)
      wg.addColorStop(1, `rgba(${r},${g},${b},${0.02 * opacity})`)
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
      ctx.strokeStyle = `rgba(${r},${g},${b},${0.35 * opacity})`
      ctx.lineWidth = 1
      ctx.stroke()
    }
  }

  clear(): void {
    if (!this.ctx) return
    this.ctx.clearRect(0, 0, this.width, this.height)
  }

  destroy(): void {
    this.ctx = null
    this.canvas = null
  }
}

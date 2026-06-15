export interface RGBA {
  r: number
  g: number
  b: number
  a: number
}

// 解析 rgba/rgb 字符串为 RGBA 对象
export function parseRGBA(str: string): RGBA {
  const match = str.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\s*\)/)
  if (!match) return { r: 0, g: 0, b: 0, a: 1 }
  return {
    r: Math.round(Number(match[1])),
    g: Math.round(Number(match[2])),
    b: Math.round(Number(match[3])),
    a: match[4] != null ? Number(match[4]) : 1,
  }
}

// RGBA 对象转字符串
export function toRGBAString(c: RGBA): string {
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})`
}

// 线性插值
export function lerpRGBA(from: RGBA, to: RGBA, t: number): RGBA {
  return {
    r: Math.round(from.r + (to.r - from.r) * t),
    g: Math.round(from.g + (to.g - from.g) * t),
    b: Math.round(from.b + (to.b - from.b) * t),
    a: +(from.a + (to.a - from.a) * t).toFixed(3),
  }
}

// ease-out-cubic 缓动
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

// ease-out-quart 缓动(用于中心点跟随, 前段更快)
export function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4)
}

// rAF 驱动颜色过渡动画, 返回 cancel 函数
export function animateColorTransition(
  fromColors: RGBA[],
  toColors: RGBA[],
  duration: number,
  onFrame: (interpolated: RGBA[], progress: number) => void,
  onComplete?: () => void,
): () => void {
  const start = performance.now()
  let rafId: number
  const tick = () => {
    const elapsed = performance.now() - start
    const t = Math.min(1, elapsed / duration)
    const eased = easeOutCubic(t)
    const result = fromColors.map((from, i) => lerpRGBA(from, toColors[i], eased))
    onFrame(result, t)
    if (t < 1) {
      rafId = requestAnimationFrame(tick)
    } else {
      onComplete?.()
    }
  }
  rafId = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(rafId)
}

// 从图片 URL 提取颜色(canvas 缩放采样)
export function extractColorsFromImage(
  src: string,
  opts: { size?: number; regions?: 'single' | 'multi' } = {},
): Promise<RGBA[]> {
  const { size = 16, regions = 'single' } = opts
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) { resolve([{ r: 80, g: 80, b: 100, a: 0.5 }]); return }
        ctx.drawImage(img, 0, 0, size, size)
        const data = ctx.getImageData(0, 0, size, size).data
        const totalPixels = size * size

        if (regions === 'multi') {
          // 多区域采样: 上半/下半/整体
          const halfRow = Math.floor(size / 2)
          let rT = 0, gT = 0, bT = 0, nT = 0
          let rB = 0, gB = 0, bB = 0, nB = 0
          let rA = 0, gA = 0, bA = 0

          for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
              const i = (y * size + x) * 4
              rA += data[i]; gA += data[i + 1]; bA += data[i + 2]
              if (y < halfRow) {
                rT += data[i]; gT += data[i + 1]; bT += data[i + 2]; nT++
              } else {
                rB += data[i]; gB += data[i + 1]; bB += data[i + 2]; nB++
              }
            }
          }

          resolve([
            { r: Math.round(rA / totalPixels), g: Math.round(gA / totalPixels), b: Math.round(bA / totalPixels), a: 0.55 },
            { r: Math.round(rT / nT), g: Math.round(gT / nT), b: Math.round(bT / nT), a: 0.5 },
            { r: Math.round(rB / nB), g: Math.round(gB / nB), b: Math.round(bB / nB), a: 0.45 },
          ])
        } else {
          // 单区域: 全图平均
          let r = 0, g = 0, b = 0
          for (let i = 0; i < data.length; i += 4) {
            r += data[i]; g += data[i + 1]; b += data[i + 2]
          }
          r = Math.round(r / totalPixels)
          g = Math.round(g / totalPixels)
          b = Math.round(b / totalPixels)
          resolve([
            { r, g, b, a: 0.55 },
            { r: Math.round(r * 0.5), g: Math.round(g * 0.5), b: Math.round(b * 0.6), a: 0.4 },
          ])
        }
      } catch (_e) {
        resolve([{ r: 80, g: 80, b: 100, a: 0.5 }])
      }
    }
    img.onerror = () => {
      resolve([{ r: 80, g: 80, b: 100, a: 0.5 }])
    }
    img.src = src
  })
}

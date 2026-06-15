import type { VisualizerSettings } from './types'
import type { Bar } from './smoothing'

const VERT_SRC = `#version 300 es
precision highp float;

in vec2 a_position;
in float a_height;
in float a_x;
in float a_alpha;

uniform float u_barWidth;
uniform float u_canvasHeight;
uniform float u_heightScale;

out float v_yNorm;
out float v_alpha;
out vec2 v_localPos;

void main() {
  float h = a_height * u_heightScale;
  float x = a_x + a_position.x * u_barWidth;
  float y = -1.0 + a_position.y * h * 2.0;

  gl_Position = vec4(x, y, 0.0, 1.0);
  v_yNorm = a_position.y;
  v_alpha = a_alpha;
  v_localPos = a_position;
}
`

const FRAG_SRC = `#version 300 es
precision highp float;

uniform vec3 u_color;
uniform float u_opacity;
uniform int u_useGradient;
uniform float u_barWidthPx;
uniform float u_radius;

in float v_yNorm;
in float v_alpha;
in vec2 v_localPos;

out vec4 fragColor;

void main() {
  float alpha = v_alpha * u_opacity;

  if (u_useGradient == 1) {
    float gradAlpha;
    if (v_yNorm < 0.4) {
      gradAlpha = mix(0.08, 0.5, v_yNorm / 0.4);
    } else {
      gradAlpha = mix(0.5, 1.0, (v_yNorm - 0.4) / 0.6);
    }
    alpha *= gradAlpha;

    vec3 col = u_color;
    if (v_yNorm > 0.92) {
      col = min(vec3(1.0), u_color + 0.16);
    }

    if (u_radius > 0.0 && v_yNorm > 0.85) {
      float px = v_localPos.x * u_barWidthPx;
      float py = v_yNorm * u_barWidthPx;
      float barH = u_barWidthPx;
      float topY = barH - u_radius;
      if (py > topY) {
        float dx = 0.0;
        if (px < u_radius) dx = u_radius - px;
        else if (px > u_barWidthPx - u_radius) dx = px - (u_barWidthPx - u_radius);
        float dy = py - topY;
        if (dx * dx + dy * dy > u_radius * u_radius) discard;
      }
    }

    fragColor = vec4(col * alpha, alpha);
  } else {
    fragColor = vec4(u_color * alpha * 0.7, alpha * 0.7);
  }
}
`

const PEAK_VERT_SRC = `#version 300 es
precision highp float;

in vec2 a_position;
in float a_peakY;
in float a_x;
in float a_peakAlpha;

uniform float u_barWidth;

out float v_alpha;

void main() {
  float x = a_x + a_position.x * u_barWidth;
  float y = a_peakY + a_position.y * 0.004;
  gl_Position = vec4(x, y, 0.0, 1.0);
  v_alpha = a_peakAlpha;
}
`

const PEAK_FRAG_SRC = `#version 300 es
precision highp float;

uniform vec3 u_peakColor;
uniform float u_opacity;

in float v_alpha;

out vec4 fragColor;

void main() {
  float a = v_alpha * u_opacity;
  fragColor = vec4(u_peakColor * a, a);
}
`

export class WebGLBarsRenderer {
  private gl: WebGL2RenderingContext | null = null
  private canvas: OffscreenCanvas | null = null
  private width = 0
  private height = 0
  private dpr = 1

  private program: WebGLProgram | null = null
  private peakProgram: WebGLProgram | null = null
  private vao: WebGLVertexArrayObject | null = null
  private peakVao: WebGLVertexArrayObject | null = null

  private heightBuffer: WebGLBuffer | null = null
  private xBuffer: WebGLBuffer | null = null
  private alphaBuffer: WebGLBuffer | null = null
  private peakYBuffer: WebGLBuffer | null = null
  private peakXBuffer: WebGLBuffer | null = null
  private peakAlphaBuffer: WebGLBuffer | null = null

  private maxBars = 0
  private heightData: Float32Array = new Float32Array(0)
  private xData: Float32Array = new Float32Array(0)
  private alphaData: Float32Array = new Float32Array(0)
  private peakYData: Float32Array = new Float32Array(0)
  private peakAlphaData: Float32Array = new Float32Array(0)

  private uColor: WebGLUniformLocation | null = null
  private uOpacity: WebGLUniformLocation | null = null
  private uBarWidth: WebGLUniformLocation | null = null
  private uHeightScale: WebGLUniformLocation | null = null
  private uCanvasHeight: WebGLUniformLocation | null = null
  private uUseGradient: WebGLUniformLocation | null = null
  private uBarWidthPx: WebGLUniformLocation | null = null
  private uRadius: WebGLUniformLocation | null = null

  private uPeakColor: WebGLUniformLocation | null = null
  private uPeakOpacity: WebGLUniformLocation | null = null
  private uPeakBarWidth: WebGLUniformLocation | null = null

  init(canvas: OffscreenCanvas, width: number, height: number, dpr: number): boolean {
    this.canvas = canvas
    this.width = width
    this.height = height
    this.dpr = dpr
    canvas.width = width * dpr
    canvas.height = height * dpr

    const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false })
    if (!gl) return false
    this.gl = gl

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.viewport(0, 0, canvas.width, canvas.height)

    this.program = this.createProgram(VERT_SRC, FRAG_SRC)
    this.peakProgram = this.createProgram(PEAK_VERT_SRC, PEAK_FRAG_SRC)
    if (!this.program || !this.peakProgram) return false

    this.cacheUniforms()
    this.setupGeometry()
    return true
  }

  private createProgram(vertSrc: string, fragSrc: string): WebGLProgram | null {
    const gl = this.gl!
    const vs = gl.createShader(gl.VERTEX_SHADER)!
    gl.shaderSource(vs, vertSrc)
    gl.compileShader(vs)

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!
    gl.shaderSource(fs, fragSrc)
    gl.compileShader(fs)

    const prog = gl.createProgram()!
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)

    gl.deleteShader(vs)
    gl.deleteShader(fs)

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      gl.deleteProgram(prog)
      return null
    }
    return prog
  }

  private cacheUniforms(): void {
    const gl = this.gl!
    gl.useProgram(this.program)
    this.uColor = gl.getUniformLocation(this.program!, 'u_color')
    this.uOpacity = gl.getUniformLocation(this.program!, 'u_opacity')
    this.uBarWidth = gl.getUniformLocation(this.program!, 'u_barWidth')
    this.uHeightScale = gl.getUniformLocation(this.program!, 'u_heightScale')
    this.uCanvasHeight = gl.getUniformLocation(this.program!, 'u_canvasHeight')
    this.uUseGradient = gl.getUniformLocation(this.program!, 'u_useGradient')
    this.uBarWidthPx = gl.getUniformLocation(this.program!, 'u_barWidthPx')
    this.uRadius = gl.getUniformLocation(this.program!, 'u_radius')

    gl.useProgram(this.peakProgram)
    this.uPeakColor = gl.getUniformLocation(this.peakProgram!, 'u_peakColor')
    this.uPeakOpacity = gl.getUniformLocation(this.peakProgram!, 'u_opacity')
    this.uPeakBarWidth = gl.getUniformLocation(this.peakProgram!, 'u_barWidth')
  }

  private setupGeometry(): void {
    const gl = this.gl!
    const quadVerts = new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1])

    this.vao = gl.createVertexArray()
    gl.bindVertexArray(this.vao)

    const quadBuf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf)
    gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW)
    const posLoc = gl.getAttribLocation(this.program!, 'a_position')
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

    this.heightBuffer = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, this.heightBuffer)
    const hLoc = gl.getAttribLocation(this.program!, 'a_height')
    gl.enableVertexAttribArray(hLoc)
    gl.vertexAttribPointer(hLoc, 1, gl.FLOAT, false, 0, 0)
    gl.vertexAttribDivisor(hLoc, 1)

    this.xBuffer = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, this.xBuffer)
    const xLoc = gl.getAttribLocation(this.program!, 'a_x')
    gl.enableVertexAttribArray(xLoc)
    gl.vertexAttribPointer(xLoc, 1, gl.FLOAT, false, 0, 0)
    gl.vertexAttribDivisor(xLoc, 1)

    this.alphaBuffer = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, this.alphaBuffer)
    const aLoc = gl.getAttribLocation(this.program!, 'a_alpha')
    gl.enableVertexAttribArray(aLoc)
    gl.vertexAttribPointer(aLoc, 1, gl.FLOAT, false, 0, 0)
    gl.vertexAttribDivisor(aLoc, 1)

    gl.bindVertexArray(null)

    this.peakVao = gl.createVertexArray()
    gl.bindVertexArray(this.peakVao)

    const peakQuadBuf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, peakQuadBuf)
    gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW)
    const pPosLoc = gl.getAttribLocation(this.peakProgram!, 'a_position')
    gl.enableVertexAttribArray(pPosLoc)
    gl.vertexAttribPointer(pPosLoc, 2, gl.FLOAT, false, 0, 0)

    this.peakYBuffer = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, this.peakYBuffer)
    const pyLoc = gl.getAttribLocation(this.peakProgram!, 'a_peakY')
    gl.enableVertexAttribArray(pyLoc)
    gl.vertexAttribPointer(pyLoc, 1, gl.FLOAT, false, 0, 0)
    gl.vertexAttribDivisor(pyLoc, 1)

    this.peakXBuffer = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, this.peakXBuffer)
    const pxLoc = gl.getAttribLocation(this.peakProgram!, 'a_x')
    gl.enableVertexAttribArray(pxLoc)
    gl.vertexAttribPointer(pxLoc, 1, gl.FLOAT, false, 0, 0)
    gl.vertexAttribDivisor(pxLoc, 1)

    this.peakAlphaBuffer = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, this.peakAlphaBuffer)
    const paLoc = gl.getAttribLocation(this.peakProgram!, 'a_peakAlpha')
    gl.enableVertexAttribArray(paLoc)
    gl.vertexAttribPointer(paLoc, 1, gl.FLOAT, false, 0, 0)
    gl.vertexAttribDivisor(paLoc, 1)

    gl.bindVertexArray(null)
  }

  private ensureBufferSize(numBars: number): void {
    if (numBars <= this.maxBars) return
    const total = numBars * 2
    this.maxBars = numBars
    this.heightData = new Float32Array(total)
    this.xData = new Float32Array(total)
    this.alphaData = new Float32Array(total)
    this.peakYData = new Float32Array(total)
    this.peakAlphaData = new Float32Array(total)

    const gl = this.gl!
    gl.bindBuffer(gl.ARRAY_BUFFER, this.heightBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, total * 4, gl.DYNAMIC_DRAW)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.xBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, total * 4, gl.DYNAMIC_DRAW)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.alphaBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, total * 4, gl.DYNAMIC_DRAW)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.peakYBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, total * 4, gl.DYNAMIC_DRAW)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.peakXBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, total * 4, gl.DYNAMIC_DRAW)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.peakAlphaBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, total * 4, gl.DYNAMIC_DRAW)
  }

  resize(width: number, height: number, dpr: number): void {
    this.width = width
    this.height = height
    this.dpr = dpr
    if (this.canvas) {
      this.canvas.width = width * dpr
      this.canvas.height = height * dpr
    }
    if (this.gl) {
      this.gl.viewport(0, 0, width * dpr, height * dpr)
    }
  }

  render(bars: Bar[], settings: VisualizerSettings, colorR: number, colorG: number, colorB: number): void {
    const gl = this.gl
    if (!gl) return

    const numBars = settings.barCount
    const opacity = settings.opacity / 100
    const heightScale = settings.heightScale / 100
    const centerMirror = settings.centerMirror
    const barWidthSetting = settings.barWidth

    const layoutW = centerMirror ? this.width / 2 : this.width
    const gap = 1
    const totalGap = gap * (numBars - 1)
    const barW = barWidthSetting > 0 ? barWidthSetting : Math.max(1, (layoutW - totalGap) / numBars)
    const stepW = barW + gap
    const useGradient = barW > 5 && numBars <= 256

    const barWClip = (barW / this.width) * 2
    const stepWClip = (stepW / this.width) * 2

    this.ensureBufferSize(numBars)

    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)

    let instanceCount = 0
    let peakCount = 0

    if (centerMirror) {
      for (let i = 0; i < numBars; i++) {
        const b = bars[i]
        const v = b.value
        const h = Math.min(1, v * heightScale)
        const va = (0.35 + v * 0.65) * opacity
        const offset = i * stepWClip

        this.heightData[instanceCount] = h
        this.xData[instanceCount] = offset
        this.alphaData[instanceCount] = va
        instanceCount++

        this.heightData[instanceCount] = h
        this.xData[instanceCount] = -offset - barWClip
        this.alphaData[instanceCount] = va
        instanceCount++

        if (useGradient) {
          const ph = Math.min(1, b.peak * heightScale)
          if (ph > h + 0.01) {
            const pa = Math.max(0.08, 1 - b.peakV * 8) * opacity * 0.6
            this.peakYData[peakCount] = -1 + ph * 2
            this.xData[peakCount] = offset
            this.peakAlphaData[peakCount] = pa
            peakCount++
            this.peakYData[peakCount] = -1 + ph * 2
            this.xData[peakCount] = -offset - barWClip
            this.peakAlphaData[peakCount] = pa
            peakCount++
          }
        }
      }
    } else {
      const startX = -1.0
      for (let i = 0; i < numBars; i++) {
        const b = bars[i]
        const v = b.value
        const h = Math.min(1, v * heightScale)
        const va = (0.35 + v * 0.65) * opacity
        const x = startX + i * stepWClip

        this.heightData[instanceCount] = h
        this.xData[instanceCount] = x
        this.alphaData[instanceCount] = va
        instanceCount++

        if (useGradient) {
          const ph = Math.min(1, b.peak * heightScale)
          if (ph > h + 0.01) {
            const pa = Math.max(0.08, 1 - b.peakV * 8) * opacity * 0.6
            this.peakYData[peakCount] = -1 + ph * 2
            this.peakAlphaData[peakCount] = pa
            peakCount++
          }
        }
      }
    }

    gl.useProgram(this.program)
    gl.uniform3f(this.uColor, colorR / 255, colorG / 255, colorB / 255)
    gl.uniform1f(this.uOpacity, 1.0)
    gl.uniform1f(this.uBarWidth, barWClip)
    gl.uniform1f(this.uHeightScale, 1.0)
    gl.uniform1f(this.uCanvasHeight, this.height)
    gl.uniform1i(this.uUseGradient, useGradient ? 1 : 0)
    gl.uniform1f(this.uBarWidthPx, barW)
    gl.uniform1f(this.uRadius, useGradient ? Math.min(barW * 0.3, 3) : 0)

    gl.bindVertexArray(this.vao)

    gl.bindBuffer(gl.ARRAY_BUFFER, this.heightBuffer)
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.heightData.subarray(0, instanceCount))

    gl.bindBuffer(gl.ARRAY_BUFFER, this.xBuffer)
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.xData.subarray(0, instanceCount))

    gl.bindBuffer(gl.ARRAY_BUFFER, this.alphaBuffer)
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.alphaData.subarray(0, instanceCount))

    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, instanceCount)

    if (peakCount > 0 && useGradient) {
      gl.useProgram(this.peakProgram)
      gl.uniform3f(this.uPeakColor,
        Math.min(1, colorR / 255 + 0.2),
        Math.min(1, colorG / 255 + 0.2),
        Math.min(1, colorB / 255 + 0.2))
      gl.uniform1f(this.uPeakOpacity, 1.0)
      gl.uniform1f(this.uPeakBarWidth, barWClip)

      gl.bindVertexArray(this.peakVao)

      gl.bindBuffer(gl.ARRAY_BUFFER, this.peakYBuffer)
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.peakYData.subarray(0, peakCount))

      gl.bindBuffer(gl.ARRAY_BUFFER, this.peakXBuffer)
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.xData.subarray(0, peakCount))

      gl.bindBuffer(gl.ARRAY_BUFFER, this.peakAlphaBuffer)
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.peakAlphaData.subarray(0, peakCount))

      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, peakCount)
    }

    gl.bindVertexArray(null)
  }

  clear(): void {
    if (!this.gl) return
    this.gl.clearColor(0, 0, 0, 0)
    this.gl.clear(this.gl.COLOR_BUFFER_BIT)
  }

  destroy(): void {
    const gl = this.gl
    if (!gl) return
    if (this.program) gl.deleteProgram(this.program)
    if (this.peakProgram) gl.deleteProgram(this.peakProgram)
    if (this.vao) gl.deleteVertexArray(this.vao)
    if (this.peakVao) gl.deleteVertexArray(this.peakVao)
    this.gl = null
    this.canvas = null
  }
}

import Lyric from '@common/utils/lyric-font-player'
import { markRawList } from '@common/utils/vueTools'
import { setLyricLines, setCurrentLine } from '@island/store/action'
import { setting, lyricLineTimes, lineProgress } from '@island/store/state'

let lrc: any

interface LyricData {
  lyric: string
  tlyric?: string
  rlyric?: string
  lxlyric?: string
}

let currentLyricData: LyricData = { lyric: '' }

// translation 模式下, 翻译作为首个扩展行注入, 用于逐行替换主行
let translationAsExt = false

// 当前行卡拉OK进度: onPlay 触发时按逐字时间轴 rAF 推进, 精确同步拖腔
let lineRafId: number | null = null
let lineStartPerf = 0
let lineDuration = 0
let playRate = 1

// 每行的逐字时间分段: [{ off, dur, charLen }], 用于精确卡拉OK着色
interface FontSeg { off: number, dur: number, len: number }
let lineSegs: FontSeg[][] = []
let lineTextLens: number[] = []
let curSegs: FontSeg[] | null = null
let curTextLen = 0
let segMap = new Map<number, FontSeg[]>()

// 解析逐字歌词 lxlyric, 得到每行的逐字时间分段
const fontTimeExp = /<(\d+),(\d+)>((?:(?!<\d+,\d+>).)*)/g
const lineTimeExp = /^\[(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?]/
const parseLineSegs = (lxlyric: string): Map<number, FontSeg[]> => {
  const map = new Map<number, FontSeg[]>()
  if (!lxlyric) return map
  for (const raw of lxlyric.split(/\r\n|\r|\n/)) {
    const line = raw.trim()
    const tm = lineTimeExp.exec(line)
    if (!tm) continue
    const lineTime = parseInt(tm[1]) * 60000 + parseInt(tm[2]) * 1000 + (tm[3] ? parseInt(tm[3].padEnd(3, '0')) : 0)
    const body = line.replace(lineTimeExp, '')
    const segs: FontSeg[] = []
    let m
    fontTimeExp.lastIndex = 0
    while ((m = fontTimeExp.exec(body)) != null) {
      const off = parseInt(m[1]) || 0
      const dur = parseInt(m[2]) || 0
      const len = (m[3] || '').length || 1
      segs.push({ off, dur, len })
    }
    if (segs.length) map.set(lineTime, segs)
  }
  return map
}

const stopLineProgress = () => {
  if (lineRafId != null) { cancelAnimationFrame(lineRafId); lineRafId = null }
}

const startLineProgress = () => {
  stopLineProgress()
  lineStartPerf = performance.now()
  lineProgress.value = 0
  const tick = () => {
    const elapsed = (performance.now() - lineStartPerf) * playRate
    let p = 0
    if (curSegs && curSegs.length && curTextLen > 0) {
      // 逐字推进: 已唱完的字记满, 当前字按其时长内插, 与拖腔精确对齐
      let doneChars = 0
      for (const s of curSegs) {
        if (elapsed >= s.off + s.dur) {
          doneChars += s.len
        } else if (elapsed > s.off) {
          const frac = s.dur > 0 ? (elapsed - s.off) / s.dur : 1
          doneChars += s.len * Math.max(0, Math.min(1, frac))
          break
        } else {
          break
        }
      }
      p = (doneChars / curTextLen) * 100
    } else if (lineDuration > 0) {
      // 无逐字数据: 退回整行线性
      p = (elapsed / lineDuration) * 100
    }
    lineProgress.value = Math.max(0, Math.min(100, p))
    if (p < 100) lineRafId = requestAnimationFrame(tick)
    else { lineProgress.value = 100; lineRafId = null }
  }
  lineRafId = requestAnimationFrame(tick)
}

// 按双语模式把 line-player 行数据转为渲染行
// translation 模式: 主行用扩展行里的译文, 缺失译文的行退回原文(保留 Lyrics by 等信息行)
const mapLyricLines = (lines: any[]) => {
  return lines.map((l: any) => {
    const ext: string[] = l.extendedLyrics ?? []
    if (translationAsExt) {
      const trans = ext[0]
      return { text: (trans && trans.trim()) ? trans : (l.text ?? ''), extendedLyrics: [] }
    }
    return { text: l.text ?? '', extendedLyrics: ext }
  })
}

export const init = () => {
  lrc = new (Lyric as any)({
    shadowContent: false,
    rate: (setting as any)['player.playbackRate'] ?? 1,
    onPlay(line: number) {
      const idx = Math.max(line, 0)
      setCurrentLine(idx)
      const times = lyricLineTimes.value
      const start = times[idx] ?? 0
      const end = idx + 1 < times.length ? times[idx + 1] : start + 4000
      curSegs = lineSegs[idx] || null
      curTextLen = lineTextLens[idx] || 0
      lineDuration = Math.max(0, end - start)
      startLineProgress()
    },
    onSetLyric(lines: any[], _offset: number) {
      const lyricLines = markRawList(mapLyricLines(lines))
      setLyricLines(lyricLines)
      setCurrentLine(0)
      lyricLineTimes.value = lines.map((l: any) => l.time ?? 0)
      // 按行时间对齐逐字分段数据
      lineSegs = lines.map((l: any) => segMap.get(l.time ?? -1) || [])
      lineTextLens = lines.map((l: any) => {
        const s = segMap.get(l.time ?? -1)
        if (s && s.length) return s.reduce((acc: number, seg: FontSeg) => acc + seg.len, 0)
        return (l.text ?? '').length || 1
      })
      lineProgress.value = 0
      stopLineProgress()
    },
    onUpdateLyric(lines: any[]) {
      const lyricLines = markRawList(mapLyricLines(lines))
      setLyricLines(lyricLines)
      lyricLineTimes.value = lines.map((l: any) => l.time ?? 0)
      lineSegs = lines.map((l: any) => segMap.get(l.time ?? -1) || [])
      lineTextLens = lines.map((l: any) => {
        const s = segMap.get(l.time ?? -1)
        if (s && s.length) return s.reduce((acc: number, seg: FontSeg) => acc + seg.len, 0)
        return (l.text ?? '').length || 1
      })
    },
  })
}

export const setLyric = (data: LyricData) => {
  currentLyricData = data
  if (!lrc) return
  const lyricMode = (setting as any)['dynamicIsland.lyricMode'] || 'original'
  const extendedLyrics: string[] = []
  // translation 模式: 翻译作为首个扩展行注入, onSetLyric 里逐行替换主行
  translationAsExt = lyricMode === 'translation' && !!data.tlyric
  if (translationAsExt) extendedLyrics.push(data.tlyric as string)
  if ((setting as any)['player.isShowLyricRoma'] && data.rlyric) extendedLyrics.push(data.rlyric)
  // both 模式额外把翻译作为副行显示
  if (lyricMode === 'both' && data.tlyric) extendedLyrics.push(data.tlyric)
  if (lyricMode === 'both' && (setting as any)['player.isSwapLyricTranslationAndRoma']) extendedLyrics.reverse()
  // 解析逐字歌词得到每行逐字分段(用于精确卡拉OK着色)
  segMap = parseLineSegs(data.lxlyric ?? '')
  const lyricStr = (setting as any)['player.isPlayLxlrc'] && data.lxlyric ? data.lxlyric : data.lyric
  lrc.setLyric(lyricStr, extendedLyrics)
}

// 用当前歌词数据重新组装扩展行, 供双语模式切换时实时刷新(无需切歌)
// isPlaying 为真则按当前时间恢复推进, 否则仅静态定位到对应行
export const reSetLyric = (time?: number, isPlaying = true) => {
  if (!currentLyricData.lyric) return
  setLyric(currentLyricData)
  // 重建后歌词从行 0 起, 需用当前播放时间重新定位, 否则停在首行不再推进
  if (typeof time === 'number' && time >= 0) {
    lrc.play(time)
    if (!isPlaying) lrc.pause()
  }
}

export const setPlaybackRate = (rate: number) => {
  if (!lrc) return
  playRate = rate
  lrc.setPlaybackRate(rate)
}

export const play = (time: number) => {
  if (!lrc || !currentLyricData.lyric) return
  lrc.play(time)
}

export const pause = () => {
  if (!lrc) return
  lrc.pause()
  stopLineProgress()
}

export const stop = () => {
  if (!lrc) return
  lrc.setLyric('')
  currentLyricData = { lyric: '' }
  setLyricLines([])
  lyricLineTimes.value = []
  lineProgress.value = 0
  stopLineProgress()
}

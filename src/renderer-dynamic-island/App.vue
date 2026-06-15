<template>
  <div
    id="dynamic-island-container"
    ref="dom_container"
    :class="{ expanded: uiState.isExpanded, 'show-info': uiState.showInfo, paused: !isPlay, 'paused-dim': !isPlay && setting['dynamicIsland.pausedOpacity'], docked: uiState.isDocked }"
    :style="containerStyle"
  >
    <div id="island-inner" :style="innerStyle">
    <!-- 毛玻璃背景 -->
    <div class="bg-layer" :style="bgStyle" />
    <!-- Apple Music 风格: 跟随封面的氛围光背景 -->
    <div v-if="musicInfo.pic" class="ambient-layer" :style="ambientStyle" />

      <!-- Dock 模式：最小化显示 -->
      <div class="dock-content" :class="{ visible: uiState.isDocked && !uiState.isExpanded }">
        <div class="dock-icon">
          <!-- 播放中：动态音频条 -->
          <svg v-if="isPlay" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <rect x="2" y="8" width="3" height="8" rx="1"><animate attributeName="height" values="8;14;8" dur="0.8s" repeatCount="indefinite"/><animate attributeName="y" values="8;5;8" dur="0.8s" repeatCount="indefinite"/></rect>
            <rect x="7" y="6" width="3" height="12" rx="1"><animate attributeName="height" values="12;6;12" dur="0.6s" repeatCount="indefinite"/><animate attributeName="y" values="6;9;6" dur="0.6s" repeatCount="indefinite"/></rect>
            <rect x="12" y="9" width="3" height="6" rx="1"><animate attributeName="height" values="6;14;6" dur="0.7s" repeatCount="indefinite"/><animate attributeName="y" values="9;5;9" dur="0.7s" repeatCount="indefinite"/></rect>
            <rect x="17" y="7" width="3" height="10" rx="1"><animate attributeName="height" values="10;4;10" dur="0.9s" repeatCount="indefinite"/><animate attributeName="y" values="7;10;7" dur="0.9s" repeatCount="indefinite"/></rect>
          </svg>
          <!-- 暂停中：暂停图标 -->
          <svg v-else viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
          </svg>
        </div>
        <div class="dock-progress">
          <div class="dock-progress-fill" :style="{ width: progressPercent + '%' }" />
        </div>
      </div>

      <!-- 收起状态 -->
      <div class="collapsed-content" :class="{ hidden: uiState.isExpanded || uiState.isDocked }">
        <!-- 左侧：封面图 -->
        <div class="cover-wrapper">
          <img
            v-if="musicInfo.pic"
            :src="musicInfo.pic"
            class="cover-img"
            @error="handleCoverError"
          />
          <div v-else class="cover-placeholder">
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </div>
        </div>

        <!-- 切歌飞行中的封面(从右侧滑到左侧) -->
        <div
          v-if="coverTransition.phase === 'fly'"
          class="cover-flying"
          :class="{ 'cover-flying-arrive': coverTransition.arrived }"
          :style="{ '--fly-distance': (measuredCollapsedW - 52) + 'px' }"
        >
          <img v-if="coverTransition.pic" :src="coverTransition.pic" class="cover-img" />
          <div v-else class="cover-placeholder">
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </div>
        </div>

        <!-- 中间：即将播放预告 / 切歌时显示歌曲名 / 当前歌词 / 进度 -->
        <transition name="info-slide">
          <div v-if="showNextPreview && !uiState.showInfo && !uiState.isMouseInside" class="song-info-collapsed next-song-preview">
            <transition name="text-fade" mode="out-in">
              <div :key="'next:' + nextSongInfo.name" class="info-text-wrapper">
                <div class="next-song-label">{{ nextLabel }}</div>
                <div class="song-name next-song-name">{{ nextSongInfo.name }}</div>
              </div>
            </transition>
          </div>
          <div v-else-if="uiState.showInfo || uiState.isMouseInside" class="song-info-collapsed">
            <transition name="text-fade" mode="out-in">
              <div :key="musicInfo.name + musicInfo.singer" class="info-text-wrapper">
                <div class="song-name">{{ musicInfo.name || '未在播放' }}<span v-if="durationStr !== '0:00'" class="song-duration"> {{ durationStr }}</span></div>
                <div class="song-artist">{{ musicInfo.singer || '' }}</div>
              </div>
            </transition>
          </div>
          <div v-else-if="currentLyricText" class="lyric-marquee" :style="{ textAlign: setting['dynamicIsland.lyricAlign'] || 'center' }">
            <transition name="lyric-pop">
              <div :key="lyricState.currentLine + ':' + currentLyricText" class="lyric-marquee-wrap">
                <div
                  class="lyric-marquee-text karaoke"
                  :style="{ '--lyric-progress': lyricLineProgress + '%' }"
                >{{ currentLyricText }}</div>
                <div v-if="currentLyricExt" class="lyric-marquee-ext">{{ currentLyricExt }}</div>
              </div>
            </transition>
          </div>
        </transition>

        <!-- 时间 + 进度条（无歌词且非悬浮时显示） -->
        <transition name="info-slide">
          <div v-if="!uiState.showInfo && !uiState.isMouseInside && !currentLyricText" class="progress-section">
            <span class="time-current">{{ currentTimeStr }}</span>
            <div class="progress-bar-inline">
              <div class="progress-bar-fill" :style="{ width: progressPercent + '%' }" />
            </div>
            <span class="time-total">{{ durationStr }}</span>
          </div>
        </transition>

        <!-- 右侧：音频可视化线谱 / 即将播放封面 / 加载动画 / 暂停图标 -->
        <div class="visualizer-wrapper">
          <canvas ref="dom_vis_canvas" class="vis-canvas" :class="{ 'vis-shrink-out': showNextPreview, 'vis-hidden': !isPlay && !isLoading, 'vis-burst-in': visBurst }" />
          <!-- 加载中动画(切歌后等待播放) -->
          <div v-if="isLoading && !showNextPreview" class="loading-spinner">
            <div class="spinner-dot" />
            <div class="spinner-dot" />
            <div class="spinner-dot" />
          </div>
          <!-- 即将播放: 下一首封面(圆形, 与左侧一致) -->
          <div v-if="showNextPreview && coverTransition.phase === 'idle'" class="next-song-cover">
            <img v-if="nextSongInfo.pic" :src="nextSongInfo.pic" class="next-song-cover-img" />
            <div v-else class="next-song-cover-placeholder">
              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
              </svg>
            </div>
          </div>
          <div class="pause-icon" :class="{ 'vis-hidden': isPlay || showNextPreview || isLoading }">
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
          </div>
        </div>

      </div>

      <!-- 展开状态 -->
      <div class="expanded-content" :class="{ visible: uiState.isExpanded, hidden: !uiState.isExpanded }">
          <!-- 上半部分：封面 + 歌曲信息 + 可视化 -->
          <div class="expanded-header">
            <div class="expanded-cover">
              <img v-if="musicInfo.pic" :src="musicInfo.pic" class="cover-img-large" @error="handleCoverError" />
              <div v-else class="cover-placeholder-large">
                <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
              </div>
            </div>
            <div class="expanded-info">
              <div class="song-name-expanded">{{ musicInfo.name || '未在播放' }}</div>
              <div class="song-artist-expanded">{{ musicInfo.singer || '' }}</div>
            </div>
            <div class="expanded-visualizer">
              <canvas ref="dom_vis_canvas_expanded" class="vis-canvas-expanded" />
            </div>
          </div>

          <!-- 展开模式进度条 -->
          <div class="expanded-progress">
            <span class="expanded-time-current">{{ currentTimeStr }}</span>
            <div class="expanded-progress-bar">
              <div class="expanded-progress-fill" :style="{ width: progressPercent + '%' }" />
            </div>
            <span class="expanded-time-total">{{ durationStr }}</span>
            <span class="expanded-progress-percent">{{ Math.round(progressPercent) }}%</span>
          </div>

          <!-- 下半部分：歌词区域（有歌词时才显示） -->
          <div v-if="visibleLyrics.length" class="expanded-lyrics" :style="{ textAlign: setting['dynamicIsland.lyricAlign'] || 'center' }">
            <transition-group name="lyric-line" tag="div" class="lyrics-container">
              <div
                v-for="(item, index) in visibleLyrics"
                :key="'lyric-' + item.lineIndex"
                class="lyric-line"
                :class="{
                  current: item.isCurrent,
                  prev: item.isPrev,
                  next: item.isNext,
                }"
              >
                <div class="lyric-main">{{ item.text }}</div>
                <div v-for="(ext, ei) in item.extendedLyrics" :key="ei" class="lyric-ext">{{ ext }}</div>
              </div>
            </transition-group>
          </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onBeforeUnmount, reactive } from '@common/utils/vueTools'
import { parseRGBA, toRGBAString, lerpRGBA, animateColorTransition, extractColorsFromImage, easeOutQuart } from '@common/utils/colorInterp'
import { setting, musicInfo, isPlay, uiState, lyricState, playTime, lyricLineTimes, lineProgress, nextSongInfo } from '@island/store/state'
import { setExpanded, setShowInfo, setMouseInside, setDocked } from '@island/store/action'
import { useEvent, getAnalyserDataArray } from '@island/core/mainWindowChannel'
import { onMouseEnter, onMouseLeave, sendConnectMainWindowEvent, sendSetSize, sendSetDocked } from '@island/utils/ipc'
import { init as initLyricPlayer, reSetLyric } from '@island/core/lyric'

export default {
  setup() {
    const dom_vis_canvas = ref(null)
    const dom_vis_canvas_expanded = ref(null)
    const dom_container = ref(null)

    // ═══ 加载状态 & 频谱弹入 ═══
    const isLoading = ref(false)
    const visBurst = ref(false)

    // ═══ 切歌封面飞行动画 ═══
    const coverTransition = reactive({
      phase: 'idle', // idle | fly
      pic: '',
      arrived: false,
    })
    let coverFlyTimer = null

    // 切歌触发: 如果之前有 nextSongInfo.active, 启动飞行动画
    let prevNextPic = ''
    watch(() => nextSongInfo.active, (active) => {
      if (active) {
        prevNextPic = nextSongInfo.pic
      }
    })

    watch(() => musicInfo.id, () => {
      // 进入加载状态
      isLoading.value = true
      // 如果之前有预告封面, 执行飞行动画
      if (prevNextPic || nextSongInfo.pic) {
        const flyPic = prevNextPic || nextSongInfo.pic || musicInfo.pic
        coverTransition.phase = 'fly'
        coverTransition.pic = flyPic
        coverTransition.arrived = false
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            coverTransition.arrived = true
          })
        })
        if (coverFlyTimer) clearTimeout(coverFlyTimer)
        coverFlyTimer = setTimeout(() => {
          coverTransition.phase = 'idle'
          coverTransition.pic = ''
          coverTransition.arrived = false
          coverFlyTimer = null
        }, 1200)
        prevNextPic = ''
      }
    })

    // ═══ 可视化相关 ═══
    let visCtx = null
    let visCtxExpanded = null
    let visW = 0
    let visH = 0
    let visWExpanded = 0
    let visHExpanded = 0
    let autoAmpSmoothed = 2 // 自动振幅平滑值
    let peakRef = 80 // 频谱峰值参考(自动增益)
    const barSmooth = [0, 0, 0, 0] // 每根柱子的平滑高度
    let isPlaying = false
    let animFrameId = null

    useEvent((event) => {
      if (event.action === 'send_analyser_data_array') {
        renderVisualizer(event.data)
      }
    })

    const renderVisualizer = (dataArray) => {
      // 收起状态的线谱
      if (visCtx && visW && visH) {
        drawBarsSymmetric(visCtx, dataArray, visW, visH)
      }
      // 展开状态的线谱
      if (visCtxExpanded && visWExpanded && visHExpanded && uiState.isExpanded) {
        drawBarsSymmetric(visCtxExpanded, dataArray, visWExpanded, visHExpanded)
      }
      animFrameId = null
      if (isPlaying) animFrameId = window.requestAnimationFrame(getAnalyserDataArray)
    }

    const drawBarsSymmetric = (ctx, dataArray, w, h) => {
      ctx.clearRect(0, 0, w, h)
      const halfBars = 4
      const totalBars = halfBars * 2
      const gap = 2
      const barW = Math.max(2, Math.floor((w - (totalBars - 1) * gap) / totalBars))
      const totalWidth = totalBars * barW + (totalBars - 1) * gap
      const startX = (w - totalWidth) / 2
      const maxH = h * 0.85
      const minH = h * 0.12

      const n = dataArray.length
      if (!n) return
      // 取低频主能量区(前 ~45%), 真实数据, 不模拟
      const lowEnd = Math.max(8, Math.floor(n * 0.45))

      // 4 个柱子各覆盖一段频带, 取段内最大值(比均值更灵敏, 保证每根都有跳动)
      const bandVals = []
      let frameMax = 1
      for (let i = 0; i < halfBars; i++) {
        // 对低频段做轻微对数分布: 越往外频率越高
        const lo = Math.floor(Math.pow(i / halfBars, 1.3) * lowEnd)
        const hi = Math.max(lo + 1, Math.floor(Math.pow((i + 1) / halfBars, 1.3) * lowEnd))
        let m = 0
        for (let j = lo; j < hi && j < n; j++) if (dataArray[j] > m) m = dataArray[j]
        bandVals.push(m)
        if (m > frameMax) frameMax = m
      }

      // 自动增益: 让本帧最强柱接近满高; 用峰值跟踪+缓降, 既不虚高也不压死
      // peakRef 缓慢衰减以适应安静段, 突增时立即跟上
      if (frameMax > peakRef) peakRef = frameMax
      else peakRef = peakRef * 0.92 + frameMax * 0.08
      const ref = Math.max(40, peakRef) // 下限防止静音时噪声被放大
      const gainBase = setting['dynamicIsland.autoVisualizerAmplify'] === false
        ? ((setting['dynamicIsland.visualizerAmplify'] ?? 2) * 0.5)
        : 1

      // 频谱渐变: 从绿到青
      const gradient = ctx.createLinearGradient(startX, 0, startX + totalWidth, 0)
      gradient.addColorStop(0, 'rgba(7, 197, 86, 0.85)')
      gradient.addColorStop(0.5, 'rgba(7, 197, 140, 0.8)')
      gradient.addColorStop(1, 'rgba(7, 180, 197, 0.85)')
      ctx.fillStyle = gradient

      for (let i = 0; i < halfBars; i++) {
        // 归一化到 [0,1], 本帧最强约满高
        let norm = (bandVals[i] / ref) * gainBase
        norm = Math.max(0, Math.min(1, norm))
        // 每根独立平滑, 上升快下降稍慢, 自然跳动
        const prev = barSmooth[i] ?? 0
        barSmooth[i] = norm > prev ? prev * 0.4 + norm * 0.6 : prev * 0.78 + norm * 0.22
        const barH = Math.max(minH, barSmooth[i] * maxH)
        const y = (h - barH) / 2

        const xRight = startX + (halfBars + i) * (barW + gap)
        ctx.beginPath()
        ctx.roundRect(xRight, y, barW, barH, barW / 2)
        ctx.fill()

        const xLeft = startX + (halfBars - 1 - i) * (barW + gap)
        ctx.beginPath()
        ctx.roundRect(xLeft, y, barW, barH, barW / 2)
        ctx.fill()
      }
    }

    const handlePlay = () => {
      isPlaying = true
      getAnalyserDataArray()
    }

    const handlePause = () => {
      if (animFrameId) window.cancelAnimationFrame(animFrameId)
      animFrameId = null
      isPlaying = false
      // 暂停时清空画布, 避免残留波形
      if (visCtx && visW && visH) visCtx.clearRect(0, 0, visW, visH)
      if (visCtxExpanded && visWExpanded && visHExpanded) visCtxExpanded.clearRect(0, 0, visWExpanded, visHExpanded)
    }

    const initVisCanvas = () => {
      const canvas = dom_vis_canvas.value
      if (canvas) {
        visCtx = canvas.getContext('2d')
        canvas.width = canvas.clientWidth * window.devicePixelRatio
        canvas.height = canvas.clientHeight * window.devicePixelRatio
        visW = canvas.width
        visH = canvas.height
        visCtx.scale(window.devicePixelRatio, window.devicePixelRatio)
        visW = canvas.clientWidth
        visH = canvas.clientHeight
      }
    }

    const initVisCanvasExpanded = () => {
      const canvas = dom_vis_canvas_expanded.value
      if (canvas) {
        visCtxExpanded = canvas.getContext('2d')
        canvas.width = canvas.clientWidth * window.devicePixelRatio
        canvas.height = canvas.clientHeight * window.devicePixelRatio
        visWExpanded = canvas.clientWidth
        visHExpanded = canvas.clientHeight
        visCtxExpanded.scale(window.devicePixelRatio, window.devicePixelRatio)
      }
    }

    // 加载完成检测: isPlay 变 true 时如果之前在 loading, 触发频谱弹入
    watch(isPlay, (val) => {
      if (val) {
        if (isLoading.value) {
          isLoading.value = false
          visBurst.value = true
          setTimeout(() => { visBurst.value = false }, 400)
        }
        if (!visW || !visH) {
          requestAnimationFrame(() => {
            initVisCanvas()
          })
        }
        handlePlay()
      } else {
        handlePause()
      }
    })

    watch(() => uiState.isExpanded, (expanded) => {
      if (expanded) {
        requestAnimationFrame(() => {
          initVisCanvasExpanded()
        })
      }
    })

    // ═══ 播放时间 & 进度条 ═══
    const formatTime = (ms) => {
      const totalSec = Math.floor(ms / 1000)
      const m = Math.floor(totalSec / 60)
      const s = totalSec % 60
      return `${m}:${s < 10 ? '0' : ''}${s}`
    }

    const displayTime = ref({ current: 0, duration: 0 })
    let timeRafId = null
    let lastSyncTime = 0 // performance.now() at last sync
    let lastSyncPlayed = 0 // played_time at last sync

    const syncPlayTime = () => {
      lastSyncPlayed = playTime.played
      lastSyncTime = performance.now()
      displayTime.value = { current: playTime.played, duration: playTime.duration }
    }

    // rAF 高频插值, 让卡拉OK进度逐帧平滑推进
    const startTimeInterpolation = () => {
      stopTimeInterpolation()
      syncPlayTime()
      const tick = () => {
        if (!isPlay.value) { timeRafId = null; return }
        const elapsed = performance.now() - lastSyncTime
        const rate = setting['player.playbackRate'] || 1
        const interpolated = lastSyncPlayed + elapsed * rate
        const duration = playTime.duration
        const current = duration > 0 ? Math.min(interpolated, duration) : interpolated
        displayTime.value = { current, duration }
        timeRafId = window.requestAnimationFrame(tick)
      }
      timeRafId = window.requestAnimationFrame(tick)
    }

    const stopTimeInterpolation = () => {
      if (timeRafId) {
        window.cancelAnimationFrame(timeRafId)
        timeRafId = null
      }
    }

    // 切歌/seek 时主进程会推送新的 played, 重新同步基准点
    watch(() => playTime.played, () => {
      syncPlayTime()
    })

    watch(isPlay, (val) => {
      if (val) {
        startTimeInterpolation()
        // 恢复播放: 退出 dock, 重新计时
        if (uiState.isDocked) setDocked(false)
        resetDockTimer()
      } else {
        stopTimeInterpolation()
        // 加载中或切歌飞行动画期间: 不 dock, 保持短胶囊
        if (coverTransition.phase === 'fly' || uiState.showInfo || isLoading.value) return
        // 暂停: 收起展开态并停靠
        if (dockTimer) { clearTimeout(dockTimer); dockTimer = null }
        setExpanded(false)
        setShowInfo(false)
        if (!uiState.isMouseInside) {
          setTimeout(() => {
            if (!isPlay.value && !uiState.isMouseInside && !uiState.showInfo) setDocked(true)
          }, 400)
        }
      }
    })

    const currentTimeStr = computed(() => formatTime(displayTime.value.current))
    const durationStr = computed(() => formatTime(displayTime.value.duration))
    const progressPercent = computed(() => {
      const d = displayTime.value.duration
      if (!d) return 0
      return Math.min(100, (displayTime.value.current / d) * 100)
    })

    // 当前歌词行的卡拉OK进度: 直接用 lrc 驱动的 lineProgress(更准, 不依赖外部时间轴)
    const lyricLineProgress = lineProgress

    // ═══ 鼠标交互 ═══
    let hoverTimer = null
    let leaveTimer = null
    let infoHideTimer = null
    let dockTimer = null
    const DOCK_DELAY = 5000

    const resetDockTimer = () => {
      if (dockTimer) clearTimeout(dockTimer)
      // 常驻歌词模式仅在播放时不停靠; 暂停时仍允许停靠以减少遮挡
      if (setting['dynamicIsland.alwaysShowLyric'] && isPlay.value) {
        setDocked(false)
        return
      }
      setDocked(false)
      dockTimer = setTimeout(() => {
        if (!uiState.isMouseInside && !uiState.isExpanded && !uiState.showInfo) {
          setDocked(true)
        }
        dockTimer = null
      }, DOCK_DELAY)
    }

    onMouseEnter(() => {
      setMouseInside(true)
      // 从 dock 模式退出
      if (uiState.isDocked) {
        setDocked(false)
      }
      if (dockTimer) {
        clearTimeout(dockTimer)
        dockTimer = null
      }
      if (leaveTimer) {
        clearTimeout(leaveTimer)
        leaveTimer = null
      }
      // 超过 hoverExpandDelay 后展开
      hoverTimer = setTimeout(() => {
        setExpanded(true)
      }, setting['dynamicIsland.hoverExpandDelay'])
    })

    onMouseLeave(() => {
      setMouseInside(false)
      if (hoverTimer) {
        clearTimeout(hoverTimer)
        hoverTimer = null
      }
      // 离开后等待 mouseLeaveDelay 再收起
      leaveTimer = setTimeout(() => {
        setExpanded(false)
      }, setting['dynamicIsland.mouseLeaveDelay'])
      // 启动 dock 定时器
      resetDockTimer()
    })

    // 切换歌曲时自动显示信息并在延迟后隐藏，同时退出 dock
    watch(() => musicInfo.id, () => {
      setDocked(false)
      setShowInfo(true)
      if (infoHideTimer) clearTimeout(infoHideTimer)
      infoHideTimer = setTimeout(() => {
        if (!uiState.isMouseInside) {
          setShowInfo(false)
        }
      }, setting['dynamicIsland.autoHideInfoDelay'])
      // 信息隐藏后重新开始 dock 倒计时
      resetDockTimer()
    })

    // 鼠标进入时也显示信息
    watch(() => uiState.isMouseInside, (inside) => {
      if (inside) {
        setShowInfo(true)
        if (infoHideTimer) {
          clearTimeout(infoHideTimer)
          infoHideTimer = null
        }
      } else {
        infoHideTimer = setTimeout(() => {
          setShowInfo(false)
          // 信息隐藏后启动 dock 倒计时
          resetDockTimer()
        }, setting['dynamicIsland.mouseLeaveDelay'])
      }
    })

    // 收起态测量宽度(用具体 px 值让 width 可动画, 消除 auto 跳变)
    const measuredCollapsedW = ref(0)

    // 通知主进程调整窗口尺寸(窗口=胶囊)
    const reportSize = () => {
      const isExpanded = uiState.isExpanded
      const isDocked = uiState.isDocked
      let w = 0
      let h = capsuleHeight.value
      if (isExpanded) {
        w = setting['dynamicIsland.expandedWidth'] ?? 380
      } else if (isDocked) {
        w = 120
      } else {
        w = measuredCollapsedW.value || setting['dynamicIsland.collapsedWidth'] || 280
      }
      sendSetSize(w, h)
    }

    let resizeObserver = null
    const startSizeReport = () => {
      reportSize()
    }

    // 状态变化时通知主进程调整窗口尺寸
    watch([() => uiState.isExpanded, () => uiState.isDocked, () => capsuleHeight.value, () => measuredCollapsedW.value], () => {
      reportSize()
    })

    // dock 状态变化时通知主进程调整 y 坐标
    watch(() => uiState.isDocked, (docked) => {
      sendSetDocked(docked)
    })
    // 用离屏 canvas 测量文本宽度, 不受容器宽度限制
    let measureCanvas = null
    const measureTextWidth = (text, fontPx, weight) => {
      if (!measureCanvas) measureCanvas = document.createElement('canvas')
      const ctx = measureCanvas.getContext('2d')
      const fam = setting['dynamicIsland.font'] || setting['desktopLyric.style.font'] || 'sans-serif'
      ctx.font = `${weight || 500} ${fontPx}px ${fam}`
      return ctx.measureText(text || '').width
    }

    const containerStyle = computed(() => {
      const speed = setting['dynamicIsland.animationSpeed'] || 100
      const mult = 100 / speed
      const font = setting['dynamicIsland.font'] || setting['desktopLyric.style.font']
      return {
        '--island-font': font || 'inherit',
        '--anim-base': (0.5 * mult).toFixed(2) + 's',
        '--anim-mid': (0.4 * mult).toFixed(2) + 's',
        '--anim-fast': (0.28 * mult).toFixed(2) + 's',
        '--anim-color': (0.8 * mult).toFixed(2) + 's',
        '--anim-lyric': (0.45 * mult).toFixed(2) + 's',
      }
    })

    const innerStyle = computed(() => {
      return {}
    })

    // 计算胶囊目标高度, 用于通知主进程
    const capsuleHeight = computed(() => {
      const hasLyrics = lyricState.lines.length > 0
      const isDocked = uiState.isDocked
      return uiState.isExpanded
        ? (hasLyrics ? setting['dynamicIsland.expandedHeight'] : 80)
        : isDocked
          ? 28
          : setting['dynamicIsland.collapsedHeight']
    })

    const bgStyle = computed(() => {
      const opacity = setting['dynamicIsland.opacity'] / 100
      const useAcrylic = setting['dynamicIsland.useAcrylic']
      const blur = setting['dynamicIsland.blur'] ?? 15
      return {
        background: `rgba(18, 18, 22, ${opacity})`,
        backdropFilter: useAcrylic ? `blur(${blur}px)` : 'none',
        webkitBackdropFilter: useAcrylic ? `blur(${blur}px)` : 'none',
      }
    })

    const visibleLyrics = computed(() => {
      const lines = lyricState.lines
      const current = lyricState.currentLine
      if (!lines.length) return []

      const result = []
      // 显示前一句
      if (current > 0) {
        result.push({
          lineIndex: current - 1,
          text: lines[current - 1]?.text || '',
          extendedLyrics: lines[current - 1]?.extendedLyrics || [],
          isCurrent: false,
          isPrev: true,
          isNext: false,
        })
      }
      // 当前句
      if (lines[current]) {
        result.push({
          lineIndex: current,
          text: lines[current].text || '',
          extendedLyrics: lines[current].extendedLyrics || [],
          isCurrent: true,
          isPrev: false,
          isNext: false,
        })
      }
      // 下一句
      if (current < lines.length - 1) {
        result.push({
          lineIndex: current + 1,
          text: lines[current + 1]?.text || '',
          extendedLyrics: lines[current + 1]?.extendedLyrics || [],
          isCurrent: false,
          isPrev: false,
          isNext: true,
        })
      }
      return result
    })

    // 收起态胶囊显示的当前歌词行
    const currentLyricText = computed(() => {
      const lines = lyricState.lines
      const cur = lyricState.currentLine
      if (!lines.length) return ''
      return lines[cur]?.text || ''
    })

    // i18n: "即将播放" 标签
    const nextLabel = computed(() => {
      const lang = setting['common.langId'] || 'zh-cn'
      if (lang.startsWith('zh')) return '即将播放'
      return 'UP NEXT'
    })

    // 仅在剩余 <=3 秒且歌词已唱完(或无歌词)时才显示预告
    const showNextPreview = computed(() => {
      if (!nextSongInfo.active) return false
      const remaining = displayTime.value.duration - displayTime.value.current
      if (remaining > 3000) return false
      const lines = lyricState.lines
      if (!lines.length) return true
      return lyricState.currentLine >= lines.length - 1
    })

    // 当前歌词行的翻译/扩展(短胶囊两行显示)
    const currentLyricExt = computed(() => {
      const lines = lyricState.lines
      const cur = lyricState.currentLine
      if (!lines.length) return ''
      const ext = lines[cur]?.extendedLyrics
      return ext && ext.length ? ext[0] : ''
    })

    // 收起态宽度测量(具体 px 让 width 可动画)
    const computeCollapsedWidth = () => {
      const min = 120
      const collapsedMax = setting['dynamicIsland.collapsedWidth'] ?? 280
      const lyricMax = Math.max(collapsedMax, Math.round(window.screen.width * 0.35))
      // 固定结构: 左右padding(20) + 封面(32) + 两个gap(20) + 可视化(42) + 安全余量(16)
      const fixed = 20 + 32 + 20 + 42 + 16
      let contentW = 0
      let max = collapsedMax
      // 即将播放预告态
      if (showNextPreview.value && !uiState.showInfo && !uiState.isMouseInside) {
        const label = (setting['common.langId'] || 'zh-cn').startsWith('zh') ? '即将播放' : 'UP NEXT'
        const labelW = measureTextWidth(label, 9, 700)
        const nameW = measureTextWidth(nextSongInfo.name || '', 13, 600)
        contentW = Math.max(labelW, nameW) + 8
        max = lyricMax
      } else if (uiState.showInfo || uiState.isMouseInside) {
        // 歌名后还跟时长文字, 预留 44px
        const nameW = measureTextWidth(musicInfo.name || '未在播放', 13, 600) + 44
        const singerW = measureTextWidth(musicInfo.singer || '', 11, 400)
        contentW = Math.max(nameW, singerW)
        max = lyricMax
      } else if (currentLyricText.value) {
        const lyricW = measureTextWidth(currentLyricText.value, 12.5, 600)
        const extW = currentLyricExt.value ? measureTextWidth(currentLyricExt.value, 10.5, 400) : 0
        contentW = Math.max(lyricW, extW)
        max = lyricMax
      } else {
        contentW = 100
      }
      return Math.max(min, Math.min(Math.ceil(fixed + contentW), max))
    }

    // 立即伸缩, 不防抖(用户偏好即时响应)
    const measureCollapsedWidth = () => {
      if (uiState.isExpanded || uiState.isDocked) return
      const w = computeCollapsedWidth()
      measuredCollapsedW.value = w
    }
    watch([
      () => musicInfo.name,
      () => musicInfo.singer,
      () => currentLyricText.value,
      () => currentLyricExt.value,
      () => uiState.showInfo,
      () => uiState.isMouseInside,
      () => setting['dynamicIsland.font'],
      () => showNextPreview.value,
      () => nextSongInfo.active,
      () => nextSongInfo.name,
    ], measureCollapsedWidth, { immediate: true })

    // Apple Music 风格氛围背景: 提取封面主色调做渐变光晕
    const ambientColor = ref('rgba(80, 80, 100, 0.5)')
    const ambientColor2 = ref('rgba(40, 40, 60, 0.4)')
    const ambientCenterX = ref(25)
    let ambientImg = null
    let cancelAmbientAnim = null

    // 提取封面颜色(仅提取, 不直接赋值, 供动画使用)
    const extractAmbientColorRaw = (src) => {
      return extractColorsFromImage(src, { size: 16, regions: 'single' })
    }

    // 直接设置颜色(无动画, 用于初始化)
    const applyAmbientColors = (colors) => {
      ambientColor.value = toRGBAString(colors[0])
      ambientColor2.value = toRGBAString(colors[1])
    }

    // 带飞行跟随的颜色过渡动画
    const startAmbientTransition = (targetColors) => {
      if (cancelAmbientAnim) cancelAmbientAnim()
      const fromColors = [parseRGBA(ambientColor.value), parseRGBA(ambientColor2.value)]
      const toColors = targetColors

      // 中心点跟随: 从右侧开始
      ambientCenterX.value = 85
      const centerStart = performance.now()
      const centerDuration = 450
      let centerRafId = null
      const tickCenter = () => {
        const elapsed = performance.now() - centerStart
        const t = Math.min(1, elapsed / centerDuration)
        const eased = easeOutQuart(t)
        ambientCenterX.value = 85 - (85 - 25) * eased
        if (t < 1) centerRafId = requestAnimationFrame(tickCenter)
      }
      centerRafId = requestAnimationFrame(tickCenter)

      // 颜色插值: 1200ms ease-out-cubic
      cancelAmbientAnim = animateColorTransition(
        fromColors, toColors, 1200,
        (interpolated) => {
          ambientColor.value = toRGBAString(interpolated[0])
          ambientColor2.value = toRGBAString(interpolated[1])
        },
        () => { cancelAmbientAnim = null },
      )

      // 包装 cancel 使其也取消中心点动画
      const originalCancel = cancelAmbientAnim
      cancelAmbientAnim = () => {
        originalCancel()
        if (centerRafId) cancelAnimationFrame(centerRafId)
      }
    }

    // 监听封面变化
    watch(() => musicInfo.pic, async(pic) => {
      if (!pic) return
      const colors = await extractAmbientColorRaw(pic)
      // 如果有飞行动画在进行, 用过渡; 否则直接设置
      if (coverTransition.phase === 'fly') {
        startAmbientTransition(colors)
      } else {
        applyAmbientColors(colors)
      }
    }, { immediate: true })

    const ambientStyle = computed(() => ({
      background: `radial-gradient(circle at ${ambientCenterX.value}% 20%, ${ambientColor.value}, transparent 60%), radial-gradient(circle at ${100 - ambientCenterX.value * 0.25}% 80%, ${ambientColor2.value}, transparent 65%)`,
    }))

    const handleCoverError = (e) => {
      e.target.style.display = 'none'
    }

    // ═══ 生命周期 ═══
    onMounted(() => {
      initLyricPlayer()
      initVisCanvas()
      sendConnectMainWindowEvent()
      startSizeReport()
      if (isPlay.value) {
        handlePlay()
        startTimeInterpolation()
      }
      // 常驻歌词模式: 保持收起态(短胶囊), 不 dock
      if (setting['dynamicIsland.alwaysShowLyric']) {
        setDocked(false)
        setExpanded(false)
        setShowInfo(false)
      }
    })

    // 监听一直展开设置变化
    watch(() => setting['dynamicIsland.alwaysShowLyric'], (val) => {
      if (val) {
        // 常驻短胶囊歌词模式: 保持收起态, 不 dock, 不展开
        if (dockTimer) { clearTimeout(dockTimer); dockTimer = null }
        setDocked(false)
        setExpanded(false)
        setShowInfo(false)
      } else {
        resetDockTimer()
      }
    })

    // 监听双语字幕模式切换: 重新组装扩展歌词行并重测宽度, 即时生效
    watch(() => setting['dynamicIsland.lyricMode'], () => {
      reSetLyric(displayTime.value.current, isPlay.value)
      measureCollapsedWidth()
    })

    onBeforeUnmount(() => {
      handlePause()
      stopTimeInterpolation()
      if (resizeObserver) resizeObserver.disconnect()
      if (hoverTimer) clearTimeout(hoverTimer)
      if (leaveTimer) clearTimeout(leaveTimer)
      if (infoHideTimer) clearTimeout(infoHideTimer)
      if (dockTimer) clearTimeout(dockTimer)
      if (coverFlyTimer) clearTimeout(coverFlyTimer)
    })

    return {
      setting,
      musicInfo,
      isPlay,
      uiState,
      lyricState,
      nextSongInfo,
      nextLabel,
      showNextPreview,
      isLoading,
      visBurst,
      coverTransition,
      dom_vis_canvas,
      dom_vis_canvas_expanded,
      dom_container,
      containerStyle,
      innerStyle,
      bgStyle,
      visibleLyrics,
      currentLyricText,
      currentLyricExt,
      lyricLineProgress,
      ambientStyle,
      handleCoverError,
      currentTimeStr,
      durationStr,
      progressPercent,
      measuredCollapsedW,
    }
  },
}
</script>

<style lang="less">
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background: transparent;
  user-select: none;
  overflow: hidden;
  -webkit-app-region: no-drag;
  font-family: inherit;
}

/* Platform font families */
.windows { font-family: "Segoe WPC", "Segoe UI", sans-serif; }
.windows:lang(zh-Hans) { font-family: "Microsoft YaHei", "Segoe WPC", "Segoe UI", sans-serif; }
.windows:lang(zh-Hant) { font-family: "Microsoft Jhenghei", "Segoe WPC", "Segoe UI", sans-serif; }
.windows:lang(ja) { font-family: "Yu Gothic UI", "Meiryo UI", "Segoe WPC", "Segoe UI", sans-serif; }
.windows:lang(ko) { font-family: "Malgun Gothic", "Dotom", "Segoe WPC", "Segoe UI", sans-serif; }
.mac { font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
.mac:lang(zh-Hans) { font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", sans-serif; }
.mac:lang(zh-Hant) { font-family: -apple-system, BlinkMacSystemFont, "PingFang TC", sans-serif; }
.linux { font-family: system-ui, "Ubuntu", "Droid Sans", sans-serif; }
.linux:lang(zh-Hans) { font-family: system-ui, "Ubuntu", "Droid Sans", "Source Han Sans SC", sans-serif; }
.linux:lang(zh-Hant) { font-family: system-ui, "Ubuntu", "Droid Sans", "Source Han Sans TC", sans-serif; }

#root {
  width: 100%;
  height: 100%;
  font-family: inherit;
}

/* ═══ 容器 ═══ */
#dynamic-island-container {
  position: relative;
  width: 100%;
  height: 100%;
  transition: width var(--anim-base, 0.5s) cubic-bezier(0.34, 1.25, 0.4, 1),
              min-width var(--anim-base, 0.5s) cubic-bezier(0.34, 1.25, 0.4, 1),
              max-width var(--anim-base, 0.5s) cubic-bezier(0.34, 1.25, 0.4, 1);
  will-change: width;
}

#island-inner {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 24px;
  overflow: hidden;
  font-family: var(--island-font, inherit);
  transition: border-radius var(--anim-base, 0.5s) cubic-bezier(0.34, 1.25, 0.4, 1),
              opacity var(--anim-mid, 0.4s) ease,
              box-shadow var(--anim-mid, 0.4s) ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  will-change: opacity;
}

.expanded #island-inner {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
  border-radius: 28px;
}

.paused #island-inner {
  opacity: 1;
}

.paused:hover #island-inner,
.paused.expanded #island-inner {
  opacity: 1;
}

/* 暂停降透明度: 仅收起且非悬停时变淡 */
.paused-dim #island-inner {
  opacity: 0.55;
}

.paused-dim:hover #island-inner,
.paused-dim.expanded #island-inner {
  opacity: 1;
}

.docked #island-inner {
  border-radius: 0 0 16px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

/* ═══ 毛玻璃背景 ═══ */
.bg-layer {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  z-index: 0;
  overflow: hidden;
  /* 底部反射光带 */
  &::after {
    content: '';
    position: absolute;
    left: 10%;
    right: 10%;
    bottom: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.08), transparent);
    pointer-events: none;
  }
}

/* Apple Music 风格氛围光背景 */
.ambient-layer {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  z-index: 1;
  opacity: 0.85;
  pointer-events: none;
}

/* ═══ Dock 模式 ═══ */
.dock-content {
  position: absolute;
  z-index: 3;
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
  padding: 0 10px;
  gap: 8px;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--anim-fast, 0.25s) ease;

  &.visible {
    opacity: 1;
    pointer-events: auto;
  }
}

.dock-icon {
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.85);
  display: flex;
  align-items: center;
}

.dock-progress {
  flex: 1;
  height: 3px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 1.5px;
  overflow: hidden;
}

.dock-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, rgba(7, 197, 86, 0.75), rgba(7, 197, 140, 0.8));
  border-radius: 1.5px;
  transition: width 0.3s linear;
  /* 进度条发光效果 */
  box-shadow: 0 0 4px rgba(7, 197, 86, 0.4);
}

/* ═══ 收起状态 ═══ */
.collapsed-content {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 10px;
  gap: 10px;
  transition: opacity var(--anim-fast, 0.25s) ease;

  &.hidden {
    opacity: 0;
    pointer-events: none;
  }
}

/* 封面 */
.cover-wrapper {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
}

.cover-wrapper.cover-exit-left {
  transform: translateX(-40px) scale(0.6);
  opacity: 0;
}

/* 切歌飞行封面: 从右侧滑到左侧 */
.cover-flying {
  position: absolute;
  left: 10px;
  top: 50%;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  transform: translateX(var(--fly-distance, 200px)) translateY(-50%) scale(0.85);
  opacity: 0.7;
  transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease;
  z-index: 5;
}

.cover-flying.cover-flying-arrive {
  transform: translateX(0) translateY(-50%) scale(1);
  opacity: 1;
}

.cover-flying .cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.4);
}

/* 歌曲信息 */
.song-info-collapsed {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
}

/* 收起态当前歌词 */
.lyric-marquee {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.lyric-marquee-wrap {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  width: 100%;
}
.lyric-marquee-text {
  position: relative;
  font-size: 12.5px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.1px;
  line-height: 1.3;
}
/* 卡拉OK着色: background-clip 渐变, 按进度从绿到暗一次过渡, 无覆盖层 */
.lyric-marquee-text.karaoke {
  background-image: linear-gradient(
    to right,
    rgba(7, 197, 86, 1) 0%,
    rgba(7, 197, 86, 1) var(--lyric-progress, 0%),
    rgba(255, 255, 255, 0.4) var(--lyric-progress, 0%),
    rgba(255, 255, 255, 0.4) 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  transition: none;
}
.lyric-marquee-ext {
  font-size: 10.5px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.55);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.info-text-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.song-name {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.song-artist {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.55);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.song-duration {
  font-size: 11px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.35);
  font-variant-numeric: tabular-nums;
  margin-left: 4px;
}

/* 线谱可视化 */
.visualizer-wrapper {
  position: relative;
  flex-shrink: 0;
  width: 42px;
  height: 32px;
  margin-left: auto;
  margin-right: -2px;
}

.vis-canvas {
  width: 100%;
  height: 100%;
  transition: opacity 0.25s ease, transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

/* 频谱缩小淡出(让位给下一首icon) */
.vis-canvas.vis-shrink-out {
  transform: scale(0.4);
  opacity: 0;
  pointer-events: none;
}

/* 频谱弹入: 加载完成后从外向内收缩 */
.vis-canvas.vis-burst-in {
  animation: visBurstAnim 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes visBurstAnim {
  0% { transform: scale(1.5); opacity: 0.3; }
  60% { transform: scale(0.95); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

/* 即将播放icon: 缩放淡入 */
.next-song-cover {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: nextCoverIn 0.3s cubic-bezier(0.34, 1.5, 0.45, 1);
}

@keyframes nextCoverIn {
  from { transform: scale(0.5); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.next-song-cover-img {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.next-song-cover-placeholder {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(7, 197, 86, 0.8);
}

.pause-icon {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.5);
  transition: opacity 0.2s ease;
}

.vis-hidden {
  opacity: 0;
  pointer-events: none;
}

/* Win11 风格加载旋转点动画 */
.loading-spinner {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.spinner-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgba(7, 197, 86, 0.85);
  animation: spinnerOrbit 1.4s cubic-bezier(0.36, 0, 0.64, 1) infinite;
}

.spinner-dot:nth-child(2) {
  animation-delay: 0.15s;
}

.spinner-dot:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes spinnerOrbit {
  0% { transform: translateX(-8px) scale(0.6); opacity: 0.4; }
  30% { transform: translateX(0) scale(1); opacity: 1; }
  60% { transform: translateX(8px) scale(0.6); opacity: 0.4; }
  100% { transform: translateX(-8px) scale(0.6); opacity: 0.4; }
}

/* 时间 + 进度条区域 */
.progress-section {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-right: 8px;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.time-current {
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.7);
}

.time-total {
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.4);
}

.progress-bar-inline {
  flex: 1;
  min-width: 60px;
  height: 3px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 1.5px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, rgba(7, 197, 86, 0.75), rgba(7, 197, 140, 0.8));
  border-radius: 1.5px;
  transition: width 0.3s linear;
  will-change: width;
  box-shadow: 0 0 3px rgba(7, 197, 86, 0.35);
}

/* ═══ 展开状态 ═══ */
.expanded-content {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  padding: 12px 16px;
  opacity: 0;
  pointer-events: none;
  /* 与容器宽高过渡同步, 内容淡入与形变同节奏, 避免歌词等胶囊缩放完才居中 */
  transition: opacity var(--anim-base, 0.5s) cubic-bezier(0.34, 1.25, 0.4, 1);

  &.visible {
    opacity: 1;
    pointer-events: auto;
  }

  &.hidden {
    opacity: 0;
    pointer-events: none;
  }
}

.expanded-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.expanded-cover {
  flex-shrink: 0;
  width: 50px;
  height: 50px;
  border-radius: 10px;
  overflow: hidden;
}

.cover-img-large {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cover-placeholder-large {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.4);
  border-radius: 10px;
}

.expanded-info {
  flex: 1;
  min-width: 0;
}

.song-name-expanded {
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
}

.song-artist-expanded {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
}

.expanded-visualizer {
  flex-shrink: 0;
  width: 50px;
  height: 36px;
}

.vis-canvas-expanded {
  width: 100%;
  height: 100%;
}

/* ═══ 展开模式进度条 ═══ */
.expanded-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0 8px;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: rgba(255, 255, 255, 0.7);
}

.expanded-time-current,
.expanded-time-total {
  flex-shrink: 0;
  min-width: 28px;
}

.expanded-time-total {
  color: rgba(255, 255, 255, 0.4);
}

.expanded-progress-bar {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.expanded-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, rgba(7, 197, 86, 0.8), rgba(7, 197, 140, 0.85));
  border-radius: 2px;
  transition: width 0.3s linear;
  will-change: width;
  box-shadow: 0 0 4px rgba(7, 197, 86, 0.3);
}

.expanded-progress-percent {
  flex-shrink: 0;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.35);
  min-width: 24px;
  text-align: right;
}

/* ═══ 歌词区域 ═══ */
.expanded-lyrics {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
  padding: 4px 0;
  position: relative;
  /* 上下渐隐遮罩: 歌词滚动时边缘柔和消失 */
  mask-image: linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%);
}

.lyrics-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
}

.lyric-line {
  transition: all var(--anim-lyric, 0.4s) cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  line-height: 1.5;
}

.lyric-main {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lyric-ext {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.8em;
  opacity: 0.6;
  line-height: 1.4;
}

.lyric-line.prev,
.lyric-line.next {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.35);
}

.lyric-line.current {
  font-size: 16px;
  font-weight: 600;
  color: rgba(7, 197, 86, 1);
  transition: all var(--anim-mid, 0.35s) cubic-bezier(0.4, 0, 0.2, 1);
}

/* ═══ 动画 ═══ */

/* 信息滑入 */
.info-slide-enter-active {
  transition: opacity var(--anim-mid, 0.35s) ease,
              transform var(--anim-mid, 0.35s) cubic-bezier(0.4, 0, 0.2, 1),
              max-width var(--anim-mid, 0.35s) ease;
}
.info-slide-leave-active {
  transition: opacity var(--anim-fast, 0.25s) ease,
              transform var(--anim-fast, 0.25s) ease,
              max-width var(--anim-fast, 0.25s) ease;
}
.info-slide-enter-from {
  opacity: 0;
  transform: translateX(-10px);
  max-width: 0;
}
.info-slide-leave-to {
  opacity: 0;
  transform: translateX(-10px);
  max-width: 0;
}

/* 文字切换: 纯淡入淡出 + 轻微缩放, 无上下位移避免抽搐 */
.text-fade-enter-active {
  transition: opacity var(--anim-mid, 0.4s) ease, transform var(--anim-mid, 0.4s) cubic-bezier(0.34, 1.2, 0.5, 1);
}
.text-fade-leave-active {
  transition: opacity var(--anim-fast, 0.28s) ease, transform var(--anim-fast, 0.28s) ease;
  position: absolute;
  width: 100%;
}
.text-fade-enter-from {
  opacity: 0;
  transform: scale(0.9);
}
.text-fade-leave-to {
  opacity: 0;
  transform: scale(1.04);
}

/* 歌词切换: 交叉淡入淡出(无 mode) + 弹性缩放, 消除空白帧 */
.lyric-pop-enter-active {
  transition: opacity 0.2s ease,
              transform 0.3s cubic-bezier(0.34, 1.5, 0.45, 1);
  transform-origin: center;
}
.lyric-pop-leave-active {
  transition: opacity 0.18s ease,
              transform 0.22s cubic-bezier(0.4, 0, 0.7, 0.2);
  position: absolute;
  left: 0;
  width: 100%;
  transform-origin: center;
  pointer-events: none;
}
.lyric-pop-enter-from {
  opacity: 0;
  transform: scale(0.82);
}
.lyric-pop-leave-to {
  opacity: 0;
  transform: scale(1.12);
}

/* 展开内容的弹性动效已通过 CSS 类切换实现 */

/* 歌词行 */
.lyric-line-enter-active {
  transition: all var(--anim-lyric, 0.4s) cubic-bezier(0.4, 0, 0.2, 1);
}
.lyric-line-leave-active {
  transition: all var(--anim-fast, 0.25s) ease;
}
.lyric-line-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.lyric-line-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}
.lyric-line-move {
  transition: transform var(--anim-lyric, 0.4s) cubic-bezier(0.4, 0, 0.2, 1);
}

/* 即将播放预告样式 */
.next-song-preview {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
}

.next-song-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1.2px;
  color: rgba(7, 197, 86, 0.85);
  text-transform: uppercase;
  line-height: 1.2;
  margin-bottom: 1px;
}

.next-song-name {
  color: rgba(255, 255, 255, 0.9) !important;
}

/* 即将播放icon过渡(已弃用, 保留防止残留样式引用) */
.next-song-icon-enter-active {
  transition: opacity 0.3s ease, transform 0.35s cubic-bezier(0.34, 1.5, 0.45, 1);
}
.next-song-icon-leave-active {
  transition: opacity 0.2s ease, transform 0.25s ease;
}
.next-song-icon-enter-from {
  opacity: 0;
  transform: scale(0.5);
}
.next-song-icon-leave-to {
  opacity: 0;
  transform: scale(0.5);
}
</style>

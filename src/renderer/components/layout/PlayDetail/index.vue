<template lang="pug">
transition(enter-active-class="animated slideInRight" leave-active-class="animated slideOutDown" @after-enter="handleAfterEnter" @after-leave="handleAfterLeave")
  div(v-if="isShowPlayerDetail" :class="[$style.container, { fullscreen: isFullscreen }]" @contextmenu="handleContextMenu")
    div(:class="$style.bg")
    div(v-if="musicInfo.pic" :class="$style.ambientBg" :style="ambientBgStyle")
    //- div(:class="$style.bg" :style="bgStyle")
    //- div(:class="$style.bg2")
    ControlBtnsLeftHeader(v-if="appSetting['common.controlBtnPosition'] == 'left'")
    ControlBtnsRightHeader(v-else)
    div(:class="[$style.main, {[$style.showComment]: isShowPlayComment}]")
      div.left(:class="$style.left")
        //- div(:class="$style.info")
        div(:class="$style.info")
          img(v-if="musicInfo.pic" :class="$style.img" :src="musicInfo.pic")
          div.description(:class="['scroll', $style.description]")
            p {{ $t('player__music_name') }}{{ musicInfo.name }}
            p {{ $t('player__music_singer') }}{{ musicInfo.singer }}
            p(v-if="musicInfo.album") {{ $t('player__music_album') }}{{ musicInfo.album }}
            p(v-if="musicInfo.quality") {{ $t('player__music_quality') }}{{ formatQuality(musicInfo.quality) }}

      transition(enter-active-class="animated fadeIn" leave-active-class="animated fadeOut")
        LyricPlayer(v-if="visibled")
      music-comment(v-if="visibled" :class="$style.comment" :show="isShowPlayComment" :music-info="playMusicInfo.musicInfo" @close="hideComment")
    transition(enter-active-class="animated fadeIn" leave-active-class="animated fadeOut")
      play-bar(v-if="visibled")
    transition(enter-active-class="animated-slow fadeIn" leave-active-class="animated-slow fadeOut")
      common-audio-visualizer(v-if="appSetting['player.audioVisualization'] && visibled")
</template>


<script>
import { ref, watch, computed, onMounted, onBeforeUnmount } from '@common/utils/vueTools'
import { parseRGBA, toRGBAString, animateColorTransition, extractColorsFromImage } from '@common/utils/colorInterp'
import { createAmbientAnimation } from '@common/utils/ambientAnimation'
import { isFullscreen } from '@renderer/store'
import {
  isShowPlayerDetail,
  isShowPlayComment,
  musicInfo,
  playMusicInfo,
} from '@renderer/store/player/state'
import {
  setShowPlayerDetail,
  setShowPlayComment,
  setShowPlayLrcSelectContentLrc,
} from '@renderer/store/player/action'
import LyricPlayer from './LyricPlayer.vue'
import PlayBar from './PlayBar.vue'
import MusicComment from './components/MusicComment/index.vue'
import ControlBtnsLeftHeader from './ControlBtnsLeftHeader.vue'
import ControlBtnsRightHeader from './ControlBtnsRightHeader.vue'
import { registerAutoHideMounse, unregisterAutoHideMounse } from './autoHideMounse'
import { appSetting } from '@renderer/store/setting'
import { closeWindow, maxWindow, minWindow, setFullScreen } from '@renderer/utils/ipc'

export default {
  name: 'CorePlayDetail',
  components: {
    ControlBtnsLeftHeader,
    ControlBtnsRightHeader,
    LyricPlayer,
    PlayBar,
    MusicComment,
  },
  setup() {
    const visibled = ref(false)

    // 全屏氛围光背景
    const ambientPrimary = ref('rgba(0, 0, 0, 0)')
    const ambientSecondary = ref('rgba(0, 0, 0, 0)')
    const ambientTertiary = ref('rgba(0, 0, 0, 0)')
    const ambientOffsets = ref([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }])
    const ambientOpacityScale = ref(1)
    let cancelAmbientAnim = null
    let ambientAnimController = null
    let lastExtractedColors = [
      parseRGBA('rgba(0, 0, 0, 0)'),
      parseRGBA('rgba(0, 0, 0, 0)'),
      parseRGBA('rgba(0, 0, 0, 0)'),
    ]

    // 音频能量(供律动模式)
    let currentAudioEnergy = 0
    const getAudioEnergy = () => currentAudioEnergy

    // 从音频可视化获取能量值
    const updateAudioEnergy = () => {
      try {
        const analyser = window.__lx_audio_analyser__
        if (analyser) {
          const data = new Uint8Array(analyser.frequencyBinCount)
          analyser.getByteFrequencyData(data)
          const len = Math.min(data.length, Math.floor(data.length * 0.5))
          let sum = 0
          for (let i = 0; i < len; i++) sum += data[i]
          currentAudioEnergy = sum / (len * 255)
        }
      } catch (_e) {}
    }
    let energyTimer = null

    const ambientBgStyle = computed(() => {
      const ox0 = ambientOffsets.value[0]?.x || 0
      const oy0 = ambientOffsets.value[0]?.y || 0
      const ox1 = ambientOffsets.value[1]?.x || 0
      const oy1 = ambientOffsets.value[1]?.y || 0
      const ox2 = ambientOffsets.value[2]?.x || 0
      const oy2 = ambientOffsets.value[2]?.y || 0
      return {
        background: `
          radial-gradient(ellipse at ${20 + ox0}% ${30 + oy0}%, ${ambientPrimary.value}, transparent 50%),
          radial-gradient(ellipse at ${80 + ox1}% ${70 + oy1}%, ${ambientSecondary.value}, transparent 50%),
          radial-gradient(ellipse at ${50 + ox2}% ${100 + oy2}%, ${ambientTertiary.value}, transparent 60%)
        `,
      }
    })

    watch(() => musicInfo.pic, async(pic) => {
      if (!pic) return
      const colors = await extractColorsFromImage(pic, { size: 32, regions: 'multi' })
      const oldColors = [
        parseRGBA(ambientPrimary.value),
        parseRGBA(ambientSecondary.value),
        parseRGBA(ambientTertiary.value),
      ]
      // 取消之前未完成的动画
      if (cancelAmbientAnim) cancelAmbientAnim()
      cancelAmbientAnim = animateColorTransition(
        oldColors, colors, 1200,
        (interpolated) => {
          ambientPrimary.value = toRGBAString(interpolated[0])
          ambientSecondary.value = toRGBAString(interpolated[1])
          ambientTertiary.value = toRGBAString(interpolated[2])
        },
        () => {
          cancelAmbientAnim = null
          lastExtractedColors = colors
          if (ambientAnimController) ambientAnimController.updateColors(colors)
        },
      )
    }, { immediate: true })

    // 启动/切换动态氛围光
    const initAmbientDynamic = () => {
      if (ambientAnimController) {
        ambientAnimController.cancel()
        ambientAnimController = null
      }
      if (energyTimer) { clearInterval(energyTimer); energyTimer = null }
      const mode = appSetting['playDetail.ambientMode'] || 'off'
      if (mode === 'off') return
      const level = appSetting['playDetail.ambientLevel'] || 'medium'
      // 律动模式需要定期采样音频能量
      if (mode === 'rhythm' || mode === 'combined') {
        energyTimer = setInterval(updateAudioEnergy, 50)
      }
      ambientAnimController = createAmbientAnimation(
        mode, level, lastExtractedColors,
        (data) => {
          ambientPrimary.value = data.colors[0] || ambientPrimary.value
          ambientSecondary.value = data.colors[1] || ambientSecondary.value
          ambientTertiary.value = data.colors[2] || ambientTertiary.value
          ambientOffsets.value = data.offsets
          ambientOpacityScale.value = data.opacityScale
        },
        getAudioEnergy,
      )
    }

    // 监听设置变化
    watch(() => appSetting['playDetail.ambientMode'], () => { initAmbientDynamic() })
    watch(() => appSetting['playDetail.ambientLevel'], () => {
      if (ambientAnimController) {
        ambientAnimController.updateLevel(appSetting['playDetail.ambientLevel'] || 'medium')
      }
    })

    // 页面可见时启动动态动画
    watch(() => isShowPlayerDetail.value, (visible) => {
      if (visible) {
        initAmbientDynamic()
      } else {
        if (ambientAnimController) { ambientAnimController.cancel(); ambientAnimController = null }
        if (energyTimer) { clearInterval(energyTimer); energyTimer = null }
      }
    })

    onBeforeUnmount(() => {
      if (cancelAmbientAnim) cancelAmbientAnim()
      if (ambientAnimController) ambientAnimController.cancel()
      if (energyTimer) clearInterval(energyTimer)
    })

    let clickTime = 0

    const hide = () => {
      setShowPlayerDetail(false)
    }
    const handleContextMenu = () => {
      if (window.performance.now() - clickTime > 400) {
        clickTime = window.performance.now()
        return
      }
      clickTime = 0
      hide()
    }

    const hideComment = () => {
      setShowPlayComment(false)
    }

    const handleAfterEnter = () => {
      if (isFullscreen.value) registerAutoHideMounse()

      visibled.value = true
    }

    const handleAfterLeave = () => {
      setShowPlayLrcSelectContentLrc(false)
      hideComment(false)
      visibled.value = false

      unregisterAutoHideMounse()
    }

    watch(isFullscreen, isFullscreen => {
      (isFullscreen ? registerAutoHideMounse : unregisterAutoHideMounse)()
    })


    return {
      ambientBgStyle,
      appSetting,
      playMusicInfo,
      isShowPlayerDetail,
      isShowPlayComment,
      musicInfo,
      hide,
      handleContextMenu,
      hideComment,
      handleAfterEnter,
      handleAfterLeave,
      visibled,
      isFullscreen,
      formatQuality(quality) {
        if (!quality) return ''
        if (quality == 'flac24bit') return 'FLAC 24bit'
        return quality.toUpperCase()
      },
      fullscreenExit() {
        void setFullScreen(false).then((fullscreen) => {
          isFullscreen.value = fullscreen
        })
      },
      min() {
        minWindow()
      },
      max() {
        maxWindow()
      },
      close() {
        closeWindow()
      },
    }
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

@control-btn-width: @height-toolbar * .26;

.container {
  position: absolute;
  display: flex;
  flex-flow: column nowrap;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  background-color: var(--color-content-background);
  z-index: 10;
  // -webkit-app-region: drag;
  overflow: hidden;
  border-radius: @radius-border;
  color: var(--color-font);
  // border-left: 12px solid var(--color-primary-alpha-900);
  -webkit-app-region: no-drag;
  contain: strict;

  box-sizing: border-box;

  * {
    box-sizing: border-box;
  }
}
.bg {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  background: var(--background-image) var(--background-image-position) no-repeat;
  background-size: var(--background-image-size);
  // background-size: 110% 110%;
  // filter: blur(60px);
  opacity: .7;
  z-index: -1;
  &:before {
    content: '';
    display: block;
    width: 100%;
    height: 100%;
    background-color: var(--color-app-background);
  }
  &:after {
    position: absolute;
    left: 0;
    top: 0;
    content: '';
    display: block;
    width: 100%;
    height: 100%;
    background-color: var(--color-main-background);
  }
}
.ambientBg {
  position: absolute;
  inset: 0;
  z-index: 0;
  opacity: 0.55;
  filter: blur(80px) saturate(1.6);
  pointer-events: none;
}
// .bg2 {
//   position: absolute;
//   width: 100%;
//   height: 100%;
//   top: 0;
//   left: 0;
//   z-index: -1;
//   background-color: rgba(255, 255, 255, .8);
// }

.main {
  flex: auto;
  min-height: 0;
  overflow: hidden;
  display: flex;
  margin: 0 30px;
  position: relative;

  &.showComment {
    :global {
      .left {
        flex-basis: 18%;
        .description p {
          font-size: 12px;
        }
      }
      .right {
        flex-basis: 30%;
        .lyricSelectContent {
          font-size: 14px;
        }
      }
      .comment {
        opacity: 1;
        transform: scaleX(1);
      }
    }
  }
}
.left {
  flex: 0 0 40%;
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  padding: 13px;
  overflow: hidden;
  transition: flex-basis @transition-normal;
}

.info {
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
  max-width: 300px;
  min-height: 0;
}
.img {
  max-width: 100%;
  max-height: 80%;
  min-width: 100%;
  box-shadow: 0 0 6px var(--color-primary-alpha-500);
  border-radius: 6px;
  opacity: .8;
}
.description {
  max-width: 300px;
  margin-top: 15px;
  padding-bottom: 15px;
  min-height: 0;
  p {
    line-height: 1.5;
    font-size: 14px;
    overflow-wrap: break-word;
  }
}


.comment {
  position: absolute;
  right: 0;
  top: 0;
  width: 50%;
  height: 100%;
  opacity: 1;
  margin-left: 10px;
  transform: scaleX(0);
}


</style>

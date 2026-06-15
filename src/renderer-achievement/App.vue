<template>
  <div id="achievement-container" :style="containerStyle">
    <transition-group name="achievement">
      <div
        v-for="item in achievements"
        :key="item.id"
        class="achievement-item"
        :style="achievementStyle"
      >
        <img
          v-if="setting['achievement.showCover'] && item.pic"
          :src="item.pic"
          class="achievement-icon"
          @error="handleCoverError"
        />
        <div v-else-if="setting['achievement.showCover']" class="achievement-icon achievement-icon-placeholder">
          <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
        </div>
        <div class="achievement-text">
          <div class="achievement-title">{{ item.name }}</div>
          <div class="achievement-description">{{ item.singer }}</div>
        </div>
      </div>
    </transition-group>
  </div>
</template>

<script>
import { ref, computed, watch } from '@common/utils/vueTools'
import { setting, musicInfo, isPlay, isConnected } from '@achievement/store/state'

let achievementId = 0

export default {
  setup() {
    const achievements = ref([])

    const containerStyle = computed(() => {
      const font = setting['achievement.font']
      // 字体名已由系统字体列表给出(可能自带引号), 直接使用避免重复加引号导致非法 CSS
      return {
        '--achievement-font': font || 'inherit',
      }
    })

    const achievementStyle = computed(() => {
      const opacity = (setting['achievement.opacity'] ?? 85) / 100
      const fontSize = setting['achievement.fontSize'] ?? 14
      return {
        backgroundColor: `rgba(51, 51, 51, ${opacity})`,
        fontSize: fontSize + 'px',
        fontFamily: 'var(--achievement-font)',
      }
    })

    let audioCtx = null
    let lastSongId = ''

    const playSound = () => {
      if (!setting['achievement.enableSound']) return
      try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
        const volume = (setting['achievement.soundVolume'] ?? 50) / 100
        const now = audioCtx.currentTime

        const playNote = (freq, startTime, duration, gainVal) => {
          const osc = audioCtx.createOscillator()
          const gain = audioCtx.createGain()
          osc.type = 'sine'
          osc.frequency.setValueAtTime(freq, startTime)
          gain.gain.setValueAtTime(gainVal * volume, startTime)
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
          osc.connect(gain)
          gain.connect(audioCtx.destination)
          osc.start(startTime)
          osc.stop(startTime + duration)
        }

        playNote(784, now, 0.15, 0.3)
        playNote(988, now + 0.12, 0.15, 0.3)
        playNote(1319, now + 0.24, 0.3, 0.25)
      } catch (_e) {}
    }

    const showAchievement = () => {
      if (!musicInfo.name) return

      const id = ++achievementId
      const item = {
        id,
        songId: musicInfo.id,
        name: musicInfo.name,
        singer: musicInfo.singer,
        pic: musicInfo.pic,
      }

      achievements.value.push(item)
      playSound()

      const maxVisible = setting['achievement.maxVisible'] ?? 5
      while (achievements.value.length > maxVisible) {
        achievements.value.shift()
      }

      const duration = setting['achievement.duration'] ?? 5000
      setTimeout(() => {
        const idx = achievements.value.findIndex(a => a.id === id)
        if (idx !== -1) {
          achievements.value.splice(idx, 1)
        }
      }, duration)
    }

    // 封面异步到达时回填已展示的同一首歌的成就项
    watch(() => musicInfo.pic, (pic) => {
      if (!pic) return
      for (const item of achievements.value) {
        if (item.songId === musicInfo.id && !item.pic) item.pic = pic
      }
    })

    // 监听歌曲切换 - 只在连接后且 id 真正变化时触发
    watch(() => musicInfo.id, (newId, oldId) => {
      if (!isConnected.value) return
      if (newId && newId !== lastSongId) {
        lastSongId = newId
        // 首次连接时 oldId 为空，此时不显示成就（这是初始同步，不是切歌）
        if (oldId) {
          showAchievement()
        }
      }
    })

    watch(isPlay, (playing) => {
      if (setting['achievement.pauseHide'] && !playing) {
        achievements.value = []
      }
    })

    const handleCoverError = (e) => {
      e.target.style.display = 'none'
    }

    return {
      setting,
      achievements,
      containerStyle,
      achievementStyle,
      handleCoverError,
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

.windows { font-family: "Segoe WPC", "Segoe UI", sans-serif; }
.windows:lang(zh-Hans) { font-family: "Microsoft YaHei", "Segoe WPC", "Segoe UI", sans-serif; }
.windows:lang(zh-Hant) { font-family: "Microsoft Jhenghei", "Segoe WPC", "Segoe UI", sans-serif; }
.mac { font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
.mac:lang(zh-Hans) { font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", sans-serif; }
.linux { font-family: system-ui, "Ubuntu", "Droid Sans", sans-serif; }
.linux:lang(zh-Hans) { font-family: system-ui, "Ubuntu", "Droid Sans", "Source Han Sans SC", sans-serif; }

#root {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: flex-end;
  font-family: inherit;
}

#achievement-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  width: 100%;
}

.achievement-item {
  display: flex;
  align-items: center;
  border: 2px solid rgba(68, 68, 68, 0.8);
  border-radius: 5px;
  padding: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
  transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94),
              opacity 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  width: 100%;
  font-family: var(--achievement-font, inherit);
}

.achievement-icon {
  width: 50px;
  height: 50px;
  border: 2px solid rgba(85, 85, 85, 0.8);
  margin-right: 10px;
  object-fit: cover;
  flex-shrink: 0;
}

.achievement-icon-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.4);
}

.achievement-text {
  flex: 1;
  min-width: 0;
}

.achievement-title {
  font-weight: bold;
  color: #ffff55;
  margin-bottom: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.achievement-description {
  color: #aaaaaa;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Slide-in animation */
.achievement-enter-active {
  transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94),
              opacity 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.achievement-leave-active {
  transition: transform 0.5s cubic-bezier(0.55, 0.06, 0.68, 0.19),
              opacity 0.5s cubic-bezier(0.55, 0.06, 0.68, 0.19);
}

.achievement-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.achievement-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.achievement-move {
  transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}


</style>

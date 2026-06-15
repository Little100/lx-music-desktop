import { ref, shallowReactive, reactive } from '@common/utils/vueTools'

export const setting = shallowReactive<LX.AppSetting>({
  'dynamicIsland.enable': false,
  'dynamicIsland.offsetY': 80,
  'dynamicIsland.collapsedWidth': 280,
  'dynamicIsland.collapsedHeight': 48,
  'dynamicIsland.expandedWidth': 380,
  'dynamicIsland.expandedHeight': 220,
  'dynamicIsland.autoHideInfoDelay': 3000,
  'dynamicIsland.mouseLeaveDelay': 1000,
  'dynamicIsland.hoverExpandDelay': 500,
  'dynamicIsland.isAlwaysOnTop': true,
  'dynamicIsland.isAlwaysOnTopLoop': true,
  'dynamicIsland.audioVisualization': true,
  'dynamicIsland.visualizerAmplify': 2,
  'dynamicIsland.autoVisualizerAmplify': true,
  'dynamicIsland.useAcrylic': true,
  'dynamicIsland.blur': 15,
  'dynamicIsland.opacity': 85,
  'dynamicIsland.animationSpeed': 100,
  'dynamicIsland.lyricAlign': 'center',
  'dynamicIsland.alwaysShowLyric': false,
  'dynamicIsland.lyricMode': 'original',
  'dynamicIsland.pausedOpacity': false,
  'dynamicIsland.font': '',
  'common.langId': 'zh-cn',
  'player.isShowLyricTranslation': false,
  'player.isShowLyricRoma': false,
  'player.isSwapLyricTranslationAndRoma': false,
  'player.isPlayLxlrc': false,
  'player.playbackRate': 1,
  'desktopLyric.style.font': '',
} as unknown as LX.AppSetting)

export const musicInfo = shallowReactive({
  id: '',
  name: '',
  singer: '',
  album: '',
  pic: '',
})

export const isPlay = ref(false)

export const uiState = reactive({
  isExpanded: false,
  showInfo: false,
  isMouseInside: false,
  isDocked: false,
})

// 即将播放的下一首歌信息(自然切歌预告)
export const nextSongInfo = reactive({
  name: '',
  singer: '',
  pic: '',
  active: false,
})

export interface LyricLine {
  text: string
  extendedLyrics: string[]
}

export const lyricState = reactive<{
  lines: LyricLine[]
  currentLine: number
}>({
  lines: [],
  currentLine: 0,
})

// 每行歌词的起始时间戳(ms), 用于卡拉OK进度着色
export const lyricLineTimes = ref<number[]>([])

// 当前行卡拉OK进度(0~100)
export const lineProgress = ref(0)

export const playTime = reactive({
  played: 0,
  duration: 0,
})

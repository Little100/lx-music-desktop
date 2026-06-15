<template lang="pug">
dt#play_detail {{ $t('setting__play_detail') }}
dd
  .gap-top
    base-checkbox(id="setting_play_detail_font_zoom_enable" :model-value="appSetting['playDetail.isZoomActiveLrc']" :label="$t('setting__play_detail_font_zoom')" @update:model-value="updateSetting({'playDetail.isZoomActiveLrc': $event})")
  .gap-top
    base-checkbox(id="setting_play_detail_lyric_delayScroll" :model-value="appSetting['playDetail.isDelayScroll']" :label="$t('setting__play_detail_lyric_delay_scroll')" @update:model-value="updateSetting({ 'playDetail.isDelayScroll': $event })")
  .gap-top
    base-checkbox(id="setting_play_detail_lyric_progress_enable" :model-value="appSetting['playDetail.isShowLyricProgressSetting']" :label="$t('setting__play_detail_lyric_progress')" @update:model-value="updateSetting({'playDetail.isShowLyricProgressSetting': $event})")

dd
  h3#play_detail_align {{ $t('setting__play_detail_align') }}
  div
    base-checkbox.gap-left(id="setting_play_detail_align_left" :model-value="appSetting['playDetail.style.align']" need value="left" :label="$t('setting__play_detail_align_left')" @update:model-value="updateSetting({ 'playDetail.style.align': $event })")
    base-checkbox.gap-left(id="setting_play_detail_align_center" :model-value="appSetting['playDetail.style.align']" need value="center" :label="$t('setting__play_detail_align_center')" @update:model-value="updateSetting({ 'playDetail.style.align': $event })")
    base-checkbox.gap-left(id="setting_play_detail_align_right" :model-value="appSetting['playDetail.style.align']" need value="right" :label="$t('setting__play_detail_align_right')" @update:model-value="updateSetting({ 'playDetail.style.align': $event })")

dd
  h3#play_detail_audio_visualization {{ $t('setting__play_detail_audio_visualization') }}
  div
    .gap-top
      base-checkbox(id="setting_play_detail_audio_visualization_enable" :model-value="appSetting['player.audioVisualization']" :label="$t('setting__play_detail_audio_visualization_enable')" @update:model-value="updateSetting({'player.audioVisualization': $event})")

dd
  h3#play_detail_ambient {{ $t('setting__play_detail_ambient_mode') }}
  div
    base-checkbox.gap-left(id="setting_play_detail_ambient_off" :model-value="appSetting['playDetail.ambientMode']" need value="off" :label="$t('setting__play_detail_ambient_mode_off')" @update:model-value="updateSetting({ 'playDetail.ambientMode': $event })")
    base-checkbox.gap-left(id="setting_play_detail_ambient_drift" :model-value="appSetting['playDetail.ambientMode']" need value="drift" :label="$t('setting__play_detail_ambient_mode_drift')" @update:model-value="updateSetting({ 'playDetail.ambientMode': $event })")
    base-checkbox.gap-left(id="setting_play_detail_ambient_pulse" :model-value="appSetting['playDetail.ambientMode']" need value="pulse" :label="$t('setting__play_detail_ambient_mode_pulse')" @update:model-value="updateSetting({ 'playDetail.ambientMode': $event })")
    base-checkbox.gap-left(id="setting_play_detail_ambient_rhythm" :model-value="appSetting['playDetail.ambientMode']" need value="rhythm" :label="$t('setting__play_detail_ambient_mode_rhythm')" @update:model-value="updateSetting({ 'playDetail.ambientMode': $event })")
    base-checkbox.gap-left(id="setting_play_detail_ambient_combined" :model-value="appSetting['playDetail.ambientMode']" need value="combined" :label="$t('setting__play_detail_ambient_mode_combined')" @update:model-value="updateSetting({ 'playDetail.ambientMode': $event })")
  div(v-if="appSetting['playDetail.ambientMode'] !== 'off'")
    .gap-top
      span {{ $t('setting__play_detail_ambient_level') }}
    div
      base-checkbox.gap-left(id="setting_play_detail_ambient_level_low" :model-value="appSetting['playDetail.ambientLevel']" need value="low" :label="$t('setting__play_detail_ambient_level_low')" @update:model-value="updateSetting({ 'playDetail.ambientLevel': $event })")
      base-checkbox.gap-left(id="setting_play_detail_ambient_level_medium" :model-value="appSetting['playDetail.ambientLevel']" need value="medium" :label="$t('setting__play_detail_ambient_level_medium')" @update:model-value="updateSetting({ 'playDetail.ambientLevel': $event })")
      base-checkbox.gap-left(id="setting_play_detail_ambient_level_high" :model-value="appSetting['playDetail.ambientLevel']" need value="high" :label="$t('setting__play_detail_ambient_level_high')" @update:model-value="updateSetting({ 'playDetail.ambientLevel': $event })")
  div(v-if="appSetting['player.audioVisualization']")
    .gap-top
      div
        span {{ $t('setting__play_detail_audio_visualization_fftsize', { num: appSetting['player.audioVisualization.fftSize'] }) }}
      div(style="--selection-width: 8rem; margin-top: 6px;")
        base-selection(:model-value="appSetting['player.audioVisualization.fftSize']" :list="fftSizeList" item-key="id" item-name="name" @update:model-value="updateSetting({ 'player.audioVisualization.fftSize': $event })")
    .gap-top
      div
        span {{ $t('setting__play_detail_audio_visualization_smoothing', { num: appSetting['player.audioVisualization.smoothing'] }) }}
      base-slider-bar(
        :class="$style.slider"
        :value="appSetting['player.audioVisualization.smoothing']"
        :min="0"
        :max="100"
        @change="updateSetting({ 'player.audioVisualization.smoothing': Math.round($event) })")
    .gap-top
      div
        span {{ $t('setting__play_detail_audio_visualization_height_scale', { num: appSetting['player.audioVisualization.heightScale'] }) }}
      base-slider-bar(
        :class="$style.slider"
        :value="appSetting['player.audioVisualization.heightScale']"
        :min="5"
        :max="100"
        @change="updateSetting({ 'player.audioVisualization.heightScale': Math.round($event) })")
    .gap-top
      div
        span {{ $t('setting__play_detail_audio_visualization_opacity', { num: appSetting['player.audioVisualization.opacity'] }) }}
      base-slider-bar(
        :class="$style.slider"
        :value="appSetting['player.audioVisualization.opacity']"
        :min="5"
        :max="100"
        @change="updateSetting({ 'player.audioVisualization.opacity': Math.round($event) })")
    .gap-top
      div
        span {{ $t('setting__play_detail_audio_visualization_amplitude_scale', { num: (appSetting['player.audioVisualization.amplitudeScale'] / 100).toFixed(1) }) }}
      base-slider-bar(
        :class="$style.slider"
        :value="appSetting['player.audioVisualization.amplitudeScale']"
        :min="10"
        :max="300"
        @change="updateSetting({ 'player.audioVisualization.amplitudeScale': Math.round($event) })")
    .gap-top
      div
        span {{ $t('setting__play_detail_audio_visualization_bar_count', { num: appSetting['player.audioVisualization.barCount'] }) }}
      div(style="--selection-width: 8rem; margin-top: 6px;")
        base-selection(:model-value="appSetting['player.audioVisualization.barCount']" :list="barCountList" item-key="id" item-name="name" @update:model-value="updateSetting({ 'player.audioVisualization.barCount': $event })")
    .gap-top
      div
        span {{ $t('setting__play_detail_audio_visualization_bar_width', { num: appSetting['player.audioVisualization.barWidth'] === 0 ? $t('setting__play_detail_audio_visualization_bar_width_auto') : appSetting['player.audioVisualization.barWidth'] + 'px' }) }}
      div(style="--selection-width: 8rem; margin-top: 6px;")
        base-selection(:model-value="appSetting['player.audioVisualization.barWidth']" :list="barWidthList" item-key="id" item-name="name" @update:model-value="updateSetting({ 'player.audioVisualization.barWidth': $event })")
    .gap-top
      span {{ $t('setting__play_detail_audio_visualization_display_mode') }}
      base-checkbox.gap-left(id="setting_vis_bars" :model-value="appSetting['player.audioVisualization.showBars']" :label="$t('setting__play_detail_audio_visualization_bars')" @update:model-value="updateSetting({ 'player.audioVisualization.showBars': $event })")
      base-checkbox.gap-left(id="setting_vis_wave" :model-value="appSetting['player.audioVisualization.showWave']" :label="$t('setting__play_detail_audio_visualization_wave')" @update:model-value="updateSetting({ 'player.audioVisualization.showWave': $event })")
    .gap-top
      base-checkbox(id="setting_vis_log_scale" :model-value="appSetting['player.audioVisualization.useLogScale']" :label="$t('setting__play_detail_audio_visualization_log_scale')" @update:model-value="updateSetting({ 'player.audioVisualization.useLogScale': $event })")
      base-checkbox.gap-left(id="setting_vis_linear_scale" :model-value="!appSetting['player.audioVisualization.useLogScale']" :label="$t('setting__play_detail_audio_visualization_linear_scale')" @update:model-value="updateSetting({ 'player.audioVisualization.useLogScale': !$event })")
    .gap-top
      base-checkbox(id="setting_vis_center_mirror" :model-value="appSetting['player.audioVisualization.centerMirror']" :label="$t('setting__play_detail_audio_visualization_center_mirror')" @update:model-value="updateSetting({ 'player.audioVisualization.centerMirror': $event })")
    .gap-top
      div
        span {{ $t('setting__play_detail_audio_visualization_target_fps', { num: appSetting['player.audioVisualization.targetFps'] === 0 ? $t('setting__play_detail_audio_visualization_target_fps_unlimited') : appSetting['player.audioVisualization.targetFps'] }) }}
      div(style="margin-top: 6px;")
        base-input(:class="$style.fpsInput" :model-value="appSetting['player.audioVisualization.targetFps']" type="number" :placeholder="$t('setting__play_detail_audio_visualization_target_fps_tip')" @update:model-value="setTargetFps")

</template>

<script>
import { appSetting, updateSetting } from '@renderer/store/setting'

const fftSizeList = [
  { id: 256, name: '256' },
  { id: 512, name: '512' },
  { id: 1024, name: '1024' },
  { id: 2048, name: '2048' },
  { id: 4096, name: '4096' },
  { id: 8192, name: '8192' },
  { id: 16384, name: '16384' },
  { id: 32768, name: '32768' },
]

const barCountList = [
  { id: 64, name: '64' },
  { id: 128, name: '128' },
  { id: 256, name: '256' },
  { id: 512, name: '512' },
  { id: 1024, name: '1024' },
  { id: 2048, name: '2048' },
  { id: 4096, name: '4096' },
  { id: 8192, name: '8192' },
]

const barWidthList = [
  { id: 0, name: 'Auto' },
  { id: 1, name: '1px' },
  { id: 2, name: '2px' },
  { id: 3, name: '3px' },
  { id: 4, name: '4px' },
  { id: 5, name: '5px' },
  { id: 6, name: '6px' },
  { id: 8, name: '8px' },
  { id: 10, name: '10px' },
  { id: 12, name: '12px' },
  { id: 15, name: '15px' },
  { id: 20, name: '20px' },
]

const fpsList = [
  { id: 0, name: 'Unlimited' },
  { id: 15, name: '15' },
  { id: 24, name: '24' },
  { id: 30, name: '30' },
  { id: 45, name: '45' },
  { id: 60, name: '60' },
]

const setTargetFps = (val) => {
  const num = parseInt(val)
  if (isNaN(num) || num < 0) return
  updateSetting({ 'player.audioVisualization.targetFps': Math.min(300, num) })
}

export default {
  name: 'SettingPlayDetail',
  setup() {
    return {
      appSetting,
      updateSetting,
      fftSizeList,
      barCountList,
      barWidthList,
      fpsList,
      setTargetFps,
    }
  },
}
</script>

<style lang="less" module>
.slider {
  width: 100%;
  margin-top: 4px;
}
.fpsInput {
  width: 120px;
}
</style>

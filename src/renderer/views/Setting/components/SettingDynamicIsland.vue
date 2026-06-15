<template lang="pug">
dt#dynamic_island {{ $t('setting__dynamic_island') }}
dd
  .gap-top
    base-checkbox(id="setting_dynamic_island_enable" :model-value="appSetting['dynamicIsland.enable']" :label="$t('setting__dynamic_island_enable')" @update:model-value="updateSetting({ 'dynamicIsland.enable': $event })")
  .gap-top
    base-checkbox(id="setting_dynamic_island_always_on_top" :model-value="appSetting['dynamicIsland.isAlwaysOnTop']" :label="$t('setting__dynamic_island_always_on_top')" @update:model-value="updateSetting({ 'dynamicIsland.isAlwaysOnTop': $event })")
  .gap-top
    base-checkbox(id="setting_dynamic_island_always_on_top_loop" :model-value="appSetting['dynamicIsland.isAlwaysOnTopLoop']" :label="$t('setting__dynamic_island_always_on_top_loop')" @update:model-value="updateSetting({ 'dynamicIsland.isAlwaysOnTopLoop': $event })")
    svg-icon(class="help-icon" name="help-circle-outline" :aria-label="$t('setting__dynamic_island_always_on_top_loop_tip')")
  .gap-top
    base-checkbox(id="setting_dynamic_island_audio_visualization" :model-value="appSetting['dynamicIsland.audioVisualization']" :label="$t('setting__dynamic_island_audio_visualization')" @update:model-value="updateSetting({ 'dynamicIsland.audioVisualization': $event })")
  .gap-top(v-if="appSetting['dynamicIsland.audioVisualization']")
    base-checkbox(id="setting_dynamic_island_auto_visualizer_amplify" :model-value="appSetting['dynamicIsland.autoVisualizerAmplify']" :label="$t('setting__dynamic_island_auto_visualizer_amplify')" @update:model-value="updateSetting({ 'dynamicIsland.autoVisualizerAmplify': $event })")
  .gap-top
    base-checkbox(id="setting_dynamic_island_always_show_lyric" :model-value="appSetting['dynamicIsland.alwaysShowLyric']" :label="$t('setting__dynamic_island_always_show_lyric')" @update:model-value="updateSetting({ 'dynamicIsland.alwaysShowLyric': $event })")
  .gap-top
    base-checkbox(id="setting_dynamic_island_paused_opacity" :model-value="appSetting['dynamicIsland.pausedOpacity']" :label="$t('setting__dynamic_island_paused_opacity')" @update:model-value="updateSetting({ 'dynamicIsland.pausedOpacity': $event })")

dd
  h3#dynamic_island_lyric_mode {{ $t('setting__dynamic_island_lyric_mode') }}
  div
    base-checkbox.gap-left(id="setting_dynamic_island_lyric_mode_original" :model-value="appSetting['dynamicIsland.lyricMode']" need value="original" :label="$t('setting__dynamic_island_lyric_mode_original')" @update:model-value="updateSetting({ 'dynamicIsland.lyricMode': $event })")
    base-checkbox.gap-left(id="setting_dynamic_island_lyric_mode_translation" :model-value="appSetting['dynamicIsland.lyricMode']" need value="translation" :label="$t('setting__dynamic_island_lyric_mode_translation')" @update:model-value="updateSetting({ 'dynamicIsland.lyricMode': $event })")
    base-checkbox.gap-left(id="setting_dynamic_island_lyric_mode_both" :model-value="appSetting['dynamicIsland.lyricMode']" need value="both" :label="$t('setting__dynamic_island_lyric_mode_both')" @update:model-value="updateSetting({ 'dynamicIsland.lyricMode': $event })")

dd
  h3#dynamic_island_appearance {{ $t('setting__dynamic_island_appearance') }}
  div
    .gap-top
      span {{ $t('setting__dynamic_island_offset_y', { num: appSetting['dynamicIsland.offsetY'] }) }}
      base-slider-bar(
        :class="$style.slider"
        :value="appSetting['dynamicIsland.offsetY']"
        :min="0"
        :max="300"
        @change="updateSetting({ 'dynamicIsland.offsetY': Math.round($event) })")
    .gap-top
      span {{ $t('setting__dynamic_island_collapsed_width', { num: appSetting['dynamicIsland.collapsedWidth'] }) }}
      base-slider-bar(
        :class="$style.slider"
        :value="appSetting['dynamicIsland.collapsedWidth']"
        :min="160"
        :max="600"
        @change="updateSetting({ 'dynamicIsland.collapsedWidth': Math.round($event) })")
    .gap-top
      span {{ $t('setting__dynamic_island_collapsed_height', { num: appSetting['dynamicIsland.collapsedHeight'] }) }}
      base-slider-bar(
        :class="$style.slider"
        :value="appSetting['dynamicIsland.collapsedHeight']"
        :min="28"
        :max="80"
        @change="updateSetting({ 'dynamicIsland.collapsedHeight': Math.round($event) })")
    .gap-top
      span {{ $t('setting__dynamic_island_expanded_width', { num: appSetting['dynamicIsland.expandedWidth'] }) }}
      base-slider-bar(
        :class="$style.slider"
        :value="appSetting['dynamicIsland.expandedWidth']"
        :min="200"
        :max="800"
        @change="updateSetting({ 'dynamicIsland.expandedWidth': Math.round($event) })")
    .gap-top
      span {{ $t('setting__dynamic_island_expanded_height', { num: appSetting['dynamicIsland.expandedHeight'] }) }}
      base-slider-bar(
        :class="$style.slider"
        :value="appSetting['dynamicIsland.expandedHeight']"
        :min="80"
        :max="400"
        @change="updateSetting({ 'dynamicIsland.expandedHeight': Math.round($event) })")
    .gap-top
      span {{ $t('setting__dynamic_island_blur', { num: appSetting['dynamicIsland.blur'] }) }}
      base-slider-bar(
        :class="$style.slider"
        :value="appSetting['dynamicIsland.blur']"
        :min="0"
        :max="30"
        @change="updateSetting({ 'dynamicIsland.blur': Math.round($event) })")
    .gap-top(v-if="appSetting['dynamicIsland.audioVisualization'] && !appSetting['dynamicIsland.autoVisualizerAmplify']")
      span {{ $t('setting__dynamic_island_visualizer_amplify', { num: appSetting['dynamicIsland.visualizerAmplify'] }) }}
      base-slider-bar(
        :class="$style.slider"
        :value="appSetting['dynamicIsland.visualizerAmplify']"
        :min="1"
        :max="6"
        @change="updateSetting({ 'dynamicIsland.visualizerAmplify': $event })")

dd
  h3#dynamic_island_lyric_align {{ $t('setting__dynamic_island_lyric_align') }}
  div
    base-checkbox.gap-left(id="setting_dynamic_island_lyric_align_left" :model-value="appSetting['dynamicIsland.lyricAlign']" need value="left" :label="$t('setting__dynamic_island_lyric_align_left')" @update:model-value="updateSetting({ 'dynamicIsland.lyricAlign': $event })")
    base-checkbox.gap-left(id="setting_dynamic_island_lyric_align_center" :model-value="appSetting['dynamicIsland.lyricAlign']" need value="center" :label="$t('setting__dynamic_island_lyric_align_center')" @update:model-value="updateSetting({ 'dynamicIsland.lyricAlign': $event })")
    base-checkbox.gap-left(id="setting_dynamic_island_lyric_align_right" :model-value="appSetting['dynamicIsland.lyricAlign']" need value="right" :label="$t('setting__dynamic_island_lyric_align_right')" @update:model-value="updateSetting({ 'dynamicIsland.lyricAlign': $event })")

dd
  h3#dynamic_island_font {{ $t('setting__dynamic_island_font') }}
  div
    base-selection.gap-left(:list="fontList" :model-value="appSetting['dynamicIsland.font']" item-key="id" item-name="label" @update:model-value="updateSetting({ 'dynamicIsland.font': $event })")

dd
  h3#dynamic_island_behavior {{ $t('setting__dynamic_island_behavior') }}
  div
    .gap-top
      span {{ $t('setting__dynamic_island_auto_hide_info_delay', { num: appSetting['dynamicIsland.autoHideInfoDelay'] }) }}
      base-slider-bar(
        :class="$style.slider"
        :value="appSetting['dynamicIsland.autoHideInfoDelay']"
        :min="500"
        :max="10000"
        @change="updateSetting({ 'dynamicIsland.autoHideInfoDelay': Math.round($event) })")
    .gap-top
      span {{ $t('setting__dynamic_island_hover_expand_delay', { num: appSetting['dynamicIsland.hoverExpandDelay'] }) }}
      base-slider-bar(
        :class="$style.slider"
        :value="appSetting['dynamicIsland.hoverExpandDelay']"
        :min="0"
        :max="3000"
        @change="updateSetting({ 'dynamicIsland.hoverExpandDelay': Math.round($event) })")
    .gap-top
      span {{ $t('setting__dynamic_island_mouse_leave_delay', { num: appSetting['dynamicIsland.mouseLeaveDelay'] }) }}
      base-slider-bar(
        :class="$style.slider"
        :value="appSetting['dynamicIsland.mouseLeaveDelay']"
        :min="0"
        :max="5000"
        @change="updateSetting({ 'dynamicIsland.mouseLeaveDelay': Math.round($event) })")

dd
  h3#dynamic_island_ambient {{ $t('setting__dynamic_island_ambient_mode') }}
  div
    base-checkbox.gap-left(id="setting_dynamic_island_ambient_off" :model-value="appSetting['dynamicIsland.ambientMode']" need value="off" :label="$t('setting__dynamic_island_ambient_mode_off')" @update:model-value="updateSetting({ 'dynamicIsland.ambientMode': $event })")
    base-checkbox.gap-left(id="setting_dynamic_island_ambient_drift" :model-value="appSetting['dynamicIsland.ambientMode']" need value="drift" :label="$t('setting__dynamic_island_ambient_mode_drift')" @update:model-value="updateSetting({ 'dynamicIsland.ambientMode': $event })")
    base-checkbox.gap-left(id="setting_dynamic_island_ambient_pulse" :model-value="appSetting['dynamicIsland.ambientMode']" need value="pulse" :label="$t('setting__dynamic_island_ambient_mode_pulse')" @update:model-value="updateSetting({ 'dynamicIsland.ambientMode': $event })")
    base-checkbox.gap-left(id="setting_dynamic_island_ambient_rhythm" :model-value="appSetting['dynamicIsland.ambientMode']" need value="rhythm" :label="$t('setting__dynamic_island_ambient_mode_rhythm')" @update:model-value="updateSetting({ 'dynamicIsland.ambientMode': $event })")
    base-checkbox.gap-left(id="setting_dynamic_island_ambient_combined" :model-value="appSetting['dynamicIsland.ambientMode']" need value="combined" :label="$t('setting__dynamic_island_ambient_mode_combined')" @update:model-value="updateSetting({ 'dynamicIsland.ambientMode': $event })")
  div(v-if="appSetting['dynamicIsland.ambientMode'] !== 'off'")
    .gap-top
      span {{ $t('setting__dynamic_island_ambient_level') }}
    div
      base-checkbox.gap-left(id="setting_dynamic_island_ambient_level_low" :model-value="appSetting['dynamicIsland.ambientLevel']" need value="low" :label="$t('setting__dynamic_island_ambient_level_low')" @update:model-value="updateSetting({ 'dynamicIsland.ambientLevel': $event })")
      base-checkbox.gap-left(id="setting_dynamic_island_ambient_level_medium" :model-value="appSetting['dynamicIsland.ambientLevel']" need value="medium" :label="$t('setting__dynamic_island_ambient_level_medium')" @update:model-value="updateSetting({ 'dynamicIsland.ambientLevel': $event })")
      base-checkbox.gap-left(id="setting_dynamic_island_ambient_level_high" :model-value="appSetting['dynamicIsland.ambientLevel']" need value="high" :label="$t('setting__dynamic_island_ambient_level_high')" @update:model-value="updateSetting({ 'dynamicIsland.ambientLevel': $event })")
</template>

<script>
import { ref, computed } from '@common/utils/vueTools'
import { useI18n } from '@renderer/plugins/i18n'
import { appSetting, updateSetting } from '@renderer/store/setting'
import { getSystemFonts } from '@renderer/utils/ipc'

export default {
  name: 'SettingDynamicIsland',
  setup() {
    const t = useI18n()
    const systemFontList = ref([])
    const fontList = computed(() => {
      return [{ id: '', label: t('setting__dynamic_island_font_default') }, ...systemFontList.value]
    })
    void getSystemFonts().then(fonts => {
      systemFontList.value = fonts.map(f => ({ id: f, label: f.replace(/(^"|"$)/g, '') }))
    })
    return {
      appSetting,
      updateSetting,
      fontList,
    }
  },
}
</script>

<style lang="less" module>
.slider {
  width: 100%;
  margin-top: 4px;
}
</style>

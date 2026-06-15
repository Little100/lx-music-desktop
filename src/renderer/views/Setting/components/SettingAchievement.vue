<template lang="pug">
dt#achievement {{ $t('setting__achievement') }}
dd
  .gap-top
    base-checkbox(id="setting_achievement_enable" :model-value="appSetting['achievement.enable']" :label="$t('setting__achievement_enable')" @update:model-value="updateSetting({ 'achievement.enable': $event })")
  .gap-top
    base-checkbox(id="setting_achievement_show_cover" :model-value="appSetting['achievement.showCover']" :label="$t('setting__achievement_show_cover')" @update:model-value="updateSetting({ 'achievement.showCover': $event })")
  .gap-top
    base-checkbox(id="setting_achievement_pause_hide" :model-value="appSetting['achievement.pauseHide']" :label="$t('setting__achievement_pause_hide')" @update:model-value="updateSetting({ 'achievement.pauseHide': $event })")

dd
  h3#achievement_font {{ $t('setting__achievement_font') }}
  div
    .gap-top
      base-selection(:list="fontList" :model-value="appSetting['achievement.font']" item-key="id" item-name="label" @update:model-value="updateSetting({ 'achievement.font': $event })")

dd
  h3#achievement_sound {{ $t('setting__achievement_sound') }}
  div
    .gap-top
      base-checkbox(id="setting_achievement_enable_sound" :model-value="appSetting['achievement.enableSound']" :label="$t('setting__achievement_enable_sound')" @update:model-value="updateSetting({ 'achievement.enableSound': $event })")
    .gap-top(v-if="appSetting['achievement.enableSound']")
      span {{ $t('setting__achievement_sound_volume', { num: appSetting['achievement.soundVolume'] }) }}
      base-slider-bar(
        :class="$style.slider"
        :value="appSetting['achievement.soundVolume']"
        :min="0"
        :max="100"
        @change="updateSetting({ 'achievement.soundVolume': Math.round($event) })")

dd
  h3#achievement_appearance {{ $t('setting__achievement_appearance') }}
  div
    .gap-top
      span {{ $t('setting__achievement_font_size', { num: appSetting['achievement.fontSize'] }) }}
      base-slider-bar(
        :class="$style.slider"
        :value="appSetting['achievement.fontSize']"
        :min="10"
        :max="24"
        @change="updateSetting({ 'achievement.fontSize': Math.round($event) })")
    .gap-top
      span {{ $t('setting__achievement_opacity', { num: appSetting['achievement.opacity'] }) }}
      base-slider-bar(
        :class="$style.slider"
        :value="appSetting['achievement.opacity']"
        :min="10"
        :max="100"
        @change="updateSetting({ 'achievement.opacity': Math.round($event) })")

dd
  h3#achievement_position {{ $t('setting__achievement_position') }}
  div
    .gap-top
      span {{ $t('setting__achievement_offset_y', { num: appSetting['achievement.offsetY'] }) }}
      base-slider-bar(
        :class="$style.slider"
        :value="appSetting['achievement.offsetY']"
        :min="0"
        :max="500"
        @change="updateSetting({ 'achievement.offsetY': Math.round($event) })")
    .gap-top
      span {{ $t('setting__achievement_offset_x', { num: appSetting['achievement.offsetX'] }) }}
      base-slider-bar(
        :class="$style.slider"
        :value="appSetting['achievement.offsetX']"
        :min="0"
        :max="500"
        @change="updateSetting({ 'achievement.offsetX': Math.round($event) })")

dd
  h3#achievement_behavior {{ $t('setting__achievement_behavior') }}
  div
    .gap-top
      span {{ $t('setting__achievement_duration', { num: appSetting['achievement.duration'] }) }}
      base-slider-bar(
        :class="$style.slider"
        :value="appSetting['achievement.duration']"
        :min="2000"
        :max="15000"
        @change="updateSetting({ 'achievement.duration': Math.round($event) })")
    .gap-top
      span {{ $t('setting__achievement_max_visible', { num: appSetting['achievement.maxVisible'] }) }}
      base-slider-bar(
        :class="$style.slider"
        :value="appSetting['achievement.maxVisible']"
        :min="1"
        :max="10"
        @change="updateSetting({ 'achievement.maxVisible': Math.round($event) })")
</template>

<script>
import { ref, computed } from '@common/utils/vueTools'
import { appSetting, updateSetting } from '@renderer/store/setting'
import { useI18n } from '@renderer/plugins/i18n'
import { getSystemFonts } from '@renderer/utils/ipc'

export default {
  name: 'SettingAchievement',
  setup() {
    const t = useI18n()

    const systemFontList = ref([])
    const fontList = computed(() => {
      return [{ id: '', label: t('setting__achievement_font_default') }, ...systemFontList.value]
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

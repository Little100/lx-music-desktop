<template>
  <material-modal :show="visible" bg-close teleport="#view" max-width="600px" @close="handleClose">
    <div :class="$style.main">
      <h2 :class="$style.title">{{ $t('lists__scan_failed_title') }}</h2>
      <div v-if="isScanning" :class="$style.progress">
        <p>{{ $t('lists__scan_failed_scanning', { current: scanProgress.current, total: scanProgress.total }) }}</p>
        <div :class="$style.progressBar">
          <div :class="$style.progressFill" :style="{ width: progressPercent + '%' }" />
        </div>
      </div>
      <template v-else>
        <div v-if="noLocal" :class="$style.empty">
          <p>{{ $t('lists__scan_failed_no_local') }}</p>
        </div>
        <div v-else-if="!scanResults.length && scanProgress.total > 0" :class="$style.empty">
          <p>{{ $t('lists__scan_failed_all_ok') }}</p>
        </div>
        <template v-else-if="scanResults.length">
          <p :class="$style.summary">{{ $t('lists__scan_failed_result', { success: scanProgress.total - scanResults.length, fail: scanResults.length }) }}</p>
          <ul :class="$style.list" class="scroll">
            <li v-for="item in scanResults" :key="item.id" :class="$style.listItem">
              <div :class="$style.info">
                <span :class="$style.name">{{ item.name }}</span>
                <span :class="$style.singer">{{ item.singer }}</span>
              </div>
              <span :class="$style.reason">{{ $t('lists__scan_failed_file_missing') }}</span>
            </li>
          </ul>
          <base-btn :class="$style.removeBtn" @click="handleRemoveAll">{{ $t('lists__scan_failed_remove_all') }}</base-btn>
        </template>
      </template>
    </div>
  </material-modal>
</template>

<script>
import { computed } from '@common/utils/vueTools'

export default {
  props: {
    visible: { type: Boolean, default: false },
    isScanning: { type: Boolean, default: false },
    scanProgress: { type: Object, default: () => ({ current: 0, total: 0 }) },
    scanResults: { type: Array, default: () => [] },
  },
  emits: ['update:visible', 'remove-all'],
  setup(props, { emit }) {
    const progressPercent = computed(() => {
      if (!props.scanProgress.total) return 0
      return Math.round((props.scanProgress.current / props.scanProgress.total) * 100)
    })
    const noLocal = computed(() => !props.isScanning && props.scanProgress.total === 0 && !props.scanResults.length)

    const handleClose = () => { emit('update:visible', false) }
    const handleRemoveAll = () => { emit('remove-all') }

    return { progressPercent, noLocal, handleClose, handleRemoveAll }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.main {
  padding: 20px 15px;
  display: flex;
  flex-flow: column nowrap;
  min-height: 0;
}
.title {
  font-size: 16px;
  color: var(--color-font);
  text-align: center;
  margin-bottom: 15px;
}
.progress {
  text-align: center;
  p { font-size: 14px; color: var(--color-font-label); }
}
.progressBar {
  margin-top: 10px;
  height: 6px;
  background: var(--color-primary-background-hover);
  border-radius: 3px;
  overflow: hidden;
}
.progressFill {
  height: 100%;
  background: var(--color-primary);
  transition: width 0.2s ease;
  border-radius: 3px;
}
.empty {
  text-align: center;
  padding: 30px 0;
  font-size: 14px;
  color: var(--color-font-label);
}
.summary {
  font-size: 14px;
  color: var(--color-font);
  margin-bottom: 10px;
}
.list {
  max-height: 300px;
  margin-bottom: 15px;
}
.listItem {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: @radius-border;
  + .listItem { border-top: 1px solid var(--color-primary-background-hover); }
}
.info {
  flex: auto;
  min-width: 0;
  .name {
    font-size: 14px;
    color: var(--color-font);
    .mixin-ellipsis-1();
  }
  .singer {
    font-size: 12px;
    color: var(--color-font-label);
    margin-left: 8px;
  }
}
.reason {
  flex: none;
  font-size: 12px;
  color: var(--color-error, #e53935);
  margin-left: 10px;
}
.removeBtn {
  width: 100%;
  height: 36px;
}
</style>

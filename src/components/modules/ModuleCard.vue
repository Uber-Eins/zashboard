<template>
  <article class="scroller-item px-4 py-3">
    <div class="flex items-start gap-3">
      <slot name="drag-handle" />

      <div class="min-w-0 flex-1">
        <div class="flex min-w-0 flex-wrap items-center gap-2">
          <span class="truncate text-sm font-medium">{{ item.name }}</span>
          <span class="badge badge-ghost badge-sm text-[10px] tracking-wider uppercase">
            {{ item.type }}
          </span>
        </div>

        <dl class="mt-2 grid min-w-0 gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2">
          <div
            v-if="item.url"
            class="min-w-0"
          >
            <dt class="text-base-content/45">{{ $t('moduleURL') }}</dt>
            <dd
              class="mt-0.5 font-mono text-[11px] break-all"
              :title="item.url"
            >
              {{ item.url }}
            </dd>
          </div>
          <div class="min-w-0">
            <dt class="text-base-content/45">{{ $t('modulePath') }}</dt>
            <dd
              class="mt-0.5 font-mono text-[11px] break-all"
              :title="item.path"
            >
              {{ item.path }}
            </dd>
          </div>
          <div v-if="item.type === 'http'">
            <dt class="text-base-content/45">{{ $t('moduleUpdateInterval') }}</dt>
            <dd class="mt-0.5 tabular-nums">{{ formattedInterval }}</dd>
          </div>
          <div>
            <dt class="text-base-content/45">{{ $t('updated') }}</dt>
            <dd class="mt-0.5">{{ updatedAt }}</dd>
          </div>
        </dl>
      </div>

      <label
        class="flex shrink-0 items-center gap-2 pt-0.5"
        :class="disabled ? 'cursor-not-allowed' : 'cursor-pointer'"
      >
        <span
          class="hidden text-xs sm:inline"
          :class="targetEnabled ? 'text-success' : 'text-base-content/45'"
        >
          {{ $t(targetEnabled ? 'activeLabel' : 'disabledLabel') }}
        </span>
        <span class="relative flex h-5 items-center">
          <input
            v-model="targetEnabled"
            type="checkbox"
            class="toggle toggle-sm"
            :aria-label="$t(targetEnabled ? 'disableModule' : 'enableModule', { name: item.name })"
            :disabled="isUpdating || disabled"
            @change="toggleModule"
          />
          <span
            v-if="isUpdating"
            class="loading loading-spinner loading-xs absolute -left-5"
            aria-hidden="true"
          />
        </span>
      </label>
    </div>
  </article>
</template>

<script setup lang="ts">
import { setModuleEnabled } from '@/assembly/modules'
import { fromNow } from '@/helper/utils'
import type { Module } from '@/types'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(
  defineProps<{
    disabled?: boolean
    item: Module
  }>(),
  {
    disabled: false,
  },
)

const { t } = useI18n()
const isUpdating = ref(false)
const targetEnabled = ref(props.item.enable)

watch(
  () => props.item.enable,
  (enable) => (targetEnabled.value = enable),
)

const formattedInterval = computed(() => {
  const seconds = props.item.interval
  if (seconds <= 0) return t('autoCleanupIntervalNever')
  if (seconds % 86400 === 0) return `${seconds / 86400}d`
  if (seconds % 3600 === 0) return `${seconds / 3600}h`
  if (seconds % 60 === 0) return `${seconds / 60}m`
  return `${seconds}s`
})

const updatedAt = computed(() =>
  props.item.updatedAt ? fromNow(props.item.updatedAt) : t('moduleNeverUpdated'),
)

const toggleModule = async () => {
  if (isUpdating.value) return

  const enable = targetEnabled.value
  isUpdating.value = true
  try {
    await setModuleEnabled(props.item.name, enable)
  } catch {
    targetEnabled.value = props.item.enable
  } finally {
    isUpdating.value = false
  }
}
</script>

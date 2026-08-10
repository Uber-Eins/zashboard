<template>
  <div
    class="scroller-item hover:bg-base-200/40 flex h-16 flex-col gap-2 overflow-hidden px-3 py-2 text-sm transition-colors"
    :class="connectionReference && 'cursor-pointer'"
    @click="connectionReference && emits('connectionClick', connectionReference)"
  >
    <div class="flex shrink-0 items-center gap-2">
      <span
        class="text-base-content/40 text-xs tabular-nums"
        :style="{ minWidth: `${(seqWithPadding.length + 1) * 0.62}em` }"
      >
        {{ seqWithPadding }}
      </span>
      <span
        class="text-[11px] tracking-wide uppercase"
        :class="colorMapForType[log.type as keyof typeof colorMapForType]"
      >
        <HighlightText
          :text="log.type"
          :filter="logFilter"
        />
      </span>
      <div class="flex-1"></div>
      <span class="text-base-content/40 text-xs tabular-nums">
        <HighlightText
          :text="log.time"
          :filter="logFilter"
        />
      </span>
    </div>
    <div
      class="w-full min-w-0 truncate leading-relaxed"
      :title="plainPayload"
    >
      <HighlightText
        :text="log.payload"
        :filter="logFilter"
        ansi
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { can } from '@/assembly/backend'
import {
  getLogConnectionID,
  getMihomoLogConnectionReference,
  type LogConnectionReference,
} from '@/assembly/connections'
import HighlightText from '@/components/common/HighlightText.vue'
import { useBounceOnVisible } from '@/composables/bouncein'
import { LOG_LEVEL } from '@/constant'
import { stripAnsi } from '@/helper/ansi'
import { logFilter } from '@/store/logs'
import type { LogWithSeq } from '@/types'
import { computed } from 'vue'

const props = defineProps<{ log: LogWithSeq }>()

const emits = defineEmits<{
  (e: 'connectionClick', reference: LogConnectionReference): void
}>()

const plainPayload = computed(() => stripAnsi(props.log.payload))

const connectionReference = computed(() => {
  if (can('logConnectionDetail')) {
    const id = getLogConnectionID(props.log.payload)
    if (id) return { id }
  }

  if (can('mitm')) {
    return getMihomoLogConnectionReference(props.log.payload)
  }

  return null
})

const seqWithPadding = computed(() => {
  return props.log.seq.toString().padStart(2, '0')
})

const colorMapForType = {
  [LOG_LEVEL.Trace]: 'text-success',
  [LOG_LEVEL.Debug]: 'text-accent',
  [LOG_LEVEL.Info]: 'text-info',
  [LOG_LEVEL.Warning]: 'text-warning',
  [LOG_LEVEL.Error]: 'text-error',
  [LOG_LEVEL.Fatal]: 'text-error',
  [LOG_LEVEL.Panic]: 'text-error',
}

useBounceOnVisible()
</script>

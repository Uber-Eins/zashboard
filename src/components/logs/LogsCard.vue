<template>
  <div
    class="scroller-item hover:bg-base-200/40 flex h-16 flex-col gap-2 overflow-hidden px-3 py-2 text-sm transition-colors"
    :class="clickable && 'cursor-pointer'"
    @click="handleClick"
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
      <div
        v-if="
          transactionStatus &&
          (transactionStatus.active || transactionStatus.modified || transactionStatus.failed)
        "
        class="flex min-w-0 items-center gap-1 overflow-hidden"
      >
        <span
          v-if="transactionStatus.active"
          class="bg-info/10 text-info inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] leading-none font-medium"
        >
          <span class="bg-info size-1.5 rounded-full"></span>
          {{ $t('logActive') }}
        </span>
        <span
          v-if="transactionStatus.modified"
          class="bg-warning/10 text-warning inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] leading-none font-medium"
        >
          <span class="bg-warning size-1.5 rounded-full"></span>
          {{ $t('logModified') }}
        </span>
        <span
          v-if="transactionStatus.failed"
          class="bg-error/10 text-error inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] leading-none font-medium"
        >
          <span class="bg-error size-1.5 rounded-full"></span>
          {{ $t('logFailed') }}
        </span>
      </div>
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
      :title="payloadTitle"
    >
      <HighlightText
        :text="displayPayload || log.payload"
        :filter="logFilter"
        :ansi="!displayPayload"
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
import type { LogTransactionStatus, LogWithSeq } from '@/types'
import { computed } from 'vue'

const props = defineProps<{
  log: LogWithSeq
  transactionStatus?: LogTransactionStatus
  transactionId?: string
  displayPayload?: string
  displayTitle?: string
}>()

const emits = defineEmits<{
  (e: 'connectionClick', reference: LogConnectionReference): void
  (e: 'transactionClick', transactionId: string): void
}>()

const plainPayload = computed(() => stripAnsi(props.log.payload))
const payloadTitle = computed(() =>
  [props.displayTitle, plainPayload.value].filter(Boolean).join('\n'),
)

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

const clickable = computed(() => !!props.transactionId || !!connectionReference.value)

const handleClick = () => {
  if (props.transactionId) {
    emits('transactionClick', props.transactionId)
    return
  }

  if (connectionReference.value) {
    emits('connectionClick', connectionReference.value)
  }
}

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

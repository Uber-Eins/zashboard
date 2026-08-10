<template>
  <div class="relative size-full overflow-x-hidden">
    <VirtualScroller
      :data="renderLogs"
      :size="65"
      content-class="[&>div]:h-[65px] [&>div]:overflow-hidden"
    >
      <template v-slot:before>
        <LogsCtrl />
      </template>
      <template v-slot="{ item }: { item: LogWithSeq }">
        <LogsCard
          :log="item"
          @connection-click="handlerConnectionClick"
        />
      </template>
    </VirtualScroller>
    <ConnectionDetails />
  </div>
</template>

<script setup lang="ts">
import { resolveLogConnection, type LogConnectionReference } from '@/assembly/connections'
import VirtualScroller from '@/components/common/VirtualScroller.vue'
import ConnectionDetails from '@/components/connections/ConnectionDetails.vue'
import LogsCtrl from '@/components/controls/LogsCtrl.tsx'
import LogsCard from '@/components/logs/LogsCard.vue'
import { useConnections } from '@/composables/connections'
import { toSearchRegex } from '@/helper/search'
import { logFilter, logFilterEnabled, logFilterRegex, logTypeFilter, logs } from '@/store/logs'
import { activeConnections, closedConnections } from '@/store/connections'
import type { LogWithSeq } from '@/types'
import { computed } from 'vue'

const { handlerInfo } = useConnections()

const renderLogs = computed(() => {
  let renderLogs = logs.value
  const searchRegex = toSearchRegex(logFilter.value)

  if (logFilter.value || logTypeFilter.value) {
    renderLogs = logs.value.filter((log) => {
      if (searchRegex && !searchRegex.testAny([log.payload, log.time, log.type])) {
        return false
      }

      if (
        logTypeFilter.value &&
        !(log.payload.includes(logTypeFilter.value) || log.type === logTypeFilter.value)
      ) {
        return false
      }

      return true
    })
  }

  if (logFilterEnabled.value && logFilterRegex.value) {
    const hideRegex = toSearchRegex(logFilterRegex.value)

    if (hideRegex) {
      renderLogs = renderLogs.filter((log) => {
        return !hideRegex.testAny([log.payload, log.time, log.type])
      })
    }
  }

  return renderLogs
})

const handlerConnectionClick = async (reference: LogConnectionReference) => {
  const active = [...activeConnections.value].reverse()
  const closed = [...closedConnections.value].reverse()
  const candidates = active.concat(closed)
  const connection = resolveLogConnection(candidates, reference)
  if (!connection) return
  const mitmRequest =
    'url' in reference && reference.url
      ? { url: reference.url, source: reference.source }
      : undefined

  await handlerInfo(connection, { mitmRequest })
}
</script>

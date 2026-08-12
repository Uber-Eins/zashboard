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
          :transaction-status="getLogTransactionStatus(item)"
          :transaction-id="getLogTransactionSession(item)?.transactionId"
          :display-payload="getLogTransactionURL(item)"
          :display-title="getLogTransactionURL(item)"
          @connection-click="handlerConnectionClick"
          @transaction-click="handlerTransactionClick"
        />
      </template>
    </VirtualScroller>
    <ConnectionDetails />
  </div>
</template>

<script setup lang="ts">
import { can } from '@/assembly/backend'
import {
  resolveLogConnection,
  subscribeMitmSessionsAPI,
  type LogConnectionReference,
  type MitmSession,
} from '@/assembly/connections'
import VirtualScroller from '@/components/common/VirtualScroller.vue'
import ConnectionDetails from '@/components/connections/ConnectionDetails.vue'
import LogsCtrl from '@/components/controls/LogsCtrl.tsx'
import LogsCard from '@/components/logs/LogsCard.vue'
import { useConnections } from '@/composables/connections'
import { toSearchRegex } from '@/helper/search'
import {
  logFilter,
  logFilterEnabled,
  logFilterRegex,
  logs,
  logTransactionStatusAvailable,
  logTransactionStatusFilter,
  logTypeFilter,
} from '@/store/logs'
import { activeConnections, closedConnections } from '@/store/connections'
import { activeUuid } from '@/store/setup'
import type { LogTransactionStatus, LogWithSeq } from '@/types'
import { computed, onBeforeUnmount, shallowRef, watch } from 'vue'

const { handlerInfo } = useConnections()

const mitmSessions = shallowRef<MitmSession[]>([])
const mitmSupported = computed(() => can('mitm'))
let mitmStreamGeneration = 0
let closeMitmStream: (() => void) | undefined

const resetMitmStream = () => {
  mitmStreamGeneration++
  closeMitmStream?.()
  closeMitmStream = undefined
  mitmSessions.value = []
  logTransactionStatusAvailable.value = false
  logTransactionStatusFilter.value = ''
}

const startMitmStream = async () => {
  resetMitmStream()
  if (!activeUuid.value || !mitmSupported.value) return

  const generation = mitmStreamGeneration
  const stream = await subscribeMitmSessionsAPI()

  if (generation !== mitmStreamGeneration) {
    stream?.close()
    return
  }
  if (!stream) return

  const unwatch = watch(
    stream.sessions,
    (sessions) => {
      mitmSessions.value = sessions
      if (
        !logTransactionStatusAvailable.value &&
        sessions.some(
          (session) =>
            !!session.transactionId &&
            (session.state !== undefined || typeof session.modified === 'boolean'),
        )
      ) {
        logTransactionStatusAvailable.value = true
      }
    },
    { immediate: true },
  )

  closeMitmStream = () => {
    unwatch()
    stream.close()
  }
}

const stopMitmSupportWatch = watch([activeUuid, mitmSupported], startMitmStream, {
  immediate: true,
})

const transactionStatusById = computed(() => {
  const statuses = new Map<string, LogTransactionStatus>()

  for (const session of mitmSessions.value) {
    if (!session.transactionId) continue

    statuses.set(session.transactionId, {
      active: session.state === 'active',
      modified: session.modified === true,
      failed: session.state === 'failed',
    })
  }

  return statuses
})

const transactionSessionById = computed(() => {
  const sessions = new Map<string, MitmSession>()

  for (const session of mitmSessions.value) {
    if (session.transactionId) sessions.set(session.transactionId, session)
  }

  return sessions
})

const getLogTransactionSession = (log: LogWithSeq) =>
  log.transactionId ? transactionSessionById.value.get(log.transactionId) : undefined

const getSessionOriginalURL = (session: MitmSession) =>
  session.request.raw_url || session.request.url

const getLogTransactionURL = (log: LogWithSeq) => {
  const session = getLogTransactionSession(log)
  return session ? getSessionOriginalURL(session) : undefined
}

const getLogTransactionStatus = (log: LogWithSeq) =>
  log.transactionId ? transactionStatusById.value.get(log.transactionId) : undefined

const renderLogs = computed(() => {
  let renderLogs = logs.value
  const searchRegex = toSearchRegex(logFilter.value)

  if (logFilter.value || logTypeFilter.value || logTransactionStatusFilter.value) {
    renderLogs = logs.value.filter((log) => {
      if (
        searchRegex &&
        !searchRegex.testAny([log.payload, log.time, log.type, getLogTransactionURL(log) ?? ''])
      ) {
        return false
      }

      if (
        logTypeFilter.value &&
        !(log.payload.includes(logTypeFilter.value) || log.type === logTypeFilter.value)
      ) {
        return false
      }

      const statusFilter = logTransactionStatusFilter.value
      if (statusFilter && !getLogTransactionStatus(log)?.[statusFilter]) {
        return false
      }

      return true
    })
  }

  if (logFilterEnabled.value && logFilterRegex.value) {
    const hideRegex = toSearchRegex(logFilterRegex.value)

    if (hideRegex) {
      renderLogs = renderLogs.filter((log) => {
        return !hideRegex.testAny([
          log.payload,
          log.time,
          log.type,
          getLogTransactionURL(log) ?? '',
        ])
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

const handlerTransactionClick = async (transactionId: string) => {
  const session = transactionSessionById.value.get(transactionId)
  if (!session) return

  const active = [...activeConnections.value].reverse()
  const closed = [...closedConnections.value].reverse()
  const candidates = active.concat(closed)
  const linkedConnection = session.id
    ? candidates.find((connection) => connection.id === session.id)
    : undefined
  const requestURL = getSessionOriginalURL(session)
  const fallbackReference: LogConnectionReference = {
    source: session.source ?? '',
    destination: requestURL,
    network: 'tcp',
    url: requestURL,
    chains: [],
  }
  const connection = linkedConnection ?? resolveLogConnection(candidates, fallbackReference)
  if (!connection) return

  await handlerInfo(connection, { mitmRequest: { transactionId } })
}

onBeforeUnmount(() => {
  stopMitmSupportWatch()
  resetMitmStream()
})
</script>

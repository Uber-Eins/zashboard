// Clash WS 后端的日志订阅。兼容旧版 { type, payload } 与 mihomo structured 格式，
// 将后者的 time / fields / transactionId 一并归一化后逐条产出。
import { createClashWebSocket } from '@/api/clash'
import { LOG_LEVEL } from '@/constant'
import type { Log, LogField } from '@/types'
import { watch } from 'vue'
import type { LogsSubscription } from './types'

const normalizeLogLevel = (value: unknown): LOG_LEVEL => {
  if (value === 'warn') return LOG_LEVEL.Warning

  return Object.values(LOG_LEVEL).includes(value as LOG_LEVEL)
    ? (value as LOG_LEVEL)
    : LOG_LEVEL.Info
}

const normalizeFields = (value: unknown): LogField[] | undefined => {
  if (!Array.isArray(value)) return undefined

  const fields = value.flatMap((field) => {
    if (!field || typeof field !== 'object') return []

    const { key, value } = field as Record<string, unknown>
    return typeof key === 'string' && typeof value === 'string' ? [{ key, value }] : []
  })

  return fields.length ? fields : undefined
}

const normalizeLog = (data: unknown): Log | null => {
  if (!data || typeof data !== 'object') return null

  const record = data as Record<string, unknown>
  const payload =
    typeof record.message === 'string'
      ? record.message
      : typeof record.payload === 'string'
        ? record.payload
        : null

  if (payload === null) return null

  const fields = normalizeFields(record.fields)
  const transactionId = fields?.find((field) => field.key === 'transactionId')?.value

  return {
    type: normalizeLogLevel(record.level ?? record.type),
    payload,
    time: typeof record.time === 'string' ? record.time : undefined,
    fields,
    transactionId,
  }
}

export const subscribeLogs = (
  params: Record<string, string>,
  onBatch: (batch: Log[]) => void,
): LogsSubscription => {
  const ws = createClashWebSocket<unknown>('logs', params)
  const stop = watch(ws.data, (data) => {
    const log = normalizeLog(data)
    if (log) onBatch([log])
  })

  return {
    close: () => {
      stop()
      ws.close()
    },
  }
}

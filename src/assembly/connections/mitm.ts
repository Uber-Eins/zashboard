import {
  fetchMitmSnapshotAPI,
  getMitmCaptureStateAPI,
  setMitmCaptureStateAPI,
  subscribeMitmAPI,
  type MitmSession,
  type MitmSnapshot,
} from '@/api/clash'
import { can } from '@/assembly/backend'
import { shallowRef, watch } from 'vue'
import { normalizeConnectionEndpoint } from './endpoint'

export type { MitmBody, MitmHeaders, MitmRequest, MitmResponse, MitmSession } from '@/api/clash'

export const fetchMitmCaptureAPI = () =>
  can('mitm') ? getMitmCaptureStateAPI() : Promise.resolve(null)

export const updateMitmCaptureAPI = (capture: boolean) => {
  if (!can('mitm')) return Promise.reject(new Error('MITM capture is unsupported'))
  return setMitmCaptureStateAPI(capture)
}

export type MitmSessionReference = { transactionId: string } | { url: string; source?: string }

export const matchesMitmSessionReference = (
  session: MitmSession,
  reference: MitmSessionReference,
) => {
  if ('transactionId' in reference) {
    return session.transactionId === reference.transactionId
  }

  return (
    (session.request.url === reference.url || session.request.raw_url === reference.url) &&
    (!reference.source ||
      normalizeConnectionEndpoint(session.source ?? '') ===
        normalizeConnectionEndpoint(reference.source))
  )
}

const mergeSession = (previous: MitmSession | undefined, next: MitmSession): MitmSession => {
  if (!previous) return next

  return {
    ...previous,
    ...next,
    request: {
      ...previous.request,
      ...next.request,
    },
    response: next.response
      ? {
          ...previous.response,
          ...next.response,
        }
      : previous.response,
  }
}

export const subscribeMitmSessionsAPI = async () => {
  if (!can('mitm')) return null

  const initialSnapshot = await fetchMitmSnapshotAPI()
  if (!initialSnapshot) return null

  const sessions = shallowRef<MitmSession[]>([])
  let sessionMap = new Map<number, MitmSession>()

  const publish = () => {
    sessions.value = Array.from(sessionMap.values()).sort(
      (left, right) => left.requestIndex - right.requestIndex,
    )
  }

  const replaceSnapshot = (snapshot: Pick<MitmSnapshot, 'sessions'>) => {
    sessionMap = new Map(
      snapshot.sessions.map((session) => [session.requestIndex, session] as const),
    )
    publish()
  }

  replaceSnapshot(initialSnapshot)

  const ws = subscribeMitmAPI()
  const unwatch = watch(
    ws.data,
    (event) => {
      if (!event) return

      switch (event.type) {
        case 'snapshot':
          replaceSnapshot(event)
          break
        case 'session':
          sessionMap.set(
            event.session.requestIndex,
            mergeSession(sessionMap.get(event.session.requestIndex), event.session),
          )
          publish()
          break
        case 'remove':
          sessionMap.delete(event.requestIndex)
          publish()
          break
        case 'clear':
          sessionMap.clear()
          publish()
          break
      }
    },
    // 增量消息必须逐条消费，不能被 Vue 的异步 watcher 批处理合并。
    { flush: 'sync' },
  )

  return {
    sessions,
    close: () => {
      unwatch()
      ws.close()
    },
  }
}

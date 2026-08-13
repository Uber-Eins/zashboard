// Surge-compatible script notification forwarding for the Clash channel.
// A silent REST probe keeps older cores from entering an endless WebSocket
// reconnect loop; the stream is restarted whenever the active backend changes.
import { fetchScriptNotificationSnapshotAPI, subscribeScriptNotificationsAPI } from '@/api/clash'
import { showScriptNotification } from '@/helper/notification'
import { activeBackend } from '@/store/setup'
import type { ScriptNotification } from '@/types'
import { watch, type WatchStopHandle } from 'vue'

const notificationKey = (notification: ScriptNotification) =>
  `${notification.id}:${notification.time}`

export const startScriptNotificationForwarding = () =>
  watch(
    activeBackend,
    async (backend, _previousBackend, onCleanup) => {
      let disposed = false
      const resources: {
        closeStream?: () => void
        stopStreamWatch?: WatchStopHandle
      } = {}
      onCleanup(() => {
        disposed = true
        resources.stopStreamWatch?.()
        resources.closeStream?.()
      })

      if (!backend || backend.type !== 'clash') return

      const snapshot = await fetchScriptNotificationSnapshotAPI()
      if (disposed || activeBackend.value?.uuid !== backend.uuid || !snapshot) return

      const seen = new Set(snapshot.notifications.map(notificationKey))
      const seenOrder = [...seen]
      const forward = (notification: ScriptNotification) => {
        const key = notificationKey(notification)
        if (seen.has(key)) return
        seen.add(key)
        seenOrder.push(key)
        if (seenOrder.length > 256) {
          seen.delete(seenOrder.shift()!)
        }
        showScriptNotification(notification)
      }

      const stream = subscribeScriptNotificationsAPI()
      resources.closeStream = stream.close
      resources.stopStreamWatch = watch(stream.data, (event) => {
        if (!event) return
        if (event.type === 'snapshot') {
          event.notifications.forEach(forward)
        } else if (event.type === 'notification') {
          forward(event.notification)
        }
      })
    },
    { immediate: true },
  )

import type { MitmSessionReference } from '@/assembly/connections'
import type { Connection } from '@/types'
import { nextTick, ref } from 'vue'

const infoConn = ref<Connection | null>(null)
const connectionDetailModalShow = ref(false)
const connectionDetailMitmRequest = ref<MitmSessionReference | null>(null)

export const useConnections = () => {
  const handlerInfo = async (
    conn: Connection,
    options?: { mitmRequest?: MitmSessionReference },
  ) => {
    infoConn.value = null
    connectionDetailMitmRequest.value = options?.mitmRequest ?? null
    await nextTick()
    infoConn.value = conn
    connectionDetailModalShow.value = true
  }

  return {
    infoConn,
    connectionDetailModalShow,
    connectionDetailMitmRequest,
    handlerInfo,
  }
}

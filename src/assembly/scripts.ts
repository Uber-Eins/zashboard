// 组装层 · fork mihomo 脚本管理门面。
// /scripts 是 fork 扩展，以端点响应探测能力，并持有列表、搜索与启停后的单项刷新状态。
import { fetchScriptAPI, fetchScriptsAPI, patchScriptAPI, probeScriptsAPI } from '@/api/clash'
import { toSearchRegex } from '@/helper/search'
import { activeBackend } from '@/store/setup'
import type { Script, ScriptInfo } from '@/types'
import { computed, ref, watch } from 'vue'

export type ScriptAvailability = 'unknown' | 'checking' | 'available' | 'unavailable'

export const scripts = ref<Script[]>([])
export const scriptsFilter = ref('')
export const scriptAvailability = ref<ScriptAvailability>('unknown')
export const isScriptsLoading = ref(false)

export const scriptsAvailable = computed(() => scriptAvailability.value === 'available')

export const renderScripts = computed(() => {
  const searchRegex = toSearchRegex(scriptsFilter.value)

  if (!searchRegex) return scripts.value

  return scripts.value.filter((script) =>
    searchRegex.testAny([script.name, script.type, script.path, script.url || '']),
  )
})

const normalizeScripts = (
  response: { scripts?: Record<string, ScriptInfo> } | undefined,
): Script[] | null => {
  if (!response?.scripts || typeof response.scripts !== 'object') return null

  return Object.entries(response.scripts).map(([name, script]) => ({ name, ...script }))
}

const resetScripts = () => {
  scripts.value = []
  scriptAvailability.value = 'unknown'
  isScriptsLoading.value = false
}

let activeProbe: Promise<boolean> | undefined
let activeProbeBackend = ''

export const probeScripts = (): Promise<boolean> => {
  const backend = activeBackend.value

  if (!backend || backend.type !== 'clash') {
    scriptAvailability.value = 'unavailable'
    return Promise.resolve(false)
  }

  if (scriptAvailability.value === 'available') return Promise.resolve(true)
  if (activeProbe && activeProbeBackend === backend.uuid) return activeProbe

  const backendUuid = backend.uuid
  activeProbeBackend = backendUuid
  scriptAvailability.value = 'checking'

  activeProbe = probeScriptsAPI()
    .then((response) => {
      if (activeBackend.value?.uuid !== backendUuid) return false

      const nextScripts = response.status === 200 ? normalizeScripts(response.data) : null
      if (!nextScripts) {
        scriptAvailability.value = 'unavailable'
        return false
      }

      scripts.value = nextScripts
      scriptAvailability.value = 'available'
      return true
    })
    .catch(() => {
      if (activeBackend.value?.uuid === backendUuid) {
        scriptAvailability.value = 'unavailable'
      }
      return false
    })
    .finally(() => {
      if (activeProbeBackend === backendUuid) activeProbe = undefined
    })

  return activeProbe
}

export const fetchScripts = async () => {
  const backendUuid = activeBackend.value?.uuid
  if (!backendUuid) return

  isScriptsLoading.value = true
  try {
    const { data } = await fetchScriptsAPI()
    if (activeBackend.value?.uuid !== backendUuid) return

    const nextScripts = normalizeScripts(data)
    if (!nextScripts) return

    scripts.value = nextScripts
    scriptAvailability.value = 'available'
  } finally {
    if (activeBackend.value?.uuid === backendUuid) isScriptsLoading.value = false
  }
}

export const setScriptEnabled = async (name: string, enable: boolean) => {
  const backendUuid = activeBackend.value?.uuid
  if (!backendUuid) return

  await patchScriptAPI(name, enable)
  const { data } = await fetchScriptAPI(name)
  if (activeBackend.value?.uuid !== backendUuid) return

  const index = scripts.value.findIndex((script) => script.name === name)
  const updatedScript = { name, ...data }
  if (index === -1) {
    scripts.value = [...scripts.value, updatedScript]
  } else {
    scripts.value.splice(index, 1, updatedScript)
  }
}

watch(
  activeBackend,
  (backend) => {
    resetScripts()
    if (backend) void probeScripts()
  },
  { immediate: true },
)

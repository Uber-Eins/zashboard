// 组装层 · fork mihomo 配置模块门面。
// /modules 是 fork 扩展，不能依赖版本字符串判断；这里以端点响应自证能力，
// 同时持有列表、搜索与启停后的单项刷新状态。
import { fetchModuleAPI, fetchModulesAPI, patchModuleAPI, probeModulesAPI } from '@/api/clash'
import { toSearchRegex } from '@/helper/search'
import { activeBackend } from '@/store/setup'
import type { Module, ModuleInfo } from '@/types'
import { computed, ref, watch } from 'vue'

export type ModuleAvailability = 'unknown' | 'checking' | 'available' | 'unavailable'

export const modules = ref<Module[]>([])
export const modulesFilter = ref('')
export const moduleAvailability = ref<ModuleAvailability>('unknown')
export const isModulesLoading = ref(false)

export const modulesAvailable = computed(() => moduleAvailability.value === 'available')

export const renderModules = computed(() => {
  const searchRegex = toSearchRegex(modulesFilter.value)

  if (!searchRegex) return modules.value

  return modules.value.filter((module) =>
    searchRegex.testAny([module.name, module.type, module.path, module.url || '']),
  )
})

const normalizeModules = (
  response: { modules?: Record<string, ModuleInfo> } | undefined,
): Module[] | null => {
  if (!response?.modules || typeof response.modules !== 'object') return null

  return Object.entries(response.modules).map(([name, module]) => ({ name, ...module }))
}

const resetModules = () => {
  modules.value = []
  moduleAvailability.value = 'unknown'
  isModulesLoading.value = false
}

let activeProbe: Promise<boolean> | undefined
let activeProbeBackend = ''

export const probeModules = (): Promise<boolean> => {
  const backend = activeBackend.value

  if (!backend || backend.type !== 'clash') {
    moduleAvailability.value = 'unavailable'
    return Promise.resolve(false)
  }

  if (moduleAvailability.value === 'available') return Promise.resolve(true)
  if (activeProbe && activeProbeBackend === backend.uuid) return activeProbe

  const backendUuid = backend.uuid
  activeProbeBackend = backendUuid
  moduleAvailability.value = 'checking'

  activeProbe = probeModulesAPI()
    .then((response) => {
      if (activeBackend.value?.uuid !== backendUuid) return false

      const nextModules = response.status === 200 ? normalizeModules(response.data) : null
      if (!nextModules) {
        moduleAvailability.value = 'unavailable'
        return false
      }

      modules.value = nextModules
      moduleAvailability.value = 'available'
      return true
    })
    .catch(() => {
      if (activeBackend.value?.uuid === backendUuid) {
        moduleAvailability.value = 'unavailable'
      }
      return false
    })
    .finally(() => {
      if (activeProbeBackend === backendUuid) activeProbe = undefined
    })

  return activeProbe
}

export const fetchModules = async () => {
  const backendUuid = activeBackend.value?.uuid
  if (!backendUuid) return

  isModulesLoading.value = true
  try {
    const { data } = await fetchModulesAPI()
    if (activeBackend.value?.uuid !== backendUuid) return

    const nextModules = normalizeModules(data)
    if (!nextModules) return

    modules.value = nextModules
    moduleAvailability.value = 'available'
  } finally {
    if (activeBackend.value?.uuid === backendUuid) isModulesLoading.value = false
  }
}

export const setModuleEnabled = async (name: string, enable: boolean) => {
  const backendUuid = activeBackend.value?.uuid
  if (!backendUuid) return

  await patchModuleAPI(name, enable)
  const { data } = await fetchModuleAPI(name)
  if (activeBackend.value?.uuid !== backendUuid) return

  const index = modules.value.findIndex((module) => module.name === name)
  const updatedModule = { name, ...data }
  if (index === -1) {
    modules.value = [...modules.value, updatedModule]
  } else {
    modules.value.splice(index, 1, updatedModule)
  }
}

watch(
  activeBackend,
  (backend) => {
    resetModules()
    if (backend) void probeModules()
  },
  { immediate: true },
)

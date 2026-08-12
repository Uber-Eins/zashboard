import { can, type Cap } from '@/assembly/backend'
import { moduleAvailability, probeModules } from '@/assembly/modules'
import { probeScripts, scriptAvailability } from '@/assembly/scripts'
import { ROUTE_NAME } from '@/constant'
import { renderRoutes } from '@/helper'
import { i18n } from '@/i18n'
import { language } from '@/store/settings'
import { activeBackend } from '@/store/setup'
import ConnectionsPage from '@/views/ConnectionsPage.vue'
import HomePage from '@/views/HomePage.vue'
import LogsPage from '@/views/LogsPage.vue'
import ModulesPage from '@/views/ModulesPage.vue'
import OverviewPage from '@/views/OverviewPage.vue'
import ProxiesPage from '@/views/ProxiesPage.vue'
import RulesPage from '@/views/RulesPage.vue'
import ScriptsPage from '@/views/ScriptsPage.vue'
import SettingsPage from '@/views/SettingsPage.vue'
import SetupPage from '@/views/SetupPage.vue'
import { useTitle } from '@vueuse/core'
import { watch } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'

const childrenRouter = [
  {
    path: 'proxies',
    name: ROUTE_NAME.proxies,
    component: ProxiesPage,
  },
  {
    path: 'overview',
    name: ROUTE_NAME.overview,
    component: OverviewPage,
  },
  {
    path: 'connections',
    name: ROUTE_NAME.connections,
    component: ConnectionsPage,
  },
  {
    path: 'logs',
    name: ROUTE_NAME.logs,
    component: LogsPage,
  },
  {
    path: 'rules',
    name: ROUTE_NAME.rules,
    component: RulesPage,
  },
  {
    path: 'modules',
    name: ROUTE_NAME.modules,
    component: ModulesPage,
  },
  {
    path: 'scripts',
    name: ROUTE_NAME.scripts,
    component: ScriptsPage,
  },
  {
    path: 'tools',
    name: ROUTE_NAME.tools,
    component: () => import('@/views/ToolsPage.vue'),
  },
  {
    path: 'settings',
    name: ROUTE_NAME.settings,
    component: SettingsPage,
  },
]

// Routes that require a specific capability to be visitable.
const ROUTE_CAPABILITY: Partial<Record<string, Cap>> = {
  [ROUTE_NAME.rules]: 'rules',
  [ROUTE_NAME.tools]: 'tools',
}

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: ROUTE_NAME.proxies,
      component: HomePage,
      children: childrenRouter,
    },
    {
      path: '/setup',
      name: ROUTE_NAME.setup,
      component: SetupPage,
    },
    {
      path: '/:catchAll(.*)',
      redirect: ROUTE_NAME.proxies,
    },
  ],
})

const title = useTitle('zashboard')
const setTitleByName = (name: string | symbol | undefined) => {
  if (typeof name === 'string' && activeBackend.value) {
    const backend = activeBackend.value
    const prefix = backend.label || `${backend.host}:${backend.port}`
    title.value = `${prefix} | ${i18n.global.t(name)}`
  } else {
    title.value = 'zashboard'
  }
}

router.beforeEach(async (to, from) => {
  if (!activeBackend.value && to.name !== ROUTE_NAME.setup) {
    return { name: ROUTE_NAME.setup }
  }

  if (to.name === ROUTE_NAME.modules && !(await probeModules())) {
    return { name: ROUTE_NAME.proxies }
  }

  if (to.name === ROUTE_NAME.scripts && !(await probeScripts())) {
    return { name: ROUTE_NAME.proxies }
  }

  // Block navigation to a page the active backend's channels can't serve.
  const requiredCap = typeof to.name === 'string' ? ROUTE_CAPABILITY[to.name] : undefined
  if (requiredCap && !can(requiredCap)) {
    return { name: ROUTE_NAME.proxies }
  }

  const toIndex = renderRoutes.value.findIndex((item) => item === to.name)
  const fromIndex = renderRoutes.value.findIndex((item) => item === from.name)

  if (toIndex === 0 && fromIndex === renderRoutes.value.length - 1) {
    to.meta.transition = 'slide-left'
  } else if (toIndex === renderRoutes.value.length - 1 && fromIndex === 0) {
    to.meta.transition = 'slide-right'
  } else if (toIndex !== fromIndex) {
    to.meta.transition = toIndex < fromIndex ? 'slide-right' : 'slide-left'
  }
})

router.afterEach((to) => {
  setTitleByName(to.name)
})

watch([language, activeBackend], () => {
  setTimeout(() => {
    setTitleByName(router.currentRoute.value.name)
  })
})

// 能力变化(切后端 / 内核探测出结果)后,把停留在已失效页面的用户送回代理页。
watch([renderRoutes, moduleAvailability, scriptAvailability], () => {
  const routeName = router.currentRoute.value.name
  const requiredCap = typeof routeName === 'string' ? ROUTE_CAPABILITY[routeName] : undefined
  const modulesUnavailable =
    routeName === ROUTE_NAME.modules && moduleAvailability.value === 'unavailable'
  const scriptsUnavailable =
    routeName === ROUTE_NAME.scripts && scriptAvailability.value === 'unavailable'
  if ((requiredCap && !can(requiredCap)) || modulesUnavailable || scriptsUnavailable) {
    router.push({ name: ROUTE_NAME.proxies })
  }
})

export default router

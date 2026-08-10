<template>
  <div class="relative size-full overflow-x-hidden">
    <CtrlsBar>
      <div class="flex items-center gap-2 p-2">
        <TextInput
          v-model="modulesFilter"
          class="w-32 flex-1 sm:max-w-80"
          :placeholder="`${$t('search')} | Regex`"
          clearable
        />
        <span class="badge badge-ghost badge-sm tabular-nums">
          {{ renderModules.length }} / {{ modules.length }}
        </span>
        <button
          type="button"
          class="btn btn-circle btn-sm"
          :aria-label="$t('refresh')"
          :title="$t('refresh')"
          :disabled="isModulesLoading"
          @click="refreshModules"
        >
          <ArrowPathIcon
            class="h-4 w-4"
            :class="isModulesLoading && 'animate-spin'"
          />
        </button>
      </div>
    </CtrlsBar>

    <div
      class="p-3"
      :style="padding"
    >
      <div
        v-if="isModulesLoading && modules.length === 0"
        class="flex min-h-40 items-center justify-center"
      >
        <span class="loading loading-spinner loading-md" />
      </div>
      <div
        v-else-if="renderModules.length === 0"
        class="base-container text-base-content/50 flex min-h-40 items-center justify-center text-sm"
      >
        {{ $t('noData') }}
      </div>
      <div
        v-else
        class="base-container"
      >
        <ModuleCard
          v-for="item in renderModules"
          :key="item.name"
          :item="item"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  fetchModules,
  isModulesLoading,
  modules,
  modulesFilter,
  renderModules,
} from '@/assembly/modules'
import CtrlsBar from '@/components/common/CtrlsBar.vue'
import TextInput from '@/components/common/TextInput.vue'
import ModuleCard from '@/components/modules/ModuleCard.vue'
import { usePaddingForViews } from '@/composables/paddingViews'
import { ArrowPathIcon } from '@heroicons/vue/24/outline'

const { padding } = usePaddingForViews({
  offsetTop: 12,
  offsetBottom: 8,
})

const refreshModules = () => {
  if (!isModulesLoading.value) void fetchModules()
}
</script>

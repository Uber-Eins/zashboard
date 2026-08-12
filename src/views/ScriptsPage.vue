<template>
  <div class="relative size-full overflow-x-hidden">
    <CtrlsBar>
      <div class="flex items-center gap-2 p-2">
        <TextInput
          v-model="scriptsFilter"
          class="w-32 flex-1 sm:max-w-80"
          :placeholder="`${$t('search')} | Regex`"
          clearable
        />
        <span class="badge badge-ghost badge-sm tabular-nums">
          {{ renderScripts.length }} / {{ scripts.length }}
        </span>
        <button
          type="button"
          class="btn btn-circle btn-sm"
          :aria-label="$t('refresh')"
          :title="$t('refresh')"
          :disabled="isScriptsLoading"
          @click="refreshScripts"
        >
          <ArrowPathIcon
            class="h-4 w-4"
            :class="isScriptsLoading && 'animate-spin'"
          />
        </button>
      </div>
    </CtrlsBar>

    <div
      class="p-3"
      :style="padding"
    >
      <div
        v-if="isScriptsLoading && scripts.length === 0"
        class="flex min-h-40 items-center justify-center"
      >
        <span class="loading loading-spinner loading-md" />
      </div>
      <div
        v-else-if="renderScripts.length === 0"
        class="base-container text-base-content/50 flex min-h-40 items-center justify-center text-sm"
      >
        {{ $t('noData') }}
      </div>
      <div
        v-else
        class="base-container"
      >
        <ScriptCard
          v-for="item in renderScripts"
          :key="item.name"
          :item="item"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  fetchScripts,
  isScriptsLoading,
  renderScripts,
  scripts,
  scriptsFilter,
} from '@/assembly/scripts'
import CtrlsBar from '@/components/common/CtrlsBar.vue'
import TextInput from '@/components/common/TextInput.vue'
import ScriptCard from '@/components/scripts/ScriptCard.vue'
import { usePaddingForViews } from '@/composables/paddingViews'
import { ArrowPathIcon } from '@heroicons/vue/24/outline'

const { padding } = usePaddingForViews({
  offsetTop: 12,
  offsetBottom: 8,
})

const refreshScripts = () => {
  if (!isScriptsLoading.value) void fetchScripts()
}
</script>

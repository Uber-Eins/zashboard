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
          :aria-label="$t(isModuleOrderUpdating ? 'savingModuleOrder' : 'refresh')"
          :title="$t(isModuleOrderUpdating ? 'savingModuleOrder' : 'refresh')"
          :disabled="isModulesLoading || isModuleOrderUpdating"
          @click="refreshModules"
        >
          <span
            v-if="isModuleOrderUpdating"
            class="loading loading-spinner loading-xs"
            role="status"
          />
          <ArrowPathIcon
            v-else
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
      <Draggable
        v-else
        :model-value="renderModules"
        class="base-container"
        item-key="name"
        handle=".module-drag-handle"
        :animation="dragAnimation"
        :disabled="!canReorderModules"
        ghost-class="module-drag-ghost"
        chosen-class="module-drag-chosen"
        drag-class="module-dragging"
        :aria-busy="isModuleOrderUpdating"
        @start="startDragging"
        @end="stopDragging"
        @update:model-value="reorderModules"
      >
        <template #item="{ element: item }">
          <ModuleCard
            :item="item"
            :disabled="isModuleOrderUpdating"
          >
            <template #drag-handle>
              <button
                v-if="showModuleDragHandle"
                type="button"
                class="module-drag-handle btn btn-circle btn-ghost btn-xs -ml-2 shrink-0"
                :class="
                  canReorderModules
                    ? 'cursor-grab active:cursor-grabbing'
                    : 'cursor-not-allowed opacity-35'
                "
                :aria-disabled="!canReorderModules"
                :aria-label="$t('reorderModule', { name: item.name })"
                :title="moduleDragTitle(item.name)"
                @click.prevent
                @keydown="reorderModuleWithKeyboard($event, item.name)"
              >
                <Bars3Icon class="h-4 w-4" />
              </button>
            </template>
          </ModuleCard>
        </template>
      </Draggable>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  fetchModules,
  isModuleOrderUpdating,
  isModulesLoading,
  moduleOrderSupported,
  modules,
  modulesFilter,
  renderModules,
  setModuleOrder,
} from '@/assembly/modules'
import CtrlsBar from '@/components/common/CtrlsBar.vue'
import TextInput from '@/components/common/TextInput.vue'
import ModuleCard from '@/components/modules/ModuleCard.vue'
import { usePaddingForViews } from '@/composables/paddingViews'
import { disableSwipe } from '@/composables/swipe'
import type { Module } from '@/types'
import { ArrowPathIcon, Bars3Icon } from '@heroicons/vue/24/outline'
import { useMediaQuery } from '@vueuse/core'
import { computed, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Draggable from 'vuedraggable'

const { padding } = usePaddingForViews({
  offsetTop: 12,
  offsetBottom: 8,
})

const { t } = useI18n()
const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
const dragAnimation = computed(() => (reducedMotion.value ? 0 : 180))
const showModuleDragHandle = computed(() => moduleOrderSupported.value && modules.value.length > 1)
const canReorderModules = computed(
  () =>
    showModuleDragHandle.value &&
    !modulesFilter.value.trim() &&
    !isModulesLoading.value &&
    !isModuleOrderUpdating.value,
)
const moduleDragTitle = (name: string) => {
  if (isModuleOrderUpdating.value) return t('savingModuleOrder')
  if (modulesFilter.value.trim()) return t('clearModuleFilterToReorder')
  return t('reorderModule', { name })
}

const refreshModules = () => {
  if (!isModulesLoading.value && !isModuleOrderUpdating.value) void fetchModules()
}

const persistModuleOrder = (order: string[]) => {
  void setModuleOrder(order).catch(() => undefined)
}

const reorderModules = (reorderedModules: Module[]) => {
  persistModuleOrder(reorderedModules.map((module) => module.name))
}

const reorderModuleWithKeyboard = (event: KeyboardEvent, name: string) => {
  if (!canReorderModules.value || !['ArrowUp', 'ArrowDown'].includes(event.key)) return

  event.preventDefault()
  const from = modules.value.findIndex((module) => module.name === name)
  const to = from + (event.key === 'ArrowUp' ? -1 : 1)
  if (from < 0 || to < 0 || to >= modules.value.length) return

  const order = modules.value.map((module) => module.name)
  const movedModule = order[from]
  order[from] = order[to]
  order[to] = movedModule
  persistModuleOrder(order)
}

const startDragging = () => {
  disableSwipe.value = true
}

const stopDragging = () => {
  disableSwipe.value = false
}

onUnmounted(stopDragging)
</script>

<style scoped>
.module-drag-handle {
  touch-action: none;
}

:deep(.module-drag-ghost) {
  opacity: 0.35;
}

:deep(.module-drag-chosen) {
  background: color-mix(in srgb, var(--color-base-content) 6%, var(--color-base-100));
}

:deep(.module-dragging) {
  cursor: grabbing;
  will-change: transform;
}

@media (prefers-reduced-motion: reduce) {
  :deep(.module-drag-chosen),
  :deep(.module-dragging) {
    transition: none;
  }
}
</style>

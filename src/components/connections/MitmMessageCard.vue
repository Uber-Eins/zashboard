<template>
  <div class="border-base-content/8 bg-base-200/40 rounded-lg border p-3">
    <div class="text-primary mb-2 text-sm font-semibold">{{ title }}</div>

    <div
      v-if="summary"
      class="bg-base-300/30 mb-3 rounded-md px-2 py-1.5 font-mono text-xs break-all"
    >
      {{ summary }}
    </div>

    <div
      v-if="headerEntries.length"
      class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm"
    >
      <template
        v-for="[name, values] in headerEntries"
        :key="name"
      >
        <div class="text-base-content/60 break-all">{{ name }}</div>
        <div class="min-w-0 break-all">
          <div
            v-for="(value, index) in values"
            :key="index"
          >
            {{ value }}
          </div>
        </div>
      </template>
    </div>

    <div
      v-if="error"
      class="text-error mt-3 text-sm break-all"
    >
      {{ error }}
    </div>

    <div class="border-base-content/8 mt-3 border-t pt-2">
      <button
        type="button"
        class="flex w-full items-center gap-2 text-left text-sm font-medium"
        :class="body ? 'cursor-pointer' : 'cursor-default'"
        :disabled="!body"
        :aria-expanded="body ? bodyExpanded : undefined"
        @click="bodyExpanded = !bodyExpanded"
      >
        <span>{{ $t('body') }}</span>
        <span
          v-if="bodyMetadata"
          class="text-base-content/50 text-xs font-normal"
        >
          {{ bodyMetadata }}
        </span>
        <ChevronDownIcon
          v-if="body"
          class="text-base-content/50 ml-auto h-4 w-4 transition-transform"
          :class="bodyExpanded && 'rotate-180'"
        />
      </button>

      <div
        v-if="!body"
        class="text-base-content/50 mt-1 text-xs"
      >
        {{ $t('enableCaptureToGetContent') }}
      </div>
      <pre
        v-else-if="bodyExpanded"
        class="bg-base-300/35 mt-2 max-h-96 overflow-auto rounded-md p-3 font-mono text-xs break-all whitespace-pre-wrap"
        >{{ body.content }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MitmBody, MitmHeaders } from '@/assembly/connections'
import { prettyBytesHelper } from '@/helper/utils'
import { ChevronDownIcon } from '@heroicons/vue/24/outline'
import { computed, ref } from 'vue'

const props = defineProps<{
  title: string
  summary?: string
  headers?: MitmHeaders
  body?: MitmBody
  error?: string
}>()

const bodyExpanded = ref(false)
const headerEntries = computed(() => Object.entries(props.headers ?? {}))
const bodyMetadata = computed(() => {
  if (!props.body) return ''

  return [prettyBytesHelper(props.body.size), props.body.encoding].filter(Boolean).join(' · ')
})
</script>

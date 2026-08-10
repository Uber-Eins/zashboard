<template>
  <SettingItem
    :setting-key="settingKey"
    :when="available"
  >
    <div class="setting-item-label">
      {{ $t('mitmCapture') }}
      <QuestionMarkCircleIcon
        class="h-4 w-4 cursor-pointer"
        @mouseenter="showTip($event, $t('mitmCaptureTip'))"
      />
    </div>
    <input
      v-model="capture"
      class="toggle"
      type="checkbox"
      :disabled="updating"
      @change="handleCaptureChange"
    />
  </SettingItem>
</template>

<script setup lang="ts">
import { can } from '@/assembly/backend'
import { fetchMitmCaptureAPI, updateMitmCaptureAPI } from '@/assembly/connections'
import SettingItem from '@/components/settings/SettingItem.vue'
import { useTooltip } from '@/helper/tooltip'
import { activeBackend } from '@/store/setup'
import { QuestionMarkCircleIcon } from '@heroicons/vue/24/outline'
import { computed, ref, watch } from 'vue'

defineProps<{ settingKey: string }>()

const { showTip } = useTooltip()
const supported = computed(() => can('mitm'))
const available = ref(false)
const capture = ref(false)
const updating = ref(false)
let generation = 0

watch(
  [supported, () => activeBackend.value?.uuid],
  async ([isSupported]) => {
    const currentGeneration = ++generation
    available.value = false
    updating.value = false

    if (!isSupported) return

    const state = await fetchMitmCaptureAPI()
    if (currentGeneration !== generation || state === null) return

    capture.value = state
    available.value = true
  },
  { immediate: true },
)

const handleCaptureChange = async () => {
  const nextCapture = capture.value
  const currentGeneration = generation
  updating.value = true

  try {
    await updateMitmCaptureAPI(nextCapture)
  } catch {
    if (currentGeneration === generation) {
      capture.value = !nextCapture
    }
  } finally {
    if (currentGeneration === generation) {
      updating.value = false
    }
  }
}
</script>

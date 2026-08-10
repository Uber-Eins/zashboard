<template>
  <DialogWrapper
    v-model="modalValue"
    :title="$t('viewConfigs')"
    box-class="w-11/12 max-w-5xl max-md:w-full max-md:max-w-none"
    no-padding
  >
    <div
      v-if="isLoading"
      class="flex min-h-64 items-center justify-center"
    >
      <span class="loading loading-spinner loading-md" />
    </div>
    <template v-else>
      <Suspense>
        <YamlCodeViewer
          :code="configContent"
          :label="$t('viewConfigs')"
        />
        <template #fallback>
          <div class="flex min-h-64 items-center justify-center">
            <span class="loading loading-spinner loading-md" />
          </div>
        </template>
      </Suspense>
    </template>
  </DialogWrapper>
</template>

<script setup lang="ts">
import { fetchModuleConfigAPI } from '@/assembly/config'
import DialogWrapper from '@/components/common/DialogWrapper.vue'
import { defineAsyncComponent, ref, watch } from 'vue'

const YamlCodeViewer = defineAsyncComponent(() => import('@/components/common/YamlCodeViewer.vue'))

const modalValue = defineModel<boolean>()
const configContent = ref('')
const isLoading = ref(false)
let requestSequence = 0

const loadConfig = async () => {
  const sequence = ++requestSequence
  isLoading.value = true
  configContent.value = ''

  try {
    const { data } = await fetchModuleConfigAPI()
    if (sequence !== requestSequence || !modalValue.value) return
    configContent.value = data
  } catch {
    if (sequence === requestSequence) modalValue.value = false
  } finally {
    if (sequence === requestSequence) isLoading.value = false
  }
}

watch(modalValue, (isOpen) => {
  if (isOpen) {
    void loadConfig()
  } else {
    requestSequence++
  }
})
</script>

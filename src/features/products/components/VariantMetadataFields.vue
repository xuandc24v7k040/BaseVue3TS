<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { ChevronDown, Plus, Trash2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Command, CommandItem, CommandList } from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  VARIANT_METADATA_REGISTRY,
  type VariantMetadataDraft,
  type VariantMetadataKey,
} from '../utils/variant-metadata'

const props = defineProps<{
  idPrefix: string
  selected: VariantMetadataKey[]
  draft: VariantMetadataDraft
}>()
const emit = defineEmits<{
  'update:selected': [VariantMetadataKey[]]
  'update:value': [VariantMetadataKey, string]
}>()
const open = ref(false)
const available = computed(() => VARIANT_METADATA_REGISTRY.filter((item) => !props.selected.includes(item.key)))
const visible = computed(() => VARIANT_METADATA_REGISTRY.filter((item) => props.selected.includes(item.key)))

async function add(key: VariantMetadataKey): Promise<void> {
  emit('update:selected', [...props.selected, key])
  open.value = false
  await nextTick()
  document.getElementById(`${props.idPrefix}-${key}`)?.focus()
}

function remove(key: VariantMetadataKey): void {
  emit('update:value', key, '')
  emit('update:selected', props.selected.filter((item) => item !== key))
}
</script>

<template>
  <div class="space-y-3 rounded-lg border border-dashed p-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div><h4 class="text-sm font-medium">Thông tin bổ sung</h4><p class="text-xs text-muted-foreground">Xóa trường sẽ xóa giá trị khi lưu.</p></div>
      <Popover v-model:open="open">
        <PopoverTrigger as-child><Button type="button" size="sm" variant="outline" :aria-expanded="open"><Plus class="mr-2 h-4 w-4" />Thêm trường<ChevronDown class="ml-2 h-4 w-4" /></Button></PopoverTrigger>
        <PopoverContent class="z-50 w-[min(92vw,22rem)] p-0" align="end">
          <Command><CommandList>
            <CommandItem v-for="item in available" :key="item.key" @click="add(item.key)">{{ item.label }}</CommandItem>
            <p v-if="available.length === 0" class="p-3 text-sm text-muted-foreground">Đã thêm tất cả trường có thể dùng.</p>
          </CommandList></Command>
        </PopoverContent>
      </Popover>
    </div>
    <div v-if="visible.length" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="item in visible" :key="item.key" class="min-w-0 space-y-1.5">
        <div class="flex items-center justify-between gap-2"><Label :for="`${idPrefix}-${item.key}`">{{ item.label }}</Label><Button type="button" size="icon-sm" variant="ghost" :aria-label="`Xóa trường ${item.label}`" @click="remove(item.key)"><Trash2 class="h-4 w-4" /></Button></div>
        <Input :id="`${idPrefix}-${item.key}`" :model-value="draft[item.key]" :type="item.inputType" :min="item.min" :max="item.max" :placeholder="item.placeholder" @update:model-value="emit('update:value', item.key, String($event))" />
      </div>
    </div>
  </div>
</template>

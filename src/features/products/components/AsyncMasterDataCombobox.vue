<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { refDebounced } from '@vueuse/core'
import { useQuery } from '@tanstack/vue-query'
import { Check, ChevronsUpDown, LoaderCircle, RotateCcw, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Command, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { listPublishers } from '@/features/publishers/api/publisher-api'
import { listSuppliers } from '@/features/suppliers/api/supplier-api'

type MasterDataOption = { id: string; name: string }

const props = defineProps<{
  id: string
  modelValue: string
  kind: 'supplier' | 'publisher'
  label: string
  selectedLabel?: string
  nullable?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const open = ref(false)
const search = ref('')
const debouncedSearch = refDebounced(search, 350)
const activeIndex = ref(0)
const cachedSelected = ref<MasterDataOption | null>(null)

const query = useQuery({
  queryKey: computed(() => ['products', 'async-selector', props.kind, debouncedSearch.value.trim()]),
  queryFn: async ({ signal }) => {
    const params = {
      page: 1,
      limit: 20,
      sortBy: 'name' as const,
      sortOrder: 'asc' as const,
      ...(debouncedSearch.value.trim() ? { search: debouncedSearch.value.trim() } : {}),
    }
    return props.kind === 'supplier'
      ? listSuppliers(params, undefined, signal)
      : listPublishers(params, undefined, signal)
  },
  staleTime: 60_000,
})

const options = computed<MasterDataOption[]>(() => query.data.value?.data ?? [])
const selected = computed(() => {
  if (!props.modelValue) return null
  return options.value.find((item) => item.id === props.modelValue)
    ?? cachedSelected.value
    ?? (props.selectedLabel ? { id: props.modelValue, name: props.selectedLabel } : null)
})

watch([options, () => props.modelValue, () => props.selectedLabel], () => {
  if (!props.modelValue) {
    cachedSelected.value = null
    return
  }
  const current = options.value.find((item) => item.id === props.modelValue)
  if (current) cachedSelected.value = current
  else if (props.selectedLabel) cachedSelected.value = { id: props.modelValue, name: props.selectedLabel }
}, { immediate: true })

watch(options, () => { activeIndex.value = 0 })
watch(open, (value) => { if (!value) search.value = '' })

function select(option: MasterDataOption): void {
  cachedSelected.value = option
  emit('update:modelValue', option.id)
  open.value = false
}

function clear(): void {
  cachedSelected.value = null
  emit('update:modelValue', '')
  open.value = false
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    activeIndex.value = Math.min(activeIndex.value + 1, options.value.length - 1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    activeIndex.value = Math.max(activeIndex.value - 1, 0)
  } else if (event.key === 'Enter' && options.value[activeIndex.value]) {
    event.preventDefault()
    select(options.value[activeIndex.value]!)
  } else if (event.key === 'Escape') {
    open.value = false
  }
}
</script>

<template>
  <div class="min-w-0 space-y-2">
    <Label :for="id">{{ label }}</Label>
    <Popover v-model:open="open">
      <PopoverTrigger as-child>
        <Button
          :id="id"
          type="button"
          variant="outline"
          role="combobox"
          :aria-label="label"
          :aria-expanded="open"
          :disabled="disabled"
          class="w-full min-w-0 justify-between font-normal"
        >
          <span class="truncate">{{ selected?.name ?? 'Chưa chọn' }}</span>
          <ChevronsUpDown class="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        class="z-[70] w-[var(--reka-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-0"
      >
        <Command>
          <CommandInput
            v-model="search"
            :placeholder="`Tìm ${label.toLocaleLowerCase('vi')}...`"
            :aria-label="`Tìm ${label.toLocaleLowerCase('vi')}`"
            @keydown="handleKeydown"
          />
          <CommandList>
            <div v-if="query.isPending.value" class="flex items-center justify-center gap-2 px-2 py-6 text-sm text-muted-foreground">
              <LoaderCircle class="size-4 animate-spin" /> Đang tải...
            </div>
            <div v-else-if="query.isError.value" class="space-y-3 px-2 py-5 text-center text-sm text-destructive">
              <p>Không thể tải dữ liệu.</p>
              <Button type="button" size="sm" variant="outline" @click="query.refetch()">
                <RotateCcw class="mr-2 size-4" /> Thử lại
              </Button>
            </div>
            <template v-else>
              <CommandItem
                v-if="nullable && modelValue"
                class="text-muted-foreground"
                @click="clear"
              >
                <X class="size-4" /> Bỏ lựa chọn
              </CommandItem>
              <CommandItem
                v-for="(option, index) in options"
                :key="option.id"
                :selected="option.id === modelValue"
                :active="index === activeIndex"
                @mouseenter="activeIndex = index"
                @click="select(option)"
              >
                <Check class="size-4 shrink-0" :class="option.id === modelValue ? 'opacity-100' : 'opacity-0'" />
                <span class="truncate">{{ option.name }}</span>
              </CommandItem>
              <p v-if="options.length === 0" class="px-2 py-6 text-center text-sm text-muted-foreground">
                Không tìm thấy dữ liệu phù hợp.
              </p>
            </template>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  </div>
</template>
